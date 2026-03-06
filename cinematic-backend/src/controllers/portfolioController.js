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

// ─── PUT /api/portfolio/:id (Admin – Update Portfolio + Add More Images) ──────
// Content-Type : multipart/form-data
// All fields optional – only provided fields are updated
// images field  → APPENDs to existing gallery (does NOT replace)
exports.updatePortfolio = async (req, res) => {
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📝  PUT /api/portfolio/:id  →  updatePortfolio");
    console.log("📌  Portfolio ID requested:", req.params.id);
    console.log("📦  Body fields received :", Object.keys(req.body));
    console.log("🖼️   Files received       :", (req.files || []).map((f) => `${f.fieldname}:${f.filename}`).join(", ") || "none");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    try {
        // ── 1. Find portfolio in DB ────────────────────────────────────────────
        const portfolio = await Portfolio.findByPk(req.params.id);
        if (!portfolio) {
            console.warn("❌  Portfolio NOT FOUND for id:", req.params.id);
            return res.status(404).json({ message: "Portfolio not found" });
        }
        console.log("✅  Portfolio found:", portfolio.title, "(id:", portfolio.id + ")");

        const {
            title, slug, category, clientName,
            eventDate, featured, description, videoUrl,
        } = req.body;

        // ── 2. Update scalar fields (only if provided) ─────────────────────────
        if (title !== undefined) { portfolio.title = title.trim(); console.log("  • title      →", portfolio.title); }
        if (slug !== undefined) { portfolio.slug = slug.trim(); console.log("  • slug       →", portfolio.slug); }
        if (category !== undefined) { portfolio.category = category.trim(); console.log("  • category   →", portfolio.category); }
        if (clientName !== undefined) { portfolio.clientName = clientName.trim(); console.log("  • clientName →", portfolio.clientName); }
        if (eventDate !== undefined) { portfolio.eventDate = eventDate; console.log("  • eventDate  →", portfolio.eventDate); }
        if (description !== undefined) { portfolio.description = description.trim(); console.log("  • description→ (updated)"); }
        if (videoUrl !== undefined) { portfolio.videoUrl = videoUrl.trim(); console.log("  • videoUrl   →", portfolio.videoUrl); }
        if (featured !== undefined) {
            portfolio.featured = featured === "true" || featured === true;
            console.log("  • featured   →", portfolio.featured);
        }

        // ── 3. File handling (upload.any() → flat array) ───────────────────────
        const allFiles = req.files || [];
        const newCoverFile = allFiles.find((f) => f.fieldname === "coverImage") || null;
        const newGallery = allFiles.filter((f) => f.fieldname === "images");

        // ── 3a. Replace coverImage (delete old from disk) ──────────────────────
        if (newCoverFile) {
            const oldCover = portfolio.coverImage;
            if (oldCover) {
                deleteFiles([oldCover]);
                console.log("  🗑️  Old coverImage deleted from disk:", oldCover);
            }
            portfolio.coverImage = `/uploads/${newCoverFile.filename}`;
            console.log("  🖼️  New coverImage saved:", portfolio.coverImage);
        }

        // ── 3b. APPEND new gallery images to existing ──────────────────────────
        if (newGallery.length > 0) {
            const newImages = newGallery.map((f) => `/uploads/${f.filename}`);
            const existingImages = safeParseImages(portfolio.images) || [];
            const updatedImages = [...existingImages, ...newImages];

            portfolio.set("images", updatedImages);
            portfolio.changed("images", true);
            portfolio.photoCount = updatedImages.length;

            console.log("  📸  Existing images :", existingImages.length);
            console.log("  📸  New images added :", newImages.length);
            console.log("  📸  Total images now :", updatedImages.length);
        }

        // ── 4. Persist to DB ───────────────────────────────────────────────────
        await portfolio.save();
        console.log("✅  Portfolio saved to DB. updatedAt:", portfolio.updatedAt);

        // ── 5. Build response matching spec ────────────────────────────────────
        const responseData = {
            id: portfolio.id,
            title: portfolio.title,
            slug: portfolio.slug,
            category: portfolio.category,
            coverImage: portfolio.coverImage,
            images: safeParseImages(portfolio.images),
            clientName: portfolio.clientName,
            eventDate: portfolio.eventDate,
            description: portfolio.description,
            featured: portfolio.featured,
            createdAt: portfolio.createdAt,
            updatedAt: portfolio.updatedAt,
        };

        console.log("📤  Response sent → message: 'Portfolio updated successfully'");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

        return res.status(200).json({
            message: "Portfolio updated successfully",
            portfolio: responseData,
        });

    } catch (error) {
        console.error("❌  updatePortfolio error:", error.message);
        // Cleanup any newly uploaded files that weren't committed
        deleteFiles((req.files || []).map((f) => `/uploads/${f.filename}`));
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ─── DELETE /api/portfolio/:id/image (Admin – remove a single gallery image) ──
// Body : { "imageUrl": "/uploads/filename.jpg" }
// Returns: { message, portfolio: { id, images[] } }
exports.removeImage = async (req, res) => {
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🗑️   DELETE /api/portfolio/:id/image  →  removeImage");
    console.log("📌  Portfolio ID :", req.params.id);
    console.log("📦  imageUrl     :", req.body?.imageUrl || "(not provided)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    try {
        // ── 1. Find portfolio ──────────────────────────────────────────────────
        const portfolio = await Portfolio.findByPk(req.params.id);
        if (!portfolio) {
            console.warn("❌  Portfolio NOT FOUND for id:", req.params.id);
            return res.status(404).json({ message: "Portfolio not found" });
        }
        console.log("✅  Portfolio found:", portfolio.title, "(id:", portfolio.id + ")");

        // ── 2. Validate imageUrl ───────────────────────────────────────────────
        const { imageUrl } = req.body;
        if (!imageUrl) {
            console.warn("❌  imageUrl missing in request body");
            return res.status(400).json({ message: "imageUrl is required." });
        }

        // ── 3. Remove from images array ───────────────────────────────────────
        const existingImages = safeParseImages(portfolio.images);
        console.log("  📸  Images before deletion :", existingImages.length);

        const updatedImages = existingImages.filter((img) => img !== imageUrl);
        const removed = existingImages.length - updatedImages.length;

        if (removed === 0) {
            console.warn("⚠️   imageUrl not found in gallery:", imageUrl);
            return res.status(404).json({ message: "Image not found in portfolio gallery." });
        }

        console.log("  🗑️   Removed image          :", imageUrl);
        console.log("  📸  Images after deletion   :", updatedImages.length);

        portfolio.set("images", updatedImages);
        portfolio.changed("images", true);
        portfolio.photoCount = updatedImages.length;

        // ── 4. If deleted image was the cover → promote first remaining ────────
        if (portfolio.coverImage === imageUrl) {
            portfolio.coverImage = updatedImages.length > 0 ? updatedImages[0] : null;
            console.log("  🖼️   Cover was deleted → new cover:", portfolio.coverImage || "null");
        }

        // ── 5. Save to DB ─────────────────────────────────────────────────────
        await portfolio.save();
        console.log("✅  Portfolio saved to DB. photoCount:", portfolio.photoCount);

        // ── 6. Delete physical file from disk ─────────────────────────────────
        deleteFiles([imageUrl]);
        console.log("  💾  File deleted from disk:", imageUrl);

        // ── 7. Build spec-exact response ──────────────────────────────────────
        const responseData = {
            id: portfolio.id,
            images: safeParseImages(portfolio.images),
        };

        console.log("📤  Response sent → message: 'Image deleted successfully'");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

        return res.status(200).json({
            message: "Image deleted successfully",
            portfolio: responseData,
        });

    } catch (error) {
        console.error("❌  removeImage error:", error.message);
        return res.status(500).json({ success: false, message: error.message });
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
