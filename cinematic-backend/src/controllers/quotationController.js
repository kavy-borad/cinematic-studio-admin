const Quotation = require("../models/Quotation");
const Client = require("../models/Client");

// ─── Disposable / Temp email domain blocklist ──────────────────────────────────
const BLOCKED_EMAIL_DOMAINS = [
    "mailinator.com", "guerrillamail.com", "tempmail.com", "throwaway.email",
    "trashmail.com", "sharklasers.com", "guerrillamailblock.com", "grr.la",
    "guerrillamail.info", "guerrillamail.biz", "guerrillamail.de", "guerrillamail.net",
    "guerrillamail.org", "spam4.me", "yopmail.com", "yopmail.fr", "cool.fr.nf",
    "jetable.fr.nf", "nospam.ze.tc", "nomail.xl.cx", "mega.zik.dj", "speed.1s.fr",
    "dispostable.com", "mailnull.com", "maildrop.cc", "throwam.com",
    "getairmail.com", "filzmail.com", "discard.email", "spamgourmet.com",
    "tempr.email", "fakeinbox.com", "fakemailgenerator.com", "mailnesia.com",
    "tempinbox.co.uk", "tempinbox.com", "tempemail.net", "tempsky.com",
    "temp-mail.org", "temp-mail.ru",
    "10minutemail.com", "10minutemail.net", "10minutemail.org", "10minutemail.co.za",
    "20minutemail.com", "mohmal.com", "spamgourmet.net", "spamgourmet.org",
    "inbox.si", "inboxalias.com",
    "trashmail.at", "trashmail.io", "trashmail.me", "trashmail.net", "trashmail.xyz",
    "amail.com", "amilmail.com",
];

function isDisposableEmail(email) {
    const domain = email.split("@")[1]?.toLowerCase();
    return BLOCKED_EMAIL_DOMAINS.includes(domain);
}

