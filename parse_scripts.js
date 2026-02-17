const fs = require('fs');

const content = fs.readFileSync('presentation_scripts.txt', 'utf8');
const lines = content.split('\n');

const scripts = {};
let currentPersona = null;
let currentScript = [];

// Regex to identify the start of a script
// Examples: "🎙️ Roteiro – O Adjunto", "🎥 Roteiro – A Dor", "🎙️ Roteiro do Confessor"
const headerRegex = /(?:🎙️|🎥)\s*Roteiro\s*(?:–|do|da|-)\s*(.+)/i;

lines.forEach(line => {
    const trimmed = line.trim();
    const match = headerRegex.exec(trimmed);

    if (match) {
        // Save previous
        if (currentPersona) {
            scripts[currentPersona] = currentScript.join('\n').trim();
        }

        // Start new
        let rawName = match[1].trim();
        // Clean up name (remove " (versão...)", "O ", "A ", etc if needed)
        // The entities.ts names are "Adjunto", "Advogado", etc.
        // The file has "O Adjunto", "A Dor", "O Arqueólogo (versão...)"

        let name = rawName.split('(')[0].trim(); // Remove parentheticals
        if (name.startsWith('O ')) name = name.substring(2);
        if (name.startsWith('A ')) name = name.substring(2);

        // Manual fixups for specific names in entities.ts vs text file
        if (name === "Bobo") name = "Bobo da Corte";
        if (name === "Confessor") name = "Confessor 2.0";
        if (name === "Orquestrador") name = "Orquestrador-Arquiteto";

        currentPersona = name;
        currentScript = [];
    } else if (currentPersona) {
        // Append line to current script
        if (trimmed.length > 0) {
            currentScript.push(trimmed);
        }
    }
});

// Save last one
if (currentPersona) {
    scripts[currentPersona] = currentScript.join('\n').trim();
}

console.log(JSON.stringify(scripts, null, 2));
fs.writeFileSync('parsed_scripts.json', JSON.stringify(scripts, null, 2));
