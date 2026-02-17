const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'app', 'data', 'system_context.ts');

function cleanTextLines(text) {
    if (!text) return '';

    const lines = text.split('\n');
    const cleanedLines = lines.filter(line => {
        const trimmed = line.trim();
        if (!trimmed) return false;

        // Filter out page footers/headers
        if (trimmed.includes('Disponível em:') && trimmed.includes('zenodo.org')) return false;
        if (trimmed.includes('Whitepaper Técnico')) return false;
        if (trimmed.includes('Copyright ©')) return false;
        if (trimmed.includes('Todos os direitos reservados')) return false;
        if (trimmed.includes('É proibida a reprodução')) return false;
        if (trimmed.includes('Melo, Edervaldo José de Souza')) return false;
        if (trimmed.includes('Como citar este documento')) return false;
        if (trimmed.includes('ISBN')) return false;

        // Filter out pure numbers (page numbers)
        if (/^\d+$/.test(trimmed)) return false;

        return true;
    });

    // Join with space to collapse paragraphs, but keep some structure?
    // Actually, joining with newline is safer for now to avoid merging header/content.
    // But to save tokens, we should try to merge lines that are part of the same sentence.
    // For now, let's just filter lines. That alone saves 10-20% of lines.
    return cleanedLines.join('\n');
}

try {
    const content = fs.readFileSync(targetPath, 'utf8');

    // Split the content carefully
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
    // Atlas part continues to end of file, remove the closing tick and semicolon
    const atlasContent = atlasPart.replace('export const ATLAS_NOUS_TEXT = `', '').replace(/`;\s*$/, '');

    console.log(`Current Codex Length: ${codexContent.length}`);
    console.log(`Current Atlas Length: ${atlasContent.length}`);

    const cleanCodex = cleanTextLines(codexContent);
    const cleanAtlas = cleanTextLines(atlasContent);

    console.log(`New Codex Length: ${cleanCodex.length}`);
    console.log(`New Atlas Length: ${cleanAtlas.length}`);

    // Reconstruct file
    const newContent = `${constitutionPart}export const CODEX_NOUS_TEXT = \`
${cleanCodex}
\`;

export const ATLAS_NOUS_TEXT = \`
${cleanAtlas}
\`;
`;

    fs.writeFileSync(targetPath, newContent);
    console.log('Successfully optimized system_context.ts (V2)');

} catch (err) {
    console.error('Error optimizing context:', err);
}
