/**
 * Script to create sample screenshots for PWA
 *
 * This script copies existing images from the public/images directory
 * and resizes them to create sample screenshots for desktop and mobile views.
 *
 * Requirements:
 * - Node.js
 * - sharp package (install with: npm install sharp)
 *
 * Usage:
 * 1. Install dependencies: npm install sharp
 * 2. Run this script: node scripts/create-screenshots.js
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Paths
const imagesDir = path.join(__dirname, '..', 'public', 'images');
const screenshotsDir = path.join(__dirname, '..', 'public', 'screenshots');

// Ensure screenshots directory exists
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function createScreenshots() {
  try {
    // Create desktop screenshot (wide form factor)
    await sharp(path.join(imagesDir, 'parking.jpg'))
      .resize(1280, 720)
      .toFile(path.join(screenshotsDir, 'screenshot-desktop.png'));

    console.log('Created desktop screenshot (1280x720)');

    // Create mobile screenshot (narrow form factor)
    await sharp(path.join(imagesDir, 'parking.jpg'))
      .resize(750, 1334)
      .toFile(path.join(screenshotsDir, 'screenshot-mobile.png'));

    console.log('Created mobile screenshot (750x1334)');

    console.log('\nScreenshots created successfully!');
    console.log('You can now build your PWA application.');
  } catch (error) {
    console.error('Error creating screenshots:', error);

    console.log('\nManual instructions:');
    console.log('1. Create the following screenshot files:');
    console.log('   - screenshot-desktop.png (1280x720 pixels)');
    console.log('   - screenshot-mobile.png (750x1334 pixels)');
    console.log('2. Save these files in the public/screenshots directory');
  }
}

createScreenshots();
