const Bill = require("../models/Bill");
const Quotation = require("../models/Quotation");

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
    return {
        ...data,
        subtotal: Number(data.subtotal),
        gstRate: Number(data.gstRate),
        taxAmount: Number(data.taxAmount),
        totalAmount: Number(data.totalAmount),
        advancePaid: Number(data.advancePaid),
        balanceAmount: Number(data.balanceAmount),
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
            subtotal,
            gstRate,
            taxAmount,
            totalAmount,
            advancePaid,
            balanceAmount,
            dueDate,
            status,
            notes,
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

            if (!service) {
                throw new Error(`items[${index}].service is required.`);
            }
            if (price === null) {
                throw new Error(`items[${index}].price is required.`);
            }

            return { service, deliverables, price };
        });

        const computedSubtotal = normalizedItems.reduce((sum, item) => sum + Number(item.price), 0);
        const finalSubtotal = toMoney(subtotal, "subtotal") ?? Number(computedSubtotal.toFixed(2));
        const finalGstRate = toMoney(gstRate, "gstRate") ?? 18;
        const finalTaxAmount = toMoney(taxAmount, "taxAmount") ?? Number(((finalSubtotal * finalGstRate) / 100).toFixed(2));
        const finalTotalAmount = toMoney(totalAmount, "totalAmount") ?? Number((finalSubtotal + finalTaxAmount).toFixed(2));
        const finalAdvancePaid = toMoney(advancePaid, "advancePaid") ?? 0;
        const finalBalanceAmount = toMoney(balanceAmount, "balanceAmount") ?? Number((finalTotalAmount - finalAdvancePaid).toFixed(2));

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
