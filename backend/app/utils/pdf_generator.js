const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function generatePDF() {
    const htmlPath = process.argv[2];
    const outputPath = process.argv[3];

    if (!htmlPath || !outputPath) {
        console.error('Usage: node pdf_generator.js <html_file> <output_pdf>');
        process.exit(1);
    }

    try {
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        
        await page.pdf({
            path: outputPath,
            format: 'A4',
            printBackground: true,
            margin: {
                top: '0px',
                right: '0px',
                bottom: '0px',
                left: '0px'
            }
        });

        await browser.close();
        console.log('PDF generated successfully');
    } catch (error) {
        console.error('Error generating PDF:', error);
        process.exit(1);
    }
}

generatePDF();
