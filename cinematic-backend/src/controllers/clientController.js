const { Op } = require("sequelize");
const Client = require("../models/Client");

// GET /api/clients (Admin)
exports.getAllClients = async (req, res) => {
    try {
        const { search } = req.query;
        const where = {};

        if (search) {
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } },
                { phone: { [Op.like]: `%${search}%` } },
            ];
        }

        const clients = await Client.findAll({ where, order: [["createdAt", "DESC"]] });
        res.json({ success: true, count: clients.length, data: clients });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/clients/:id (Admin)
exports.getClient = async (req, res) => {
    try {
        const client = await Client.findByPk(req.params.id);
        if (!client) {
            return res.status(404).json({ success: false, message: "Client not found." });
        }
        res.json({ success: true, data: client });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/clients (Admin)
exports.createClient = async (req, res) => {
    try {
        const { name, email, phone, projectCount, totalSpent, status } = req.body;

        if (!name || !email) {
            return res.status(400).json({ success: false, message: "Name and email are required." });
        }

        const client = await Client.create({ name, email, phone, projectCount, totalSpent, status });
        res.status(201).json({ success: true, data: client });
    } catch (error) {
        if (error.name === "SequelizeUniqueConstraintError") {
            return res.status(409).json({ success: false, message: "A client with this email already exists." });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

// PUT /api/clients/:id (Admin)
exports.updateClient = async (req, res) => {
    try {
        const client = await Client.findByPk(req.params.id);
        if (!client) {
            return res.status(404).json({ success: false, message: "Client not found." });
        }

        const { name, email, phone, projectCount, totalSpent, status } = req.body;
        await client.update({ name, email, phone, projectCount, totalSpent, status });
        res.json({ success: true, data: client });
    } catch (error) {
        if (error.name === "SequelizeUniqueConstraintError") {
            return res.status(409).json({ success: false, message: "A client with this email already exists." });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE /api/clients/:id (Admin)
exports.deleteClient = async (req, res) => {
    try {
        const client = await Client.findByPk(req.params.id);
        if (!client) {
            return res.status(404).json({ success: false, message: "Client not found." });
        }
        await client.destroy();
        res.json({ success: true, message: "Client deleted." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
