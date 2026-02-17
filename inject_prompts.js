const fs = require('fs');
const path = require('path');

const promptsFile = path.join(__dirname, 'prompts.json');
const entitiesFile = path.join(__dirname, 'app', 'data', 'entities.ts');

try {
    const prompts = JSON.parse(fs.readFileSync(promptsFile, 'utf8'));
    let entitiesContent = fs.readFileSync(entitiesFile, 'utf8');

    // 1. Ensure interface has prompt field
    if (!entitiesContent.includes('prompt?: string;')) {
        console.log('Adding prompt field to interface...');
        entitiesContent = entitiesContent.replace(
            'script?: string;',
            'script?: string;\n    prompt?: string;'
        );
    }

    // 2. Prepare the new constant
    const promptEntries = Object.entries(prompts).map(([name, text]) => {
        let cleanName = name.replace(/^[0-9.]+\s*/, '').trim();

        // Escape backticks and standard JS escapes
        const safeText = text
            .replace(/\\/g, '\\\\') // escape backslashes first
            .replace(/`/g, '\\`')   // escape backticks
            .replace(/\$/g, '\\$'); // escape template literal vars

        return `    "${cleanName}": \`${safeText}\``;
    }).join(',\n');

    const newPromptsConst = `const PERSONA_PROMPTS: Record<string, string> = {\n${promptEntries}\n};`;

    // 3. Replace or Insert the constant
    // We look for the existing constant pattern
    const regex = /const PERSONA_PROMPTS: Record<string, string> = \{[\s\S]*?\};/;

    if (regex.test(entitiesContent)) {
        console.log('Replacing existing PERSONA_PROMPTS constant...');
        entitiesContent = entitiesContent.replace(regex, newPromptsConst);
    } else {
        console.log('Inserting new PERSONA_PROMPTS constant...');
        // Insert before ENTITIES export
        entitiesContent = entitiesContent.replace(
            'export const ENTITIES',
            `${newPromptsConst}\n\nexport const ENTITIES`
        );
    }

    // 4. Ensure ENTITIES map uses it
    if (!entitiesContent.includes('prompt: PERSONA_PROMPTS[p]')) {
        console.log('Updating ENTITIES map logic...');
        // Match the mapping section. It usually looks like:
        // script: PERSONA_SCRIPTS[p] || ...
        // We want to add prompt: PERSONA_PROMPTS[p] after it.
        entitiesContent = entitiesContent.replace(
            /script: PERSONA_SCRIPTS\[p\](\|\| "")?,/g,
            'script: PERSONA_SCRIPTS[p] || "",\n        prompt: PERSONA_PROMPTS[p],'
        );
        // Fallback if the regex doesn't match exact format (e.g. strict vs loose)
        if (!entitiesContent.includes('prompt: PERSONA_PROMPTS[p]')) {
            entitiesContent = entitiesContent.replace(
                'script: PERSONA_SCRIPTS[p]',
                'script: PERSONA_SCRIPTS[p],\n        prompt: PERSONA_PROMPTS[p]'
            );
        }
    }

    fs.writeFileSync(entitiesFile, entitiesContent);
    console.log('Successfully updated entities.ts');

} catch (error) {
    console.error('Error updating entities:', error);
}
