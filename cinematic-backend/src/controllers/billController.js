const Bill = require("../models/Bill");
const Quotation = require("../models/Quotation");
const { generateBillPDF } = require("../utils/pdf/generateBill");

const VALID_STATUSES = ["Unpaid", "Partially Paid", "Paid", "Overdue", "Cancelled"];

function toMoney(value, fieldName) {
    if (value === undefined || value === null || value === "") return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error(`${fieldName} must be a valid non-negative number.`);
    }
    return Number(parsed.toFixed(2));
}

function isValidDateInput(value) {
    if (value === undefined || value === null || value === "") return true;
    return !Number.isNaN(new Date(value).getTime());
}

async function generateNextInvoiceNumber() {
    const latestBill = await Bill.findOne({
        order: [["id", "DESC"]],
    });

    if (!latestBill || !latestBill.invoiceNumber) {
        return "INV-001";
    }

    const match = String(latestBill.invoiceNumber).match(/^INV-(\d+)$/i);
    if (!match) {
        return `INV-${String(latestBill.id + 1).padStart(3, "0")}`;
    }

    const next = Number(match[1]) + 1;
    return `INV-${String(next).padStart(3, "0")}`;
}

function mapBillResponse(bill) {
    const data = bill.toJSON();
    let items = data.items;
    if (typeof items === 'string') {
        try {
            items = JSON.parse(items);
        } catch (e) {
            items = [];
        }
    }

    return {
        ...data,
        items: Array.isArray(items) ? items : [],
        subtotal: Number(data.subtotal),
        gstRate: Number(data.gstRate),
        taxAmount: Number(data.taxAmount),
        totalAmount: Number(data.totalAmount),
        advancePaid: Number(data.advancePaid),
        balanceAmount: Number(data.balanceAmount),
        venue: data.venue || null,
        guestCount: data.guestCount || null,
    };
}

