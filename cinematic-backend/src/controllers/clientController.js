const { Op } = require("sequelize");
const Client = require("../models/Client");

// ─── Disposable / Temp email domain blocklist ──────────────────────────────────
const BLOCKED_DOMAINS = [
    "mailinator.com", "guerrillamail.com", "tempmail.com", "throwaway.email",
    "trashmail.com", "sharklasers.com", "guerrillamailblock.com", "grr.la",
    "guerrillamail.info", "guerrillamail.biz", "guerrillamail.de", "guerrillamail.net",
    "guerrillamail.org", "spam4.me", "yopmail.com", "yopmail.fr", "cool.fr.nf",
    "jetable.fr.nf", "nospam.ze.tc", "nomail.xl.cx", "mega.zik.dj", "speed.1s.fr",
    "courriel.fr.nf", "moncourrier.fr.nf", "monemail.fr.nf", "monmail.fr.nf",
    "dispostable.com", "mailnull.com", "maildrop.cc", "throwam.com",
    "getairmail.com", "filzmail.com", "discard.email", "spamgourmet.com",
    "tempr.email", "fakeinbox.com", "fakemailgenerator.com", "mailnesia.com",
    "spamhere.net", "spamhereplease.com", "spamthisplease.com",
    "tempinbox.co.uk", "tempinbox.com", "tempemail.net", "tempsky.com",
    "temp-mail.org", "temp-mail.ru",
    "10minutemail.com", "10minutemail.net", "10minutemail.org", "10minutemail.co.za",
    "20minutemail.com", "mohmal.com", "spamgourmet.net", "spamgourmet.org",
    "inbox.si", "inboxalias.com",
    "trashmail.at", "trashmail.io", "trashmail.me", "trashmail.net", "trashmail.xyz",
];

function isDisposableEmail(email) {
    const domain = email.split("@")[1]?.toLowerCase();
    return BLOCKED_DOMAINS.includes(domain);
}

