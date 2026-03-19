const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

const toNumberSafe = (value, fallback = 0) => {
    const num = Number(String(value ?? '').replace(/,/g, '').trim());
    return Number.isFinite(num) ? num : fallback;
};

/**
 * Generates a PDF buffer for a bill
 * @param {Object} billData - The bill data object
 * @returns {Promise<Buffer>} - PDF buffer
 */
const generateBillPDF = async (billData) => {
    const normalizedItems = Array.isArray(billData.items) ? billData.items : [];
    const computedSubtotal = normalizedItems.reduce((sum, item) => {
        const price = toNumberSafe(item?.price, 0);
        const quantity = toNumberSafe(item?.quantity, 1) || 1;
        const amount = toNumberSafe(item?.amount, price * quantity);
        return sum + amount;
    }, 0);

    const normalizedGstRate = toNumberSafe(billData.gstRate, 0);
    const computedTaxAmount = Number(((computedSubtotal * normalizedGstRate) / 100).toFixed(2));
    const computedTotalAmount = Number((computedSubtotal + computedTaxAmount).toFixed(2));
    const normalizedAdvancePaid = toNumberSafe(billData.advancePaid, 0);
    const computedBalanceAmount = Number((computedTotalAmount - normalizedAdvancePaid).toFixed(2));

    // 1. Resolve paths
    const templatePath = path.join(__dirname, 'bill.ejs');
    console.log("[PDF] Starting generation for:", billData.invoiceNumber);

    // 2. Read template
    const templateHTML = fs.readFileSync(templatePath, 'utf8');

    // 3. Prepare data for EJS
    const formattedData = {
        invoiceNumber: billData.invoiceNumber,
        issueDate: new Date(billData.createdAt).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }),
        dueDate: billData.dueDate ? new Date(billData.dueDate).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }) : null,
        status: billData.status,
        client: {
            name: billData.clientName,
            email: billData.clientEmail,
            phone: billData.clientPhone,
            address: billData.clientAddress
        },
        event: {
            type: billData.eventType,
            date: billData.eventDate ? new Date(billData.eventDate).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            }) : null,
            venue: billData.venue,
            guestCount: billData.guestCount
        },
        items: normalizedItems,
        subtotal: computedSubtotal,
        gstRate: normalizedGstRate,
        taxAmount: computedTaxAmount,
        totalAmount: computedTotalAmount,
        advancePaid: normalizedAdvancePaid,
        balanceAmount: computedBalanceAmount,
        notes: billData.notes
    };

    // 4. Render EJS
    const htmlContent = ejs.render(templateHTML, formattedData);
    console.log("[PDF] Template rendered, launching browser...");

    // 5. Launch Puppeteer and generate PDF
    let browser;
    try {
        browser = await puppeteer.launch({
            executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
            headless: true
        });

        console.log("[PDF] Browser launched, creating page...");
        const page = await browser.newPage();

        // Set content and wait for network/fonts to load
        console.log("[PDF] Setting content...");
        await page.setContent(htmlContent, { waitUntil: 'networkidle2', timeout: 30000 });

        // Generate PDF with A4 format
        console.log("[PDF] Generating PDF buffer...");
        const pdfBuffer = await page.pdf({
            format: 'A4',
            preferCSSPageSize: true,
            printBackground: true,
            margin: { top: "0", right: "0", bottom: "0", left: "0" }
        });
        
        console.log("[PDF] Generation successful, buffer length:", pdfBuffer.length);
        await browser.close();
        return pdfBuffer;
    } catch (err) {
        console.error("[PDF] Error during PDF generation:", err);
        if (browser) await browser.close();
        throw err;
    }
};

module.exports = { generateBillPDF };
