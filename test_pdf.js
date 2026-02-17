const fs = require('fs');
const path = require('path');
const pdfLib = require('pdf-parse');

const filePath = path.join(__dirname, 'docs', 'RT Nemosine.pdf');

async function testExtract() {
    try {
        const dataBuffer = fs.readFileSync(filePath);
        console.log(`File read. Size: ${dataBuffer.length} bytes.`);

        console.log('Trying pdfLib.PDFParse(dataBuffer)...');
        try {
            const data = await pdfLib.PDFParse(dataBuffer);
            console.log('Success with pdfLib.PDFParse!');
            console.log('Text:', data.text.substring(0, 100));
            return;
        } catch (e) {
            console.log('Failed pdfLib.PDFParse:', e.message);
        }

        console.log('Trying new pdfLib.PDFParse(dataBuffer)...');
        try {
            const instance = new pdfLib.PDFParse(dataBuffer);
            // maybe it has a method?
            console.log('Instance created. Keys:', Object.keys(instance));
        } catch (e) {
            console.log('Failed new pdfLib.PDFParse:', e.message);
        }

    } catch (error) {
        console.error('Fatal error:', error);
    }
}

testExtract();
