const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

const generateQuotationPDF = async (quotationData) => {
    // 1. Resolve paths
    const templatePath = path.join(__dirname, 'quotation.ejs');
    const cssPath = path.join(__dirname, 'quotation.css');

    // 2. Read template and CSS
    const templateHTML = fs.readFileSync(templatePath, 'utf8');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    // 3. Render EJS with data and injected CSS
    const htmlContent = ejs.render(templateHTML, {
        ...quotationData,
        css: cssContent
    });

    // 4. Launch Puppeteer and generate PDF
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: 'new'
    });

    const page = await browser.newPage();
    
    // Set content and wait for network/fonts to load
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // Ensure A4 formatting perfectly matches
    const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: "0", right: "0", bottom: "0", left: "0" }
    });

    await browser.close();

    return pdfBuffer;
};

module.exports = { generateQuotationPDF };
