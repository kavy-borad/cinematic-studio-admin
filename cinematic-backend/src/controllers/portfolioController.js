const Portfolio = require("../models/Portfolio");
const { Op } = require("sequelize");
const fs = require("fs");
const path = require("path");

// ─── Helper: delete uploaded files from disk ─────────────────────────────────
function deleteFiles(filePaths) {
    (filePaths || []).forEach((filePath) => {
        if (!filePath) return;
        const fullPath = path.join(__dirname, "../../", filePath);
        if (fs.existsSync(fullPath)) {
            try { fs.unlinkSync(fullPath); } catch (_) { }
        }
    });
}

// ─── Helper: safely parse images field (MySQL JSON can return as string) ──────
function safeParseImages(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") {
        try { return JSON.parse(raw); } catch (_) { return []; }
    }
    return [];
}

// Helper: build URL path for uploaded file
function toUrl(file) {
    return file ? `/uploads/${file.filename}` : null;
}

// ─── GET /api/portfolio (Public + Admin) ─────────────────────────────────────
exports.getAllPortfolios = async (req, res) => {
    try {
        const { category, featured } = req.query;
        const where = {};

        if (category && category !== "All") {
            where.category = { [Op.like]: `%${category}%` };
        }
        if (featured === "true") where.featured = true;

        const portfolios = await Portfolio.findAll({
            where,
            attributes: [
                "id", "title", "slug", "category", "coverImage", "images",
                "clientName", "eventDate", "description", "featured",
                "photoCount", "videoUrl", "createdAt", "updatedAt",
            ],
            order: [["createdAt", "DESC"]],
        });

        // Return both formats in one response — admin reads .data, client reads .data too
        res.json({ success: true, data: portfolios });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// ─── GET /api/portfolio/:id (Public) ─────────────────────────────────────────
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

// ─── GET /api/portfolio/slug/:slug (Public – View Story page) ─────────────────
exports.getPortfolioBySlug = async (req, res) => {
    try {
        const portfolio = await Portfolio.findOne({
            where: { slug: req.params.slug },
            attributes: [
                "id", "title", "slug", "category", "coverImage", "images",
                "clientName", "eventDate", "description", "featured",
                "photoCount", "videoUrl", "createdAt", "updatedAt",
            ],
        });

        if (!portfolio) {
            return res.status(404).json({
                success: false,
                message: `Portfolio with slug "${req.params.slug}" not found.`,
            });
        }

        // Normalize to plain object + ensure images is always an array (not a string)
        const data = portfolio.get({ plain: true });
        data.images = safeParseImages(data.images);

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// ─── POST /api/portfolio (Admin) ─────────────────────────────────────────────
// Content-Type: multipart/form-data
// Fields  : title, slug (optional), category, clientName, eventDate, description, videoUrl, featured
// Files   : coverImage (single), images (multiple)
// NOTE    : uses upload.any() – req.files is a flat array with .fieldname property
exports.createPortfolio = async (req, res) => {
    try {
        const {
            title,
            slug,
            category,
            clientName,
            eventDate,
            description,
            videoUrl,
            featured,
        } = req.body;

        // Validation
        if (!title || !category) {
            return res.status(400).json({
                success: false,
                message: "title aur category required hain.",
            });
        }

        // ── File handling (upload.any() → flat array) ──────────────────────
        const allFiles = req.files || [];
        const coverFile = allFiles.find((f) => f.fieldname === "coverImage") || null;
        const galleryFiles = allFiles.filter((f) => f.fieldname === "images");

        const coverImageUrl = coverFile ? `/uploads/${coverFile.filename}` : null;
        const imageUrls = galleryFiles.map((f) => `/uploads/${f.filename}`);

        // ── Create DB record ───────────────────────────────────────────────
        const portfolio = await Portfolio.create({
            title: title.trim(),
            slug: slug?.trim() || undefined,   // auto-generated if empty
            category: category.trim(),
            clientName: clientName?.trim() || null,
            eventDate: eventDate || null,
            description: description?.trim() || null,
            videoUrl: videoUrl?.trim() || null,
            featured: featured === "true" || featured === true,
            coverImage: coverImageUrl,
            images: imageUrls,
            photoCount: imageUrls.length,
        });

        return res.status(201).json({
            success: true,
            message: "Portfolio added successfully",
            data: {
                id: portfolio.id,
                title: portfolio.title,
                slug: portfolio.slug,
                category: portfolio.category,
                coverImage: portfolio.coverImage,
                images: portfolio.images,
            },
        });
    } catch (error) {
        // Cleanup uploaded files if DB insert fails
        deleteFiles((req.files || []).map((f) => `/uploads/${f.filename}`));
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── PATCH /api/portfolio/:id (Admin) ────────────────────────────────────────
exports.updatePortfolio = async (req, res) => {
    try {
        const portfolio = await Portfolio.findByPk(req.params.id);
        if (!portfolio) {
            return res.status(404).json({ success: false, message: "Portfolio not found." });
        }

        const {
            title, category, clientName, eventDate,
            featured, description, videoUrl,
        } = req.body;

        if (title !== undefined) portfolio.title = title;
        if (category !== undefined) portfolio.category = category;
        if (clientName !== undefined) portfolio.clientName = clientName;
        if (eventDate !== undefined) portfolio.eventDate = eventDate;
        if (description !== undefined) portfolio.description = description;
        if (videoUrl !== undefined) portfolio.videoUrl = videoUrl;
        if (featured !== undefined) portfolio.featured = featured === "true" || featured === true;

        // ── File handling (upload.any() → flat array) ──────────────────────
        const allFiles = req.files || [];
        const newCoverFile = allFiles.find((f) => f.fieldname === "coverImage") || null;
        const newGallery = allFiles.filter((f) => f.fieldname === "images");

        // Handle new coverImage
        if (newCoverFile) {
            if (portfolio.coverImage) deleteFiles([portfolio.coverImage]);
            portfolio.coverImage = `/uploads/${newCoverFile.filename}`;
        }

        // Handle new gallery images (append)
        if (newGallery.length > 0) {
            const newImages = newGallery.map((f) => `/uploads/${f.filename}`);
            const existingImages = portfolio.images || [];
            const updatedImages = [...existingImages, ...newImages];
            portfolio.set("images", updatedImages);
            portfolio.changed("images", true);
            portfolio.photoCount = updatedImages.length;
        }

        await portfolio.save();
        res.json({ success: true, message: "Portfolio updated.", data: portfolio });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── DELETE /api/portfolio/:id/image (Admin – remove a single gallery image) ─
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

// ─── DELETE /api/portfolio/:id (Admin) ───────────────────────────────────────
exports.deletePortfolio = async (req, res) => {
    try {
        const portfolio = await Portfolio.findByPk(req.params.id);
        if (!portfolio) {
            return res.status(404).json({ success: false, message: "Portfolio not found." });
        }

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
