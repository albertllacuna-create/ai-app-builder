const fs = require('fs');
let c = fs.readFileSync('src/index.css', 'utf-8');

const reps = {
    '--background: #09090b;': '--background: #f8fafc;',
    '--foreground: #fafafa;': '--foreground: #0f172a;',
    '--surface: rgba(24, 24, 27, 0.7);': '--surface: rgba(255, 255, 255, 0.7);',
    '--surface-hover: rgba(39, 39, 42, 0.8);': '--surface-hover: rgba(241, 245, 249, 0.8);',
    '--surface-border: rgba(255, 255, 255, 0.08);': '--surface-border: rgba(0, 0, 0, 0.08);',
    'background: #27272a;': 'background: #cbd5e1;',
    'background: #3f3f46;': 'background: #94a3b8;',
    'background: rgba(0, 0, 0, 0.2);': 'background: rgba(0, 0, 0, 0.05);',
    'color: #e4e4e7;': 'color: #334155;',
    'color: #a1a1aa;': 'color: #64748b;',
    'background: rgba(255, 255, 255, 0.05);': 'background: rgba(0, 0, 0, 0.04);',
    'background: rgba(255, 255, 255, 0.1);': 'background: rgba(0, 0, 0, 0.08);',
    'border: 2px dashed rgba(255, 255, 255, 0.1);': 'border: 2px dashed rgba(0, 0, 0, 0.15);',
    'border-color: rgba(255, 255, 255, 0.3);': 'border-color: rgba(0, 0, 0, 0.3);',
    'background: rgba(255, 255, 255, 0.02);': 'background: rgba(0, 0, 0, 0.02);',
    'background: rgba(24, 24, 27, 0.9);': 'background: rgba(255, 255, 255, 0.95);',
    'background: rgba(24, 24, 27, 0.6);': 'background: rgba(255, 255, 255, 0.8);',
    'background: rgba(0, 0, 0, 0.3);': 'background: rgba(0, 0, 0, 0.08);',
    'color: #c4b5fd;': 'color: #6d28d9;',
    'background: rgba(24, 24, 27, 0.95);': 'background: rgba(255, 255, 255, 0.95);'
};

for (const [k, v] of Object.entries(reps)) {
    c = c.split(k).join(v);
}

fs.writeFileSync('src/index.css', c);
console.log('Done');
