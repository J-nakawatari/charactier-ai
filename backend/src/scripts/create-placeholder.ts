import path from 'path';
import fs from 'fs';

// Import sharp from backend
const sharp = require('sharp');

async function createPlaceholder() {
  const uploadsDir = path.join(__dirname, '../../../uploads');
  const placeholderPath = path.join(uploadsDir, 'placeholder.png');

  // Create uploads directory if it doesn't exist
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Create a simple placeholder image
  const svg = `
    <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="400" fill="#f0f0f0"/>
      <text x="50%" y="45%" font-family="Arial, sans-serif" font-size="24" fill="#999" text-anchor="middle">
        No Image
      </text>
      <text x="50%" y="55%" font-family="Arial, sans-serif" font-size="16" fill="#999" text-anchor="middle">
        Available
      </text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(placeholderPath);

  console.log(`✅ Placeholder image created at: ${placeholderPath}`);
}

createPlaceholder().catch(console.error);