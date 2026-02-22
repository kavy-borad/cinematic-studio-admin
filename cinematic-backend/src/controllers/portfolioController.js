const Portfolio = require("../models/Portfolio");
const fs = require("fs");
const path = require("path");

// Helper: delete uploaded files from disk
function deleteFiles(filePaths) {
    filePaths.forEach((filePath) => {
        const fullPath = path.join(__dirname, "../../", filePath);
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
        }
    });
}

// GET /api/portfolio (Public)
exports.getAllPortfolios = async (req, res) => {
    try {
        const { category, featured } = req.query;
        const where = {};
        if (category && category !== "All") where.category = category;
        if (featured === "true") where.featured = true;

        const portfolios = await Portfolio.findAll({ where, order: [["createdAt", "DESC"]] });
        res.json({ success: true, count: portfolios.length, data: portfolios });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/portfolio/:id (Public)
exports.getPortfolio = async (req, res) => {
    try {
        const portfolio = await Portfolio.findByPk(req.params.id);
        if (!portfolio) {
            return res.status(404).json({ success: false, message: "Portfolio not found." });
        }
        res.json({ success: true, data: portfolio });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/portfolio (Admin – FormData with images)
exports.createPortfolio = async (req, res) => {
    try {
        const { title, category, clientName, eventDate, featured, description, videoUrl } = req.body;

        let coverImage = "";
        const images = [];

        if (req.files && req.files.length > 0) {
            coverImage = `/uploads/${req.files[0].filename}`;
            req.files.forEach((file) => {
                images.push(`/uploads/${file.filename}`);
            });
        }

        const portfolio = await Portfolio.create({
            title,
            category,
            coverImage,
            images,
            clientName,
            eventDate,
            description: description || null,
            videoUrl: videoUrl || null,
            featured: featured === "true" || featured === true,
            photoCount: images.length,
        });

        res.status(201).json({ success: true, data: portfolio });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// PATCH /api/portfolio/:id (Admin)
exports.updatePortfolio = async (req, res) => {
    try {
        const portfolio = await Portfolio.findByPk(req.params.id);
        if (!portfolio) {
            return res.status(404).json({ success: false, message: "Portfolio not found." });
        }

        const { title, category, clientName, eventDate, featured, description, videoUrl } = req.body;
        if (title !== undefined) portfolio.title = title;
        if (category !== undefined) portfolio.category = category;
        if (clientName !== undefined) portfolio.clientName = clientName;
        if (eventDate !== undefined) portfolio.eventDate = eventDate;
        if (description !== undefined) portfolio.description = description;
        if (videoUrl !== undefined) portfolio.videoUrl = videoUrl;
        if (featured !== undefined) portfolio.featured = featured === "true" || featured === true;

        // If new images uploaded, add them
        if (req.files && req.files.length > 0) {
            const newImages = req.files.map((f) => `/uploads/${f.filename}`);
            const existingImages = portfolio.images || [];
            const updatedImages = [...existingImages, ...newImages];
            portfolio.set("images", updatedImages);
            portfolio.photoCount = updatedImages.length;
            portfolio.changed("images", true);
            if (!portfolio.coverImage) portfolio.coverImage = newImages[0];
        }

        await portfolio.save();
        res.json({ success: true, data: portfolio });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE /api/portfolio/:id/image (Admin – remove a single image)
exports.removeImage = async (req, res) => {
    try {
        const portfolio = await Portfolio.findByPk(req.params.id);
        if (!portfolio) {
            return res.status(404).json({ success: false, message: "Portfolio not found." });
        }

        const { imageUrl } = req.body;
        if (!imageUrl) {
            return res.status(400).json({ success: false, message: "imageUrl is required." });
        }

        const existingImages = portfolio.images || [];
        const updatedImages = existingImages.filter((img) => img !== imageUrl);
        portfolio.set("images", updatedImages);
        portfolio.changed("images", true);
        portfolio.photoCount = updatedImages.length;

        // Update cover image if removed
        if (portfolio.coverImage === imageUrl) {
            portfolio.coverImage = updatedImages.length > 0 ? updatedImages[0] : null;
        }

        await portfolio.save();
        deleteFiles([imageUrl]);

        res.json({ success: true, data: portfolio });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE /api/portfolio/:id (Admin)
exports.deletePortfolio = async (req, res) => {
    try {
        const portfolio = await Portfolio.findByPk(req.params.id);
        if (!portfolio) {
            return res.status(404).json({ success: false, message: "Portfolio not found." });
        }

        // Clean up uploaded files from disk
        const filesToDelete = [...(portfolio.images || [])];
        if (portfolio.coverImage && !filesToDelete.includes(portfolio.coverImage)) {
            filesToDelete.push(portfolio.coverImage);
        }
        deleteFiles(filesToDelete);

        await portfolio.destroy();
        res.json({ success: true, message: "Portfolio deleted." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
