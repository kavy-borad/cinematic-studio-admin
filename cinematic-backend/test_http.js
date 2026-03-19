const http = require('http');
const fs = require('fs');

function test() {
    const billId = 1; // From check_db_bills results
    console.log(`Testing PDF for ID ${billId}`);
    http.get(`http://localhost:5000/api/bills/${billId}/pdf`, (pdfRes) => {
        if (pdfRes.statusCode !== 200) {
            console.error(`Status Error: ${pdfRes.statusCode}`);
            let body = '';
            pdfRes.on('data', c => body += c);
            pdfRes.on('end', () => console.log("Error Body:", body));
            return;
        }
        const chunks = [];
        pdfRes.on('data', chunk => chunks.push(chunk));
        pdfRes.on('end', () => {
            const buffer = Buffer.concat(chunks);
            fs.writeFileSync('test_download.pdf', buffer);
            console.log(`Saved ${buffer.length} bytes to test_download.pdf`);
        });
    }).on('error', e => console.error("PDF Error", e));
}

test();
