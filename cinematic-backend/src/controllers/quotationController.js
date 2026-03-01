const Quotation = require("../models/Quotation");

// POST /api/quotations (Public – from website consultation form)
exports.createQuotation = async (req, res) => {
    try {
        const {
            name, email, phone, city, eventType, eventDate,
            venue, guestCount, functions, servicesRequested,
            budget, requirements
        } = req.body;

        // Validation
        if (!name || !email || !eventType) {
            return res.status(400).json({
                success: false,
                message: "Name, email, and event type are required.",
            });
        }

        const quotation = await Quotation.create({
            name,
            email,
            phone: phone || null,
            city: city || null,
            eventType,
            eventDate: eventDate || null,
            venue: venue || null,
            guestCount: guestCount || null,
            functions: functions || null,
            servicesRequested: servicesRequested || [],
            budget: budget || null,
            requirements: requirements || null,
            status: "New",
        });

        // Return response matching exact format
        res.status(201).json({
            success: true,
            message: "Quotation request successfully submitted.",
            data: {
                id: quotation.id,
                name: quotation.name,
                email: quotation.email,
                phone: quotation.phone,
                city: quotation.city,
                eventType: quotation.eventType,
                eventDate: quotation.eventDate,
                venue: quotation.venue,
                guestCount: quotation.guestCount,
                functions: quotation.functions,
                servicesRequested: quotation.servicesRequested,
                budget: quotation.budget,
                requirements: quotation.requirements,
                status: quotation.status,
                createdAt: quotation.createdAt,
                updatedAt: quotation.updatedAt,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/quotations (Admin)
exports.getAllQuotations = async (req, res) => {
    try {
        const { status } = req.query;
        const where = {};
        if (status && status !== "All") {
            where.status = status;
        }

        const quotations = await Quotation.findAll({ where, order: [["createdAt", "DESC"]] });
        res.json({ success: true, count: quotations.length, data: quotations });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/quotations/:id (Admin)
exports.getQuotation = async (req, res) => {
    try {
        const quotation = await Quotation.findByPk(req.params.id);
        if (!quotation) {
            return res.status(404).json({ success: false, message: "Quotation not found." });
        }
        res.json({ success: true, data: quotation });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// PATCH /api/quotations/:id/status (Admin)
exports.updateStatus = async (req, res) => {
    try {
        const quotation = await Quotation.findByPk(req.params.id);
        if (!quotation) {
            return res.status(404).json({ success: false, message: "Quotation not found." });
        }

        const validStatuses = ["New", "Contacted", "Booked", "Closed"];
        const { status } = req.body;
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
        }

        quotation.status = status;
        await quotation.save();

        res.json({ success: true, message: "Status updated.", data: quotation });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE /api/quotations/:id (Admin)
exports.deleteQuotation = async (req, res) => {
    try {
        const quotation = await Quotation.findByPk(req.params.id);
        if (!quotation) {
            return res.status(404).json({ success: false, message: "Quotation not found." });
        }

        await quotation.destroy();
        res.json({ success: true, message: "Quotation deleted." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
