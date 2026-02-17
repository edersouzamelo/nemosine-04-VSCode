const fs = require('fs');
const path = require('path');

const promptsFile = path.join(__dirname, 'prompts.json');
const entitiesFile = path.join(__dirname, 'app', 'data', 'entities.ts');

try {
    const prompts = JSON.parse(fs.readFileSync(promptsFile, 'utf8'));
    let entitiesContent = fs.readFileSync(entitiesFile, 'utf8');

    // 1. Add 'prompt?: string;' to interface
    if (!entitiesContent.includes('prompt?: string;')) {
        entitiesContent = entitiesContent.replace(
            'script?: string;',
            'script?: string;\n    prompt?: string;'
        );
    }

    // 2. Add PERSONA_PROMPTS constant
    const promptEntries = Object.entries(prompts).map(([name, text]) => {
        // clean name further if needed
        let cleanName = name.replace(/^[0-9.]+\s*/, '').trim(); // Remove numbering "1. Mentor"
        // escape backticks in text
        const safeText = text.replace(/`/g, '\\`').replace(/\$/g, '\\$');
        return `    "${cleanName}": \`${safeText}\``;
    }).join(',\n');

    const promptsConst = `\nconst PERSONA_PROMPTS: Record<string, string> = {\n${promptEntries}\n};\n`;

    // 3. Insert constant before ENTITIES export
    if (!entitiesContent.includes('const PERSONA_PROMPTS')) {
        entitiesContent = entitiesContent.replace(
            'export const ENTITIES',
            `${promptsConst}\nexport const ENTITIES`
        );
    }

    // 4. Update ENTITIES map to include prompt
    // This is tricky with regex, so we'll do simplistic replace for now or better, 
    // we just use the map at runtime? 
    // Actually, let's inject it into the ENTITIES map generation.
    // The current entities.ts likely has a loop or map. Let's look at how it helps.

    // Looking at previous file content of entities.ts:
    // width: 800, height: 600, ...
    // ...
    // script: PERSONA_SCRIPTS[p] || ...

    if (!entitiesContent.includes('prompt: PERSONA_PROMPTS[p]')) {
        entitiesContent = entitiesContent.replace(
            'script: PERSONA_SCRIPTS[p]',
            'script: PERSONA_SCRIPTS[p],\n        prompt: PERSONA_PROMPTS[p]'
        );
    }

    fs.writeFileSync(entitiesFile, entitiesContent);
    console.log('Successfully updated entities.ts');

} catch (error) {
    console.error('Error updating entities:', error);
}
