const Setting = require("../models/Setting");

// GET /api/settings (Admin)
exports.getSettings = async (req, res) => {
    try {
        const settings = await Setting.findAll();
        // Group settings by their group field
        const grouped = {};
        settings.forEach((s) => {
            if (!grouped[s.group]) grouped[s.group] = {};
            grouped[s.group][s.key] = s.value;
        });
        res.json({ success: true, data: grouped });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/settings/public (Public – for client website)
exports.getPublicSettings = async (req, res) => {
    try {
        const settings = await Setting.findAll({
            where: { group: ["contact", "social"] },
        });
        const grouped = {};
        settings.forEach((s) => {
            if (!grouped[s.group]) grouped[s.group] = {};
            grouped[s.group][s.key] = s.value;
        });
        res.json({ success: true, data: grouped });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// PUT /api/settings (Admin – bulk upsert)
exports.updateSettings = async (req, res) => {
    try {
        const data = req.body; // { contact: { businessName: "...", ... }, social: { ... }, seo: { ... } }

        if (!data || typeof data !== "object") {
            return res.status(400).json({ success: false, message: "Request body must be an object of setting groups." });
        }

        const promises = [];
        for (const [group, fields] of Object.entries(data)) {
            if (typeof fields !== "object") continue;
            for (const [key, value] of Object.entries(fields)) {
                promises.push(
                    Setting.upsert({ key, value: value || "", group })
                );
            }
        }
        await Promise.all(promises);

        // Return updated settings
        const settings = await Setting.findAll();
        const grouped = {};
        settings.forEach((s) => {
            if (!grouped[s.group]) grouped[s.group] = {};
            grouped[s.group][s.key] = s.value;
        });

        res.json({ success: true, message: "Settings saved.", data: grouped });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
