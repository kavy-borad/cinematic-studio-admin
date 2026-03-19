const axios = require('axios');
const fs = require('fs');

async function testEndpoint() {
    try {
        console.log("Fetching bills...");
        const billsRes = await axios.get('http://localhost:5000/api/bills');
        const bills = billsRes.data.data;
        
        if (bills && bills.length > 0) {
            const billId = bills[0].id;
            const invoiceNo = bills[0].invoiceNumber;
            console.log(`Testing PDF generation for Bill ID: ${billId} (${invoiceNo})`);
            
            const pdfRes = await axios.get(`http://localhost:5000/api/bills/${billId}/pdf`, {
                responseType: 'arraybuffer',
                timeout: 30000
            });
            
            fs.writeFileSync('test_download.pdf', pdfRes.data);
            console.log("PDF saved to test_download.pdf. Success!");
        } else {
            console.log("No bills found to test.");
        }
    } catch (error) {
        console.error("Error during test:", error.message);
        if (error.response) {
            console.error("Response data:", error.response.data.toString());
        }
    }
}

testEndpoint();
