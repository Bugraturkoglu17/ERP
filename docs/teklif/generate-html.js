const fs = require('fs');
const { marked } = require('marked');

// Read markdown and CSS
const mdContent = fs.readFileSync('Ordinat Mühendislik ERP_Teklifi [08.07.2026].md', 'utf8');
const cssContent = fs.readFileSync('teklif-v2.css', 'utf8');

// Convert Markdown to HTML
const htmlContent = marked.parse(mdContent);

// Wrap in full HTML document
const finalHtml = `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Teklif Mektubu</title>
    <style>
        ${cssContent}
    </style>
</head>
<body>
    <img src="Golabs-logo.png" style="position: absolute; top: -15px; right: 40px; height: 75px; width: auto; z-index: 1000;" alt="Golabs Logo">
    ${htmlContent}
</body>
</html>
`;

fs.writeFileSync('Ordinat_Mühendislik_Teklif.html', finalHtml);
console.log('HTML başarıyla oluşturuldu.');
