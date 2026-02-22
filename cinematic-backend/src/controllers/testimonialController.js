const Testimonial = require("../models/Testimonial");

// GET /api/testimonials (Public – only approved)
exports.getApproved = async (req, res) => {
    try {
        const testimonials = await Testimonial.findAll({
            where: { approved: true },
            order: [["createdAt", "DESC"]],
        });
        res.json({ success: true, count: testimonials.length, data: testimonials });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/testimonials (Public – submit a testimonial for review)
exports.createTestimonial = async (req, res) => {
    try {
        const { name, event, rating, text } = req.body;

        if (!name || !text) {
            return res.status(400).json({ success: false, message: "Name and text are required." });
        }

        const testimonial = await Testimonial.create({
            name,
            event: event || null,
            rating: rating || 5,
            text,
            approved: false,
        });
        res.status(201).json({ success: true, message: "Testimonial submitted for review.", data: testimonial });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/testimonials/all (Admin – all including pending)
exports.getAll = async (req, res) => {
    try {
        const testimonials = await Testimonial.findAll({ order: [["createdAt", "DESC"]] });
        res.json({ success: true, count: testimonials.length, data: testimonials });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// PATCH /api/testimonials/:id/approve (Admin)
exports.approve = async (req, res) => {
    try {
        const testimonial = await Testimonial.findByPk(req.params.id);
        if (!testimonial) {
            return res.status(404).json({ success: false, message: "Testimonial not found." });
        }
        testimonial.approved = true;
        await testimonial.save();
        res.json({ success: true, message: "Testimonial approved.", data: testimonial });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// PATCH /api/testimonials/:id/reject (Admin)
exports.reject = async (req, res) => {
    try {
        const testimonial = await Testimonial.findByPk(req.params.id);
        if (!testimonial) {
            return res.status(404).json({ success: false, message: "Testimonial not found." });
        }
        testimonial.approved = false;
        await testimonial.save();
        res.json({ success: true, message: "Testimonial rejected.", data: testimonial });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE /api/testimonials/:id (Admin)
exports.deleteTestimonial = async (req, res) => {
    try {
        const testimonial = await Testimonial.findByPk(req.params.id);
        if (!testimonial) {
            return res.status(404).json({ success: false, message: "Testimonial not found." });
        }
        await testimonial.destroy();
        res.json({ success: true, message: "Testimonial deleted." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
