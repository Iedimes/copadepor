const fs = require('fs');
const path = 'src/app/tournaments/[id]/page.tsx';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');
console.log('Total lines before:', lines.length);
// Lines in view_file are 1-indexed. 
// So line 608 is index 607.
// Line 650 is index 649.
const newLines = lines.filter((_, i) => i < 607 || i >= 650);
console.log('Total lines after:', newLines.length);
fs.writeFileSync(path, newLines.join('\n'), 'utf8');