// POST /api/quotations (Public – from website consultation form)
exports.createQuotation = async (req, res) => {
    try {
        const {
            name, email, phone, city, eventType, eventDate,
            venue, guestCount, functions, servicesRequested,
            budget, requirements
        } = req.body;

        // ─── Validation ────────────────────────────────────────────────────────

        // 1. Required fields
        if (!name || !email || !eventType) {
            console.warn("[QUOTATION] POST | VALIDATION FAILED: name, email, eventType required");
            return res.status(400).json({
                success: false,
                message: "Name, email, and event type are required.",
            });
        }

        // 2. Name validation: minimum 3 characters
        if (name.trim().length < 3) {
            console.warn(`[QUOTATION] POST | VALIDATION FAILED: name too short "${name}"`);
            return res.status(400).json({ success: false, message: "Name must be at least 3 characters long." });
        }

        // 3. Email: Proper regex format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
        if (!emailRegex.test(email.trim())) {
            console.warn(`[QUOTATION] POST | VALIDATION FAILED: invalid email format "${email}"`);
            return res.status(400).json({ success: false, message: "Please provide a valid email address." });
        }

        // 4. Email: Block Fake/Disposable Domains
        if (isDisposableEmail(email.trim())) {
            console.warn(`[QUOTATION] POST | VALIDATION FAILED: disposable/fake email "${email}"`);
            return res.status(400).json({ success: false, message: "Temporary or fake email addresses are not allowed. Please use a real email." });
        }

        // 5. Phone: Smart validation — blocks fake numbers like 0011111111, 9999999999, etc.
        if (phone && phone.trim().length > 0) {
            const phoneClean = phone.replace(/[\s\-\(\)\.]/g, "");

            // a. Basic format: optional +, then 7–15 digits
            if (!/^\+?\d{7,15}$/.test(phoneClean)) {
                console.warn(`[QUOTATION] POST | VALIDATION FAILED: invalid phone format "${phone}"`);
                return res.status(400).json({
                    success: false,
                    message: "Please provide a valid phone number. Only digits, spaces, hyphens, and + are allowed (7–15 digits).",
                });
            }

            // b. Extract only the digit part (remove leading +)
            const digitsOnly = phoneClean.replace(/^\+/, "");

            // c. Block all-same-digit numbers (e.g. 1111111111, 0000000000)
            if (/^(\d)\1+$/.test(digitsOnly)) {
                console.warn(`[QUOTATION] POST | VALIDATION FAILED: all-same-digit phone "${phone}"`);
                return res.status(400).json({
                    success: false,
                    message: "Phone number is not valid. Please enter a real mobile number.",
                });
            }

            // d. Block numbers starting with 0 followed by all same (e.g. 0011111111)
            if (/^0+\d*$/.test(digitsOnly) || /^(\d)\1{7,}/.test(digitsOnly)) {
                console.warn(`[QUOTATION] POST | VALIDATION FAILED: obviously fake phone "${phone}"`);
                return res.status(400).json({
                    success: false,
                    message: "Phone number is not valid. Please enter a real mobile number.",
                });
            }

            // e. India (+91) specific: 10 digits, must start with 6, 7, 8, or 9
            if (phoneClean.startsWith("+91")) {
                const indiaNumber = digitsOnly.slice(2); // remove 91
                if (indiaNumber.length !== 10 || !/^[6-9]/.test(indiaNumber)) {
                    console.warn(`[QUOTATION] POST | VALIDATION FAILED: invalid India number "${phone}"`);
                    return res.status(400).json({
                        success: false,
                        message: "Indian mobile number must be 10 digits and start with 6, 7, 8, or 9.",
                    });
                }
            }
        }


        // 6. guestCount: Numbers or ranges allowed (e.g. "500-1000", "500"). Just checking no alphabets.
        if (guestCount && guestCount.toString().trim().length > 0) {
            // Allows numbers, spaces, and hyphens or plus (e.g. 500, 500-1000, 500+)
            if (!/^[\d\-\+\s]+$/.test(guestCount.toString().trim())) {
                console.warn(`[QUOTATION] POST | VALIDATION FAILED: invalid guestCount "${guestCount}"`);
                return res.status(400).json({
                    success: false,
                    message: "Guest count should contain numbers or ranges (e.g. '500' or '500-1000'). Alphabets are not allowed.",
                });
            }
        }

        // 7. eventDate: Validate single date or range (e.g. "03-11-2026 to 07-11-2026")
        if (eventDate && eventDate.trim().length > 0) {
            // Validates single date or 'date to date' pattern
            const validDateStr = /^[\d\-\/]+(\s*to\s*[\d\-\/]+)?$/i.test(eventDate.trim());
            if (!validDateStr) {
                console.warn(`[QUOTATION] POST | VALIDATION FAILED: invalid eventDate "${eventDate}"`);
                return res.status(400).json({
                    success: false,
                    message: "Event date format is invalid. Please use a single date (e.g. 03-11-2026) or a range with 'to' (e.g. 03-11-2026 to 07-11-2026).",
                });
            }
        }
        // ──────────────────────────────────────────────────────────────────────

        const quotation = await Quotation.create({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone?.trim() || null,
            city: city?.trim() || null,
            eventType: eventType.trim(),
            eventDate: eventDate?.trim() || null,
            venue: venue?.trim() || null,
            guestCount: guestCount ? guestCount.toString().trim() : null,
            functions: functions?.trim() || null,
            servicesRequested: servicesRequested || [],
            budget: budget?.trim() || null,
            requirements: requirements?.trim() || null,
            status: "New",
        });

        console.log(`[QUOTATION] POST | CREATED id=${quotation.id} name="${quotation.name}" email="${quotation.email}" date="${quotation.eventDate}"`);

        // Exact response format requested
        res.status(201).json({
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
            updatedAt: quotation.updatedAt
        });

    } catch (error) {
        console.error("[QUOTATION] POST ERROR:", error.message);
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

        // ── Check if status is changed to 'Booked' and create/update Client ──
        if (status === "Booked" && quotation.status !== "Booked") {
            try {
                // Calculate estimated budget value if provided
                let estimatedValue = 0;
                if (quotation.budget) {
                    const numberMatch = quotation.budget.replace(/[^0-9]/g, '');
                    if (numberMatch) estimatedValue = parseInt(numberMatch, 10);
                }

                const existingClient = await Client.findOne({ where: { email: quotation.email } });
                if (existingClient) {
                    await existingClient.update({
                        projectCount: (existingClient.projectCount || 0) + 1,
                        phone: existingClient.phone || quotation.phone || null,
                        totalSpent: parseFloat(existingClient.totalSpent) + estimatedValue,
                        status: "Active",
                    });
                    console.log(`[QUOTATION → CLIENT] Updated existing client: ${quotation.email} (projects: ${existingClient.projectCount})`);
                } else {
                    await Client.create({
                        name: quotation.name,
                        email: quotation.email,
                        phone: quotation.phone || null,
                        projectCount: 1,
                        totalSpent: estimatedValue,
                        status: "Active",
                    });
                    console.log(`[QUOTATION → CLIENT] New client automatically created from booking: ${quotation.name} <${quotation.email}>`);
                }
            } catch (clientErr) {
                console.warn("[QUOTATION → CLIENT] Auto-client creation failed:", clientErr.message);
            }
        }
        // ─────────────────────────────────────────────────────────────────────

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

// PUT /api/quotations/:id (Admin - update any details)
exports.updateQuotation = async (req, res) => {
    try {
        const quotation = await Quotation.findByPk(req.params.id);
        if (!quotation) {
            return res.status(404).json({ success: false, message: "Quotation not found." });
        }

        // Prevent changing ID or internal fields if any
        const updatableFields = [
            'name', 'email', 'phone', 'city', 'eventType', 'eventDate',
            'venue', 'guestCount', 'functions', 'servicesRequested',
            'budget', 'requirements'
        ];

        updatableFields.forEach(field => {
            if (req.body[field] !== undefined) {
                quotation[field] = req.body[field];
            }
        });

        await quotation.save();
        res.json({ success: true, message: "Quotation updated successfully.", data: quotation });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/quotations/unread-count (Admin - notification badge)
exports.getUnreadCount = async (req, res) => {
    try {
        const count = await Quotation.count({ where: { isRead: false } });
        res.json({ success: true, data: { unreadCount: count } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/quotations/unread (Admin - notification list)
exports.getUnreadQuotations = async (req, res) => {
    try {
        const quotations = await Quotation.findAll({
            where: { isRead: false },
            order: [["createdAt", "DESC"]],
            limit: 10,
        });
        res.json({ success: true, data: quotations });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// PATCH /api/quotations/:id/read (Admin - mark single as read)
exports.markAsRead = async (req, res) => {
    try {
        const quotation = await Quotation.findByPk(req.params.id);
        if (!quotation) {
            return res.status(404).json({ success: false, message: "Quotation not found." });
        }
        quotation.isRead = true;
        await quotation.save();
        res.json({ success: true, message: "Marked as read." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// PATCH /api/quotations/mark-all-read (Admin - mark all as read)
exports.markAllAsRead = async (req, res) => {
    try {
        await Quotation.update({ isRead: true }, { where: { isRead: false } });
        res.json({ success: true, message: "All quotations marked as read." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
