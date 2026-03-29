import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf-8');
const lines = envContent.split('\n');
let apiKey = '';
for (const line of lines) {
    if (line.startsWith('VITE_GEMINI_API_KEY=')) {
        apiKey = line.split('=')[1].trim();
    }
}

async function fetchModels() {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    if (data.models) {
        let result = "Modelos:\n";
        data.models.forEach(model => {
            if (model.name.includes("gemini") && model.supportedGenerationMethods?.includes("generateContent")) {
                result += `- ${model.name}\n`;
            }
        });
        fs.writeFileSync('models.txt', result, 'utf-8');
        console.log("Done");
    } else {
        console.error("Error from API:", data);
    }
}

fetchModels();
