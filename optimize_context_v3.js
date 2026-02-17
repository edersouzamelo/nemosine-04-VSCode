const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'app', 'data', 'system_context.ts');

function compressSection(text) {
    if (!text) return '';
    const lines = text.split('\n');
    const processedLines = [];
    let currentBlock = [];

    // Regex to identify the start of a Persona or Place (e.g., "1 Mentor", "43 Psicólogo")
    // Some lines might be "1. ESTRATÉGICAS" -> we want to keep headers too?
    // Let's keep headers if they are uppercase.

    // Better strategy: 
    // If it looks like a Persona Start ("1 Name"), flush previous block, start new.
    // If it looks like a Section Header ("1. ESTRATÉGICAS"), flush, start new.
    // Else, append to current block.

    const itemStartRegex = /^(\d+)\s+([A-Za-zÀ-ÖØ-öø-ÿ].+)$/;
    const sectionHeaderRegex = /^\d+\.\s+[A-ZÁÉÍÓÚÃÕÇ]+/;

    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        if (sectionHeaderRegex.test(line)) {
            if (currentBlock.length > 0) {
                processedLines.push(currentBlock.join(' '));
                currentBlock = [];
            }
            processedLines.push(''); // Spacing
            processedLines.push(line);
        } else if (itemStartRegex.test(line)) {
            if (currentBlock.length > 0) {
                processedLines.push(currentBlock.join(' '));
                currentBlock = [];
            }
            currentBlock.push(line);
        } else {
            currentBlock.push(line);
        }
    }

    if (currentBlock.length > 0) {
        processedLines.push(currentBlock.join(' '));
    }

    return processedLines.join('\n');
}

try {
    const content = fs.readFileSync(targetPath, 'utf8');

    const constitutionStart = content.indexOf('export const CONSTITUTION_TEXT = `');
    const codexStart = content.indexOf('export const CODEX_NOUS_TEXT = `');
    const atlasStart = content.indexOf('export const ATLAS_NOUS_TEXT = `');

    if (constitutionStart === -1 || codexStart === -1 || atlasStart === -1) {
        throw new Error('Could not find all export constants');
    }

    const constitutionPart = content.substring(0, codexStart);
    let codexPart = content.substring(codexStart, atlasStart);
    let atlasPart = content.substring(atlasStart);

    const codexContent = codexPart.replace('export const CODEX_NOUS_TEXT = `', '').replace(/`;\s*$/, '');
    const atlasContent = atlasPart.replace('export const ATLAS_NOUS_TEXT = `', '').replace(/`;\s*$/, '');

    console.log(`V2 Codex Length: ${codexContent.length}`);
    console.log(`V2 Atlas Length: ${atlasContent.length}`);

    const compressedCodex = compressSection(codexContent);
    const compressedAtlas = compressSection(atlasContent);

    console.log(`V3 Codex Length: ${compressedCodex.length}`);
    console.log(`V3 Atlas Length: ${compressedAtlas.length}`);

    const newContent = `${constitutionPart}export const CODEX_NOUS_TEXT = \`
${compressedCodex}
\`;

export const ATLAS_NOUS_TEXT = \`
${compressedAtlas}
\`;
`;

    fs.writeFileSync(targetPath, newContent);
    console.log('Successfully optimized system_context.ts (V3)');

} catch (err) {
    console.error('Error optimizing context:', err);
}