// ─── GET /api/clients ──────────────────────────────────────────────────────────
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

        console.log(`[CLIENT] GET /api/clients | search="${search || "none"}" | found=${clients.length}`);

        res.json({ success: true, count: clients.length, data: clients });
    } catch (error) {
        console.error("[CLIENT] GET /api/clients ERROR:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── GET /api/clients/:id ──────────────────────────────────────────────────────
exports.getClient = async (req, res) => {
    try {
        const client = await Client.findByPk(req.params.id);

        if (!client) {
            console.warn(`[CLIENT] GET /api/clients/${req.params.id} | NOT FOUND`);
            return res.status(404).json({ success: false, message: "Client not found." });
        }

        console.log(`[CLIENT] GET /api/clients/${req.params.id} | name="${client.name}"`);
        res.json({ success: true, data: client });
    } catch (error) {
        console.error(`[CLIENT] GET /api/clients/${req.params.id} ERROR:`, error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── POST /api/clients ─────────────────────────────────────────────────────────
exports.createClient = async (req, res) => {
    try {
        const { name, email, phone, projectCount, totalSpent, status } = req.body;

        // ── Validation ────────────────────────────────────────────────────────

        // 1. All fields required
        if (!name || !email || !phone || projectCount === undefined || projectCount === "" || totalSpent === undefined || totalSpent === "" || !status) {
            console.warn("[CLIENT] POST /api/clients | VALIDATION FAILED: all fields are required");
            return res.status(400).json({ success: false, message: "All fields are required: name, email, phone, project count, total spent, and status." });
        }

        // 2. Name: minimum 3 characters, letters/spaces/hyphens/apostrophes only
        const trimmedName = name.trim();
        if (trimmedName.length < 3) {
            console.warn(`[CLIENT] POST /api/clients | VALIDATION FAILED: name too short "${trimmedName}"`);
            return res.status(400).json({ success: false, message: "Name must be at least 3 characters long." });
        }
        if (!/^[a-zA-Z\s\-'.]+$/.test(trimmedName)) {
            console.warn(`[CLIENT] POST /api/clients | VALIDATION FAILED: invalid name chars "${trimmedName}"`);
            return res.status(400).json({ success: false, message: "Name can only contain letters, spaces, hyphens, and apostrophes." });
        }

        // 3. Email: proper format check
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
        if (!emailRegex.test(email.trim())) {
            console.warn(`[CLIENT] POST /api/clients | VALIDATION FAILED: invalid email format "${email}"`);
            return res.status(400).json({ success: false, message: "Please provide a valid email address." });
        }

        // 4. Email: block disposable / temp email domains
        if (isDisposableEmail(email.trim())) {
            console.warn(`[CLIENT] POST /api/clients | VALIDATION FAILED: disposable/temp email "${email}"`);
            return res.status(400).json({ success: false, message: "Temporary or disposable email addresses are not allowed." });
        }

        // 5. Phone: required + valid format (7–15 digits)
        const phoneDigits = phone.replace(/[\s\-\+\(\)]/g, "");
        if (!/^\d{7,15}$/.test(phoneDigits)) {
            console.warn(`[CLIENT] POST /api/clients | VALIDATION FAILED: invalid phone "${phone}"`);
            return res.status(400).json({ success: false, message: "Please provide a valid phone number (7–15 digits)." });
        }

        // 6. Project count: must be 0 or positive integer
        if (isNaN(Number(projectCount)) || Number(projectCount) < 0) {
            console.warn(`[CLIENT] POST /api/clients | VALIDATION FAILED: invalid projectCount "${projectCount}"`);
            return res.status(400).json({ success: false, message: "Project count must be a non-negative number." });
        }

        // 7. Total spent: must be 0 or positive
        if (isNaN(Number(totalSpent)) || Number(totalSpent) < 0) {
            console.warn(`[CLIENT] POST /api/clients | VALIDATION FAILED: invalid totalSpent "${totalSpent}"`);
            return res.status(400).json({ success: false, message: "Total spent must be a non-negative number." });
        }

        // 8. Status: must be Active or Inactive
        if (!["Active", "Inactive"].includes(status)) {
            console.warn(`[CLIENT] POST /api/clients | VALIDATION FAILED: invalid status "${status}"`);
            return res.status(400).json({ success: false, message: "Status must be either Active or Inactive." });
        }
        // ─────────────────────────────────────────────────────────────────────

        const client = await Client.create({
            name: trimmedName,
            email: email.trim().toLowerCase(),
            phone: phone.trim(),
            projectCount: Number(projectCount),
            totalSpent: Number(totalSpent),
            status,
        });

        console.log(`[CLIENT] POST /api/clients | CREATED id=${client.id} name="${client.name}" email="${client.email}" phone="${client.phone}" projects=${client.projectCount} spent=${client.totalSpent} status="${client.status}"`);
        res.status(201).json({ success: true, data: client });
    } catch (error) {
        if (error.name === "SequelizeUniqueConstraintError") {
            console.warn(`[CLIENT] POST /api/clients | DUPLICATE EMAIL: ${req.body.email}`);
            return res.status(409).json({ success: false, message: "A client with this email already exists." });
        }
        console.error("[CLIENT] POST /api/clients ERROR:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── PUT /api/clients/:id ──────────────────────────────────────────────────────
exports.updateClient = async (req, res) => {
    try {
        const client = await Client.findByPk(req.params.id);

        if (!client) {
            console.warn(`[CLIENT] PUT /api/clients/${req.params.id} | NOT FOUND`);
            return res.status(404).json({ success: false, message: "Client not found." });
        }

        const { name, email, phone, projectCount, totalSpent, status } = req.body;
        await client.update({ name, email, phone, projectCount, totalSpent, status });

        console.log(`[CLIENT] PUT /api/clients/${req.params.id} | UPDATED name="${client.name}" status="${client.status}"`);
        res.json({ success: true, data: client });
    } catch (error) {
        if (error.name === "SequelizeUniqueConstraintError") {
            console.warn(`[CLIENT] PUT /api/clients/${req.params.id} | DUPLICATE EMAIL: ${req.body.email}`);
            return res.status(409).json({ success: false, message: "A client with this email already exists." });
        }
        console.error(`[CLIENT] PUT /api/clients/${req.params.id} ERROR:`, error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── DELETE /api/clients/:id ───────────────────────────────────────────────────
exports.deleteClient = async (req, res) => {
    try {
        const client = await Client.findByPk(req.params.id);

        if (!client) {
            console.warn(`[CLIENT] DELETE /api/clients/${req.params.id} | NOT FOUND`);
            return res.status(404).json({ success: false, message: "Client not found." });
        }

        const name = client.name;
        await client.destroy();

        console.log(`[CLIENT] DELETE /api/clients/${req.params.id} | DELETED name="${name}"`);
        res.json({ success: true, message: "Client deleted." });
    } catch (error) {
        console.error(`[CLIENT] DELETE /api/clients/${req.params.id} ERROR:`, error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};
