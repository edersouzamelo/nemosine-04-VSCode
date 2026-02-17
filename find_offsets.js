const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'docs_content.txt');

try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    console.log(`Total lines: ${lines.length}`);

    lines.forEach((line, index) => {
        if (line.includes('=== FILE:')) {
            if (line.includes('Codex') || line.includes('Arquitetura Mínima') || line.includes('Escopos e Limites')) {
                console.log(`${index + 1}: ${line}`);
            }
        }
    });

} catch (error) {
    console.error('Error reading file:', error);
}
