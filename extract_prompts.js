const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

const promptsDir = path.join(__dirname, 'active_prompts');
const outputFile = path.join(__dirname, 'prompts.json');

async function extractPrompts() {
    const files = fs.readdirSync(promptsDir).filter(file => file.endsWith('.docx'));
    const prompts = {};

    console.log(`Found ${files.length} .docx files.`);

    for (const file of files) {
        console.log(`Processing ${file}...`);
        const filePath = path.join(promptsDir, file);

        try {
            const result = await mammoth.extractRawText({ path: filePath });
            const text = result.value;

            // Clean filename to get persona name (remove emojis and extension)
            // Example: "⚔️ O Vingador.docx" -> "O Vingador"
            // Example: "O Mentor.docx" -> "O Mentor"
            let personaName = file.replace('.docx', '').trim();

            // Remove emojis (simple regex for range of symbols)
            personaName = personaName.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '').trim();

            prompts[personaName] = text.trim();
        } catch (error) {
            console.error(`Error processing ${file}:`, error);
        }
    }

    fs.writeFileSync(outputFile, JSON.stringify(prompts, null, 2));
    console.log(`Extraction complete. Saved to ${outputFile}`);
}

extractPrompts();
