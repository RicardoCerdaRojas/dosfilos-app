const fs = require('fs');
const file = '/Users/ricardocerda/dev/dosfilos-app/packages/web/src/components/faculty/FacultyDocumentEditor.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /const handleMouseDown = \(e: MouseEvent\) => {/,
    "const handleInteractionStart = (e: Event) => {"
);

content = content.replace(
    /document\.addEventListener\('mousedown', handleMouseDown, true\);/,
    "document.addEventListener('pointerdown', handleInteractionStart, true);\n        document.addEventListener('mousedown', handleInteractionStart, true);"
);

content = content.replace(
    /document\.removeEventListener\('mousedown', handleMouseDown, true\);/,
    "document.removeEventListener('pointerdown', handleInteractionStart, true);\n            document.removeEventListener('mousedown', handleInteractionStart, true);"
);

fs.writeFileSync(file, content);
