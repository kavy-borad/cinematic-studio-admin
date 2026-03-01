const ApiLog = require("../models/ApiLog");
const { Op } = require("sequelize");

/**
 * GET /api/logs
 * Returns paginated logs with optional filters
 * Query params: page, limit, type (all|request|response|error|system), method, status, search
 */
const getLogs = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            type = "all",
            method,
            status,
            search,
        } = req.query;

        const where = {};

        // Filter by log type
        if (type && type !== "all") {
            where.logType = type;
        }

        // Filter by HTTP method
        if (method && method !== "all") {
            where.method = method.toUpperCase();
        }

        // Filter by status code range
        if (status) {
            if (status === "2xx") where.statusCode = { [Op.between]: [200, 299] };
            else if (status === "3xx") where.statusCode = { [Op.between]: [300, 399] };
            else if (status === "4xx") where.statusCode = { [Op.between]: [400, 499] };
            else if (status === "5xx") where.statusCode = { [Op.between]: [500, 599] };
            else where.statusCode = parseInt(status);
        }

        // Search in URL
        if (search) {
            where.url = { [Op.like]: `%${search}%` };
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { count, rows } = await ApiLog.findAndCountAll({
            where,
            order: [["createdAt", "DESC"]],
            limit: parseInt(limit),
            offset,
        });

        res.json({
            success: true,
            data: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error("[getLogs]", error);
        res.status(500).json({ success: false, message: "Failed to fetch logs", error: error.message });
    }
};

/**
 * GET /api/logs/stats
 * Returns summary stats for the log viewer header
 */
const getLogStats = async (req, res) => {
    try {
        const total = await ApiLog.count();
        const errors = await ApiLog.count({ where: { isError: true } });
        const requests = await ApiLog.count({ where: { logType: "request" } });
        const responses = await ApiLog.count({ where: { logType: "response" } });

        // Average response time
        const [avgResult] = await ApiLog.sequelize.query(
            `SELECT AVG(duration) as avgDuration FROM api_logs WHERE duration IS NOT NULL`
        );
        const avgDuration = Math.round(avgResult[0]?.avgDuration || 0);

        // Blocked = 401 + 403
        const blocked = await ApiLog.count({
            where: { statusCode: { [Op.in]: [401, 403] } },
        });

        res.json({
            success: true,
            data: {
                total,
                requests,
                responses,
                errors,
                blocked,
                avgResponseMs: avgDuration,
            },
        });
    } catch (error) {
        console.error("[getLogStats]", error);
        res.status(500).json({ success: false, message: "Failed to fetch log stats", error: error.message });
    }
};

/**
 * DELETE /api/logs
 * Clears all logs (admin only)
 */
const clearLogs = async (req, res) => {
    try {
        const deleted = await ApiLog.destroy({ where: {}, truncate: true });
        res.json({ success: true, message: "All logs cleared successfully", deleted });
    } catch (error) {
        console.error("[clearLogs]", error);
        res.status(500).json({ success: false, message: "Failed to clear logs", error: error.message });
    }
};

/**
 * GET /api/logs/:id
 * Returns a single log entry with full req/res JSON
 */
const getLogById = async (req, res) => {
    try {
        const log = await ApiLog.findByPk(req.params.id);
        if (!log) {
            return res.status(404).json({ success: false, message: "Log not found" });
        }
        res.json({ success: true, data: log });
    } catch (error) {
        console.error("[getLogById]", error);
        res.status(500).json({ success: false, message: "Failed to fetch log", error: error.message });
    }
};

module.exports = { getLogs, getLogStats, clearLogs, getLogById };
