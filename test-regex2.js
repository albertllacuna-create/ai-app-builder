const fs = require('fs');
const text = `<code_changes>
/src/components/Calculator.tsx\r
\`\`\`tsx\r
import React from 'react';\r
\`\`\`\r
</code_changes>`;

console.log("TEXT:\n", JSON.stringify(text));

const regexList = [
    { name: "Original", regex: /\\/([a - zA - Z0 -9_.\/-]+)\\n```(?:[a-zA-Z]+)?\\n([\\s\\S]*?)```/g },
    { name: "My First Fix", regex: /\\/([a - zA - Z0 -9_.\/-]+)\\s*\\n```[^\\n]*\\n([\\s\\S]*?)```/g },
    { name: "New Fix", regex: /\\/([a - zA - Z0 -9_.\/-]+)[ \\t]*\\r?\\n```[^\\n]*\\n([^]*?)```/g },
];

regexList.forEach(item => {
    console.log("\\nTesting", item.name);
    let match;
    let found = false;
    while ((match = item.regex.exec(text)) !== null) {
        found = true;
        console.log("  MATCH:", match[1]);
        console.log("  CONTENT LENGTH:", match[2].length);
    }
    if (!found) console.log("  NO MATCH");
});
