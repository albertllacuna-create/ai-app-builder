const texts = [
    '<code_changes>\n/src/components/Currency.tsx\n```tsx\nexport default function Currency() {}\n```\n</code_changes>',
    'Aqui tienes:\n### `/src/App.tsx`\n```tsx\nimport x from "y"\n```',
    '**Archivo: /src/utils.ts**\n\n```typescript\nconst z = 1;\n```',
    '/src/styles.css\n```css\nbody { color: red; }\n```'
];

console.log("--- CURRENT REGEX ---");
const currentRegex = /^(\/[a-zA-Z0-9_./-]+)\s*\n```[^\n]*\n([\s\S]*?)^```/gm;
texts.forEach((t, i) => {
    const norm = t.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    let match;
    console.log('Test ' + i + ':');
    while ((match = currentRegex.exec(norm)) !== null) {
        console.log("  MATCH:", match[1]);
    }
});

console.log("\n--- NEW REGEX ---");
const newRegex = /(?:^|\n)[^\/\n]*(\/[a-zA-Z0-9_./-]+)[^\n]*\n+```[a-zA-Z0-9]*\n([\s\S]*?)\n```/g;
texts.forEach((t, i) => {
    const norm = t.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    let match;
    console.log('Test ' + i + ':');
    while ((match = newRegex.exec(norm)) !== null) {
        console.log("  MATCH:", match[1]);
    }
});
