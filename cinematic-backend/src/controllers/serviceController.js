const Service = require("../models/Service");
const fs = require("fs");
const path = require("path");

// ─── Helper: delete uploaded file from disk ───────────────────────────────────
function deleteFile(filePath) {
    if (!filePath) return;
    const full = path.join(__dirname, "../../", filePath);
    if (fs.existsSync(full)) {
        try { fs.unlinkSync(full); } catch (_) { }
    }
}

// ─── Helper: safely parse JSON features field ─────────────────────────────────
function safeParseFeatures(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") {
        try { return JSON.parse(raw); } catch (_) { return []; }
    }
    return [];
}

// ─── Helper: build full thumbnail URL ────────────────────────────────────────
function toUrl(file) {
    return file ? `/uploads/${file.filename}` : null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/services  (Public)
// ═══════════════════════════════════════════════════════════════════════════════
exports.getAllServices = async (req, res) => {
    try {
        const services = await Service.findAll({ order: [["createdAt", "DESC"]] });
        const data = services.map((s) => {
            const obj = s.toJSON();
            obj.features = safeParseFeatures(obj.features);
            return obj;
        });
        res.json({ success: true, count: data.length, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/services/:id  (Public)
// ═══════════════════════════════════════════════════════════════════════════════
exports.getService = async (req, res) => {
    try {
        const service = await Service.findByPk(req.params.id);
        if (!service) {
            return res.status(404).json({ success: false, message: "Service not found." });
        }
        const data = service.toJSON();
        data.features = safeParseFeatures(data.features);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/services  (Admin)
// Content-Type: multipart/form-data
// Fields : title, slug?, description, shortDescription, startingPrice,
//          features (JSON string), isActive, popular, icon, duration, packageName
// File   : thumbnail (single image, optional)
// ═══════════════════════════════════════════════════════════════════════════════
exports.createService = async (req, res) => {
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🆕  POST /api/services  →  createService");
    console.log("📦  Body fields  :", Object.keys(req.body));
    console.log("🖼️   File received:", req.file ? `${req.file.fieldname}:${req.file.filename}` : "none");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    try {
        const {
            title, slug,
            description, shortDescription,
            startingPrice,
            features,
            isActive, popular,
            icon, duration, packageName,
        } = req.body;

        // ── Validation ────────────────────────────────────────────────────────
        if (!title || !title.trim()) {
            if (req.file) deleteFile(toUrl(req.file));
            console.warn("❌  Validation failed: title is required");
            return res.status(400).json({ success: false, message: "title is required." });
        }

        // ── Parse features (JSON string → array) ──────────────────────────────
        let parsedFeatures = [];
        if (features) {
            if (typeof features === "string") {
                try { parsedFeatures = JSON.parse(features); } catch (_) {
                    // fallback: comma-separated string
                    parsedFeatures = features.split(",").map((f) => f.trim()).filter(Boolean);
                }
            } else if (Array.isArray(features)) {
                parsedFeatures = features;
            }
        }

        // ── Thumbnail URL ──────────────────────────────────────────────────────
        const thumbnailUrl = req.file ? `/uploads/${req.file.filename}` : null;
        console.log("  🖼️   thumbnail saved at:", thumbnailUrl || "(none)");

        // ── Create DB record ───────────────────────────────────────────────────
        const service = await Service.create({
            title: title.trim(),
            slug: slug?.trim() || undefined,    // auto-generated if empty
            description: description?.trim() || null,
            shortDescription: shortDescription?.trim() || null,
            startingPrice: startingPrice?.trim() || null,
            thumbnail: thumbnailUrl,
            features: parsedFeatures,
            isActive: isActive === "true" || isActive === true,
            popular: popular === "true" || popular === true,
            icon: icon?.trim() || "Camera",
            duration: duration?.trim() || null,
            packageName: packageName?.trim() || null,
        });

        console.log("✅  Service created. ID:", service.id, "| title:", service.title, "| slug:", service.slug);
        console.log("📤  Response: { success: true, message: 'Service created successfully' }");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

        return res.status(201).json({
            success: true,
            message: "Service created successfully",
            data: {
                ...service.toJSON(),
                features: safeParseFeatures(service.features),
            },
        });

    } catch (error) {
        if (req.file) deleteFile(toUrl(req.file));
        console.error("❌  createService error:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// PUT /api/services/:id  (Admin)
// Content-Type: multipart/form-data  — all fields optional
// ═══════════════════════════════════════════════════════════════════════════════
exports.updateService = async (req, res) => {
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✏️   PUT /api/services/:id  →  updateService");
    console.log("📌  Service ID  :", req.params.id);
    console.log("📦  Body fields :", Object.keys(req.body));
    console.log("🖼️   File        :", req.file ? req.file.filename : "none");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    try {
        const service = await Service.findByPk(req.params.id);
        if (!service) {
            if (req.file) deleteFile(toUrl(req.file));
            console.warn("❌  Service NOT FOUND for id:", req.params.id);
            return res.status(404).json({ success: false, message: "Service not found." });
        }
        console.log("✅  Service found:", service.title);

        const {
            title, slug,
            description, shortDescription,
            startingPrice,
            features,
            isActive, popular,
            icon, duration, packageName,
        } = req.body;

        if (title !== undefined) service.title = title.trim();
        if (slug !== undefined) service.slug = slug.trim();
        if (description !== undefined) service.description = description.trim();
        if (shortDescription !== undefined) service.shortDescription = shortDescription.trim();
        if (startingPrice !== undefined) service.startingPrice = startingPrice.trim();
        if (isActive !== undefined) service.isActive = isActive === "true" || isActive === true;
        if (popular !== undefined) service.popular = popular === "true" || popular === true;
        if (icon !== undefined) service.icon = icon.trim();
        if (duration !== undefined) service.duration = duration.trim();
        if (packageName !== undefined) service.packageName = packageName.trim() || null;

        if (features !== undefined) {
            let parsedFeatures = [];
            if (typeof features === "string") {
                try { parsedFeatures = JSON.parse(features); } catch (_) {
                    parsedFeatures = features.split(",").map((f) => f.trim()).filter(Boolean);
                }
            } else if (Array.isArray(features)) {
                parsedFeatures = features;
            }
            service.set("features", parsedFeatures);
            service.changed("features", true);
        }

        // ── Replace thumbnail if new file uploaded ─────────────────────────────
        if (req.file) {
            if (service.thumbnail) deleteFile(service.thumbnail);
            service.thumbnail = `/uploads/${req.file.filename}`;
            console.log("  🖼️   New thumbnail:", service.thumbnail);
        }

        await service.save();
        console.log("✅  Service updated. updatedAt:", service.updatedAt);
        console.log("📤  Response: { success: true, message: 'Service updated successfully' }");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

        return res.json({
            success: true,
            message: "Service updated successfully",
            data: {
                ...service.toJSON(),
                features: safeParseFeatures(service.features),
            },
        });

    } catch (error) {
        if (req.file) deleteFile(toUrl(req.file));
        console.error("❌  updateService error:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/services/:id  (Admin)
// ═══════════════════════════════════════════════════════════════════════════════
exports.deleteService = async (req, res) => {
    console.log("\n🗑️   DELETE /api/services/:id  →  id:", req.params.id);
    try {
        const service = await Service.findByPk(req.params.id);
        if (!service) {
            console.warn("❌  Service NOT FOUND for id:", req.params.id);
            return res.status(404).json({ success: false, message: "Service not found." });
        }
        if (service.thumbnail) deleteFile(service.thumbnail);
        await service.destroy();
        console.log("✅  Service deleted:", service.title);
        return res.json({ success: true, message: "Service deleted successfully." });
    } catch (error) {
        console.error("❌  deleteService error:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};
