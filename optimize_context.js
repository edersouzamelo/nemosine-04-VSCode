const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'app', 'data', 'system_context.ts');

function cleanText(text) {
    if (!text) return '';
    return text
        .replace(/Disponível em: https:\/\/zenodo\.org\/communities\/sistema-nemosine\/[\s\S]*?\d+/g, '') // Remove footer with page number
        .replace(/Whitepaper Técnico [—|\|] [a-zA-Z0-9\s—–\-]+/g, '') // Remove header
        .replace(/Copyright © 2025[\s\S]*?Todos os direitos reservados\./g, '') // Remove copyright block
        .replace(/É proibida a reprodução[\s\S]*?edersouzamelo@gmail\.com/g, '') // Remove warning block
        .replace(/Melo, Edervaldo José de Souza\.[\s\S]*?CDD: 3 – Sistemas\./g, '') // Remove citation block
        .replace(/Como citar este documento:[\s\S]*?ISBN/g, '') // Remove citation instruction
        .replace(/^\s*\d+\s*$/gm, '') // Remove isolated page numbers
        .replace(/\n\s*\n/g, '\n') // Collapse multiple newlines
        .trim();
}

try {
    const content = fs.readFileSync(targetPath, 'utf8');

    // Split the content carefully using the known export constants
    const constitutionStart = content.indexOf('export const CONSTITUTION_TEXT = `');
    const codexStart = content.indexOf('export const CODEX_NOUS_TEXT = `');
    const atlasStart = content.indexOf('export const ATLAS_NOUS_TEXT = `');

    if (constitutionStart === -1 || codexStart === -1 || atlasStart === -1) {
        throw new Error('Could not find all export constants');
    }

    const constitutionPart = content.substring(0, codexStart);
    let codexPart = content.substring(codexStart, atlasStart);
    let atlasPart = content.substring(atlasStart);

    // Context inside backticks
    const codexContent = codexPart.replace('export const CODEX_NOUS_TEXT = `', '').replace(/`;\s*$/, '');
    const atlasContent = atlasPart.replace('export const ATLAS_NOUS_TEXT = `', '').replace(/`;\s*$/, '');

    // Clean only Codex and Atlas
    console.log(`Original Codex Length: ${codexContent.length}`);
    console.log(`Original Atlas Length: ${atlasContent.length}`);

    const cleanCodex = cleanText(codexContent);
    const cleanAtlas = cleanText(atlasContent);

    console.log(`Cleaned Codex Length: ${cleanCodex.length}`);
    console.log(`Cleaned Atlas Length: ${cleanAtlas.length}`);

    // Reconstruct file
    const newContent = `${constitutionPart}export const CODEX_NOUS_TEXT = \`
${cleanCodex}
\`;

export const ATLAS_NOUS_TEXT = \`
${cleanAtlas}
\`;
`;

    fs.writeFileSync(targetPath, newContent);
    console.log('Successfully optimized system_context.ts');

} catch (err) {
    console.error('Error optimizing context:', err);
}
