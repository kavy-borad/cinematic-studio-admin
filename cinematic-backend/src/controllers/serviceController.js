const Service = require("../models/Service");

// GET /api/services (Public)
exports.getAllServices = async (req, res) => {
    try {
        const services = await Service.findAll({ order: [["createdAt", "DESC"]] });
        // Convert DECIMAL price string -> number for all services
        const data = services.map((s) => {
            const obj = s.toJSON();
            obj.price = parseFloat(obj.price);
            return obj;
        });
        res.json({ success: true, count: data.length, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/services/:id (Public)
exports.getService = async (req, res) => {
    try {
        const service = await Service.findByPk(req.params.id);
        if (!service) {
            return res.status(404).json({ success: false, message: "Service not found." });
        }
        // Convert price to number if it comes as string from DECIMAL
        const data = service.toJSON();
        data.price = parseFloat(data.price);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/services (Admin)
exports.createService = async (req, res) => {
    try {
        const { name, description, icon, price, duration, popular, features, packageName } = req.body;

        if (!name || price === undefined) {
            return res.status(400).json({ success: false, message: "Name and price are required." });
        }

        const service = await Service.create({ name, description, icon, price, duration, popular, features, packageName });
        res.status(201).json({ success: true, data: service });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// PUT /api/services/:id (Admin)
exports.updateService = async (req, res) => {
    try {
        const service = await Service.findByPk(req.params.id);
        if (!service) {
            return res.status(404).json({ success: false, message: "Service not found." });
        }

        const { name, description, icon, price, duration, popular, features, packageName } = req.body;
        await service.update({ name, description, icon, price, duration, popular, features, packageName });
        res.json({ success: true, data: service });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE /api/services/:id (Admin)
exports.deleteService = async (req, res) => {
    try {
        const service = await Service.findByPk(req.params.id);
        if (!service) {
            return res.status(404).json({ success: false, message: "Service not found." });
        }
        await service.destroy();
        res.json({ success: true, message: "Service deleted." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
