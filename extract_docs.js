const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const docsDir = path.join(__dirname, 'docs');
const outputFile = path.join(__dirname, 'docs_content.txt');

async function extractText() {
    const files = fs.readdirSync(docsDir).filter(file => file.endsWith('.pdf'));
    let fullText = '';

    console.log(`Found ${files.length} PDF files.`);

    for (const file of files) {
        console.log(`Processing ${file}...`);
        const filePath = path.join(docsDir, file);
        const dataBuffer = fs.readFileSync(filePath);

        try {
            const data = await pdf(dataBuffer);
            fullText += `\n\n=== FILE: ${file} ===\n\n`;
            fullText += data.text;
        } catch (error) {
            console.error(`Error processing ${file}:`, error);
            fullText += `\n\n=== ERROR READING ${file} ===\n\n`;
        }
    }

    fs.writeFileSync(outputFile, fullText);
    console.log(`Extraction complete. Saved to ${outputFile}`);
}

extractText();
