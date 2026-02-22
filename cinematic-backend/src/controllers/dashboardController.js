const { Op, fn, col, literal } = require("sequelize");
const Quotation = require("../models/Quotation");
const Client = require("../models/Client");

// GET /api/dashboard/stats
exports.getStats = async (req, res) => {
    try {
        const totalInquiries = await Quotation.count();
        const activeProjects = await Quotation.count({ where: { status: "Booked" } });
        const completedProjects = await Quotation.count({ where: { status: "Closed" } });
        const totalClients = await Client.count();

        // Sum totalSpent from clients table for revenue
        const revenueResult = await Client.sum("totalSpent");
        const totalRevenue = revenueResult || 0;

        // Recent 5 quotations
        const recentQuotations = await Quotation.findAll({
            order: [["createdAt", "DESC"]],
            limit: 5,
        });

        res.json({
            success: true,
            data: {
                totalInquiries,
                activeProjects,
                completedProjects,
                totalClients,
                totalRevenue,
                recentQuotations,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/dashboard/revenue-chart
exports.getRevenueChart = async (req, res) => {
    try {
        // Get monthly booked/closed quotation counts grouped by month
        const data = await Quotation.findAll({
            attributes: [
                [fn("DATE_FORMAT", col("createdAt"), "%Y-%m"), "month"],
                [fn("COUNT", col("id")), "count"],
            ],
            where: {
                status: { [Op.in]: ["Booked", "Closed"] },
            },
            group: [literal("DATE_FORMAT(`createdAt`, '%Y-%m')")],
            order: [[literal("month"), "ASC"]],
            raw: true,
        });

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/dashboard/analytics
exports.getAnalytics = async (req, res) => {
    try {
        const Service = require("../models/Service");
        const Portfolio = require("../models/Portfolio");
        const Testimonial = require("../models/Testimonial");

        // Inquiry trend (monthly new quotations)
        const inquiryData = await Quotation.findAll({
            attributes: [
                [fn("DATE_FORMAT", col("createdAt"), "%Y-%m"), "month"],
                [fn("COUNT", col("id")), "count"],
            ],
            group: [literal("DATE_FORMAT(`createdAt`, '%Y-%m')")],
            order: [[literal("month"), "ASC"]],
            raw: true,
        });

        // Conversion: booked+closed vs total per month
        const bookedData = await Quotation.findAll({
            attributes: [
                [fn("DATE_FORMAT", col("createdAt"), "%Y-%m"), "month"],
                [fn("COUNT", col("id")), "count"],
            ],
            where: { status: { [Op.in]: ["Booked", "Closed"] } },
            group: [literal("DATE_FORMAT(`createdAt`, '%Y-%m')")],
            order: [[literal("month"), "ASC"]],
            raw: true,
        });

        // Service breakdown by event type
        const serviceBreakdown = await Quotation.findAll({
            attributes: [
                [col("eventType"), "name"],
                [fn("COUNT", col("id")), "count"],
            ],
            group: ["eventType"],
            order: [[literal("count"), "DESC"]],
            raw: true,
        });

        // Overall stats
        const totalPortfolios = await Portfolio.count();
        const totalServices = await Service.count();
        const totalTestimonials = await Testimonial.count({ where: { approved: true } });

        res.json({
            success: true,
            data: {
                inquiryData,
                bookedData,
                serviceBreakdown,
                totalPortfolios,
                totalServices,
                totalTestimonials,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