// POST /api/bills
// Supports creating from scratch or by linking an existing booked quotation (quotationId).
exports.createBill = async (req, res) => {
    try {
        const {
            quotationId,
            clientName,
            clientEmail,
            clientPhone,
            clientAddress,
            eventType,
            eventDate,
            items,
            gstRate,
            advancePaid,
            dueDate,
            status,
            notes,
            venue,
            guestCount,
        } = req.body;

        let quotation = null;
        let parsedQuotationId = null;

        if (quotationId !== undefined && quotationId !== null && quotationId !== "") {
            parsedQuotationId = Number(quotationId);
            if (!Number.isInteger(parsedQuotationId) || parsedQuotationId <= 0) {
                return res.status(400).json({ success: false, message: "quotationId must be a valid positive integer." });
            }

            quotation = await Quotation.findByPk(parsedQuotationId);
            if (!quotation) {
                return res.status(404).json({ success: false, message: "Quotation not found for provided quotationId." });
            }

            if (quotation.status !== "Booked") {
                return res.status(400).json({ success: false, message: "Only booked quotations can be linked to a bill." });
            }
        }

        const finalClientName = (clientName || quotation?.name || "").trim();
        const finalClientEmail = (clientEmail || quotation?.email || "").trim().toLowerCase();
        const finalClientPhone = (clientPhone || quotation?.phone || "").trim() || null;
        const finalClientAddress = (clientAddress || quotation?.city || "").trim() || null;
        const finalEventType = (eventType || quotation?.eventType || "").trim();
        const finalEventDate = (eventDate || quotation?.eventDate || "").trim() || null;
        const finalVenue = (venue || quotation?.venue || "").trim() || null;
        const finalGuestCount = (guestCount || quotation?.guestCount || "").trim() || null;

        if (!finalClientName) {
            return res.status(400).json({ success: false, message: "clientName is required." });
        }
        if (!finalClientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(finalClientEmail)) {
            return res.status(400).json({ success: false, message: "A valid clientEmail is required." });
        }
        if (!finalEventType) {
            return res.status(400).json({ success: false, message: "eventType is required." });
        }
        if (!isValidDateInput(finalEventDate)) {
            return res.status(400).json({ success: false, message: "eventDate must be a valid date." });
        }
        if (!isValidDateInput(dueDate)) {
            return res.status(400).json({ success: false, message: "dueDate must be a valid date." });
        }

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: "items must be a non-empty array." });
        }

        const normalizedItems = items.map((item, index) => {
            const service = String(item?.service || "").trim();
            const deliverables = String(item?.deliverables || "").trim();
            const price = toMoney(item?.price, `items[${index}].price`);
            const quantity = Number(item?.quantity) || 1;
            const amount = toMoney(item?.amount, `items[${index}].amount`) || Number((price * quantity).toFixed(2));

            if (!service) {
                throw new Error(`items[${index}].service is required.`);
            }
            if (price === null) {
                throw new Error(`items[${index}].price is required.`);
            }

            return { service, deliverables, price, quantity, amount };
        });

        const computedSubtotal = normalizedItems.reduce((sum, item) => sum + Number(item.amount), 0);
        const finalSubtotal = Number(computedSubtotal.toFixed(2));
        const finalGstRate = toMoney(gstRate, "gstRate") ?? 18;
        const finalTaxAmount = Number(((finalSubtotal * finalGstRate) / 100).toFixed(2));
        const finalTotalAmount = Number((finalSubtotal + finalTaxAmount).toFixed(2));
        const finalAdvancePaid = toMoney(advancePaid, "advancePaid") ?? 0;
        const finalBalanceAmount = Number((finalTotalAmount - finalAdvancePaid).toFixed(2));

        if (finalAdvancePaid > finalTotalAmount) {
            return res.status(400).json({ success: false, message: "advancePaid cannot be greater than totalAmount." });
        }

        const finalStatus = (status || "Unpaid").trim();
        if (!VALID_STATUSES.includes(finalStatus)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
            });
        }

        const invoiceNumber = await generateNextInvoiceNumber();

        const bill = await Bill.create({
            invoiceNumber,
            quotationId: parsedQuotationId,
            clientName: finalClientName,
            clientEmail: finalClientEmail,
            clientPhone: finalClientPhone,
            clientAddress: finalClientAddress,
            eventType: finalEventType,
            eventDate: finalEventDate,
            items: normalizedItems,
            subtotal: finalSubtotal,
            gstRate: finalGstRate,
            taxAmount: finalTaxAmount,
            totalAmount: finalTotalAmount,
            advancePaid: finalAdvancePaid,
            balanceAmount: finalBalanceAmount,
            status: finalStatus,
            dueDate: dueDate || null,
            notes: notes ? String(notes).trim() : null,
            venue: finalVenue,
            guestCount: finalGuestCount,
        });

        res.status(201).json({
            success: true,
            message: "Bill created successfully",
            data: mapBillResponse(bill),
        });
    } catch (error) {
        if (error.name === "SequelizeUniqueConstraintError") {
            return res.status(409).json({ success: false, message: "Invoice number already exists. Please retry." });
        }

        const clientErrors = [
            "items[",
            "must be a valid",
            "is required",
            "cannot be greater",
        ];
        const isValidationStyleError = clientErrors.some((part) => error.message.includes(part));

        if (isValidationStyleError) {
            return res.status(400).json({ success: false, message: error.message });
        }

        return res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/bills
// Supports optional status filter.
exports.getBills = async (req, res) => {
    try {
        const { status } = req.query;
        let whereCondition = {};

        if (status) {
            whereCondition.status = status;
        }

        const bills = await Bill.findAll({
            where: whereCondition,
            order: [["id", "DESC"]]
        });

        res.status(200).json({
            success: true,
            count: bills.length,
            data: bills.map(mapBillResponse)
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// PUT /api/bills/:id
exports.updateBill = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            clientName,
            clientEmail,
            clientPhone,
            clientAddress,
            eventType,
            eventDate,
            items,
            gstRate,
            advancePaid,
            dueDate,
            status,
            notes,
            venue,
            guestCount,
        } = req.body;

        const bill = await Bill.findByPk(id);
        if (!bill) {
            return res.status(404).json({ success: false, message: "Bill not found." });
        }

        // Handle simple string/date fields
        if (clientName !== undefined) bill.clientName = clientName.trim() || bill.clientName;
        if (clientEmail !== undefined) {
            const email = clientEmail.trim().toLowerCase();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
                return res.status(400).json({ success: false, message: "A valid clientEmail is required." });
            }
            bill.clientEmail = email;
        }
        if (clientPhone !== undefined) bill.clientPhone = clientPhone.trim();
        if (clientAddress !== undefined) bill.clientAddress = clientAddress.trim();
        if (eventType !== undefined) bill.eventType = eventType.trim();
        if (eventDate !== undefined) {
            if (!isValidDateInput(eventDate)) return res.status(400).json({ success: false, message: "eventDate must be a valid date." });
            bill.eventDate = eventDate;
        }
        if (dueDate !== undefined) {
            if (!isValidDateInput(dueDate)) return res.status(400).json({ success: false, message: "dueDate must be a valid date." });
            bill.dueDate = dueDate;
        }
        if (notes !== undefined) bill.notes = notes.trim();
        if (venue !== undefined) bill.venue = venue.trim();
        if (guestCount !== undefined) bill.guestCount = guestCount.trim();

        if (status !== undefined) {
            const finalStatus = status.trim();
            if (!VALID_STATUSES.includes(finalStatus)) {
                return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` });
            }
            bill.status = finalStatus;
        }

        // Handle items and financials
        if (items !== undefined) {
            if (!Array.isArray(items) || items.length === 0) {
                return res.status(400).json({ success: false, message: "items must be a non-empty array." });
            }
            bill.items = items.map((item, index) => {
                const service = String(item?.service || "").trim();
                const deliverables = String(item?.deliverables || "").trim();
                const price = toMoney(item?.price, `items[${index}].price`);
                const quantity = Number(item?.quantity) || 1;
                const amount = toMoney(item?.amount, `items[${index}].amount`) || Number((price * quantity).toFixed(2));

                if (!service) throw new Error(`items[${index}].service is required.`);
                if (price === null) throw new Error(`items[${index}].price is required.`);
                return { service, deliverables, price, quantity, amount };
            });
        }

        const rawItems = typeof bill.items === "string" ? JSON.parse(bill.items) : bill.items;
        const computedSubtotal = Array.isArray(rawItems) ? rawItems.reduce((sum, item) => sum + (Number(item.amount) || Number(item.price) || 0), 0) : 0;
        bill.subtotal = Number(computedSubtotal.toFixed(2));
        bill.gstRate = toMoney(gstRate, "gstRate") ?? bill.gstRate;
        bill.taxAmount = Number(((bill.subtotal * bill.gstRate) / 100).toFixed(2));
        bill.totalAmount = Number((bill.subtotal + bill.taxAmount).toFixed(2));

        const newAdvancePaid = toMoney(advancePaid, "advancePaid");
        if (newAdvancePaid !== null) bill.advancePaid = newAdvancePaid;

        if (bill.advancePaid > bill.totalAmount) {
            return res.status(400).json({ success: false, message: "advancePaid cannot be greater than totalAmount." });
        }

        bill.balanceAmount = Number((bill.totalAmount - bill.advancePaid).toFixed(2));

        // Auto-update status if paid in full
        if (bill.balanceAmount <= 0 && bill.advancePaid > 0) {
            bill.status = "Paid";
        } else if (bill.advancePaid > 0 && bill.balanceAmount > 0 && bill.status === "Unpaid") {
            bill.status = "Partially Paid";
        }

        await bill.save();

        res.status(200).json({
            success: true,
            message: "Bill updated successfully.",
            data: mapBillResponse(bill),
        });

    } catch (error) {
        const clientErrors = ["items[", "must be a valid", "is required", "cannot be greater"];
        if (clientErrors.some((part) => error.message.includes(part))) {
            return res.status(400).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

// PATCH /api/bills/:id/status
exports.updateBillStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ success: false, message: "Status is required." });
        }

        const bill = await Bill.findByPk(id);
        if (!bill) {
            return res.status(404).json({ success: false, message: "Bill not found." });
        }

        const finalStatus = status.trim();
        if (!VALID_STATUSES.includes(finalStatus)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
            });
        }

        bill.status = finalStatus;

        // Optionally adjust balance based on status? We'll just update status as requested.
        await bill.save();

        res.status(200).json({
            success: true,
            message: `Bill status updated to ${finalStatus}.`,
            data: mapBillResponse(bill),
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/bills/:id/pdf
exports.downloadBillPDF = async (req, res) => {
    try {
        const { id } = req.params;
        const bill = await Bill.findByPk(id);

        if (!bill) {
            return res.status(404).json({ success: false, message: "Bill not found." });
        }

        const billData = mapBillResponse(bill);

        // Find associated quotation for extra fields (venue, guestCount)
        if (bill.quotationId) {
            const quotation = await Quotation.findByPk(bill.quotationId);
            if (quotation) {
                billData.venue = bill.venue || quotation.venue;
                billData.guestCount = bill.guestCount || quotation.guestCount;
            }
        } else {
            billData.venue = bill.venue;
            billData.guestCount = bill.guestCount;
        }

        const pdfBuffer = await generateBillPDF(billData);

        const fileName = `Bill_${bill.invoiceNumber || id}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error("PDF Generation Error:", error);
        res.status(500).json({ success: false, message: "Failed to generate PDF.", error: error.message });
    }
};
// DELETE /api/bills/:id
exports.deleteBill = async (req, res) => {
    try {
        const { id } = req.params;
        const bill = await Bill.findByPk(id);

        if (!bill) {
            return res.status(404).json({ success: false, message: "Bill not found." });
        }

        await bill.destroy();

        res.status(200).json({
            success: true,
            message: "Bill deleted successfully.",
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
