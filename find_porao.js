const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'docs_content.txt');

try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    console.log('Searching for "Porão"...');
    let count = 0;
    lines.forEach((line, index) => {
        if (line.includes('Porão')) {
            console.log(`${index + 1}: ${line.trim()}`);
            count++;
            if (count > 20) return; // Limit output
        }
    });

} catch (error) {
    console.error('Error reading file:', error);
}
