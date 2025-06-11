const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

// PNG template path (in project root)
const TEMPLATE_PATH = path.join(__dirname, '../Blue Modern Certificate of Completion.png');

/**
 * Generate a certificate PDF with the user's name and certificate number.
 * @param {string} userName - The name to print on the certificate.
 * @param {string} certificateNumber - The certificate number (optional, can be printed small).
 * @returns {Promise<Buffer>} - The PDF file as a Buffer.
 */
async function generateCertificatePDF(userName, certificateNumber) {
  // Read PNG template
  const pngImageBytes = fs.readFileSync(TEMPLATE_PATH);
  console.log('[CERTIFICATE PDF] PNG template size:', pngImageBytes.length, 'bytes');
  if (!pngImageBytes || pngImageBytes.length === 0) {
    throw new Error('PNG template file is missing or empty!');
  }

  // PNG dimensions (A4 at 150dpi): 1754x1240
  const width = 1754;
  const height = 1240;

  // Create a new PDF
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([width, height]);

  // Embed the PNG
  const pngImage = await pdfDoc.embedPng(pngImageBytes);
  page.drawImage(pngImage, { x: 0, y: 0, width, height });

  // Draw the user's name (centered, large font)
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontSize = 64;
  const textWidth = font.widthOfTextAtSize(userName, fontSize);
  const nameX = (width - textWidth) / 2;
  const nameY = 600; // Adjust this Y value as needed for your template
  page.drawText(userName, {
    x: nameX,
    y: nameY,
    size: fontSize,
    font,
    color: rgb(0.1, 0.2, 0.3), // dark blue/black
  });

  // Draw the certificate number (small, bottom right)
  if (certificateNumber) {
    const certFontSize = 18;
    page.drawText(`Certificate #: ${certificateNumber}`, {
      x: width - 350,
      y: 40,
      size: certFontSize,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
  }

  // Return PDF as Buffer
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

module.exports = { generateCertificatePDF }; 