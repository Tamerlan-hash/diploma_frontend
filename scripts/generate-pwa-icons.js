/**
 * Script to generate PWA icons from source image
 * 
 * This script provides instructions for generating the required PWA icon files
 * from an existing image file.
 * 
 * Requirements:
 * - Node.js
 * - sharp package (install with: npm install sharp)
 * 
 * Usage:
 * 1. Install dependencies: npm install sharp
 * 2. Run this script: node scripts/generate-pwa-icons.js
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Paths
const sourceImagePath = path.join(__dirname, '..', 'public', 'icons', 'icon.png');
const iconsDir = path.join(__dirname, '..', 'public', 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Icon sizes to generate
const sizes = [192, 384, 512];

async function generateIcons() {
  try {
    // Generate icons in different sizes directly from source image
    for (const size of sizes) {
      const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);

      await sharp(sourceImagePath)
        .resize(size, size)
        .toFile(outputPath);

      console.log(`Generated ${size}x${size} icon at: ${outputPath}`);
    }

    console.log('\nPWA icons generated successfully!');
    console.log('You can now build your PWA application.');
  } catch (error) {
    console.error('Error generating PWA icons:', error);

    console.log('\nManual instructions:');
    console.log('1. Use an image editor to create the following icon sizes:');
    console.log('   - icon-192x192.png (192x192 pixels)');
    console.log('   - icon-384x384.png (384x384 pixels)');
    console.log('   - icon-512x512.png (512x512 pixels)');
    console.log('2. Save these files in the public/icons directory');
  }
}

generateIcons();
