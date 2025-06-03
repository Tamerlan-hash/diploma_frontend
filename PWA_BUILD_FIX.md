# PWA Build Fix

This document provides instructions on how to fix the PWA (Progressive Web App) build for the Diploma Frontend application.

## Issue

The PWA build is failing because the required icon files are missing in the `public/icons` directory. The PWA requires the following icon files:

- `icon-192x192.png` (192x192 pixels)
- `icon-384x384.png` (384x384 pixels)
- `icon-512x512.png` (512x512 pixels)

These icons are referenced in the `manifest.json` file and are required for the PWA to work properly.

## Solution

A script has been created to generate the required PWA icon files from the icon.png file in the public/icons directory. Follow these steps to fix the PWA build:

### Option 1: Using the Provided Script (Recommended)

1. Install the required dependencies:
   ```bash
   npm install
   ```

2. Run the icon generation script:
   ```bash
   npm run generate-pwa-icons
   ```

3. Verify that the icon files have been created in the `public/icons` directory:
   - `icon-192x192.png`
   - `icon-384x384.png`
   - `icon-512x512.png`

4. Build the PWA:
   ```bash
   npm run build
   ```

### Option 2: Manual Creation

If the script doesn't work for any reason, you can manually create the icon files:

1. Use an image editor to create resized versions of an image (preferably a square image) with the following dimensions:
   - 192x192 pixels
   - 384x384 pixels
   - 512x512 pixels
2. Save these files in the `public/icons` directory with the following names:
   - `icon-192x192.png`
   - `icon-384x384.png`
   - `icon-512x512.png`
3. Build the PWA:
   ```bash
   npm run build
   ```

## Verification

To verify that the PWA is working correctly:

1. Build and start the application:
   ```bash
   npm run build
   npm run start
   ```

2. Open the application in a browser (Chrome or Edge recommended).

3. Check for the install icon in the browser's address bar.

4. Click on it to install the PWA and verify that it can be installed and launched as a standalone application.

## Troubleshooting

If you encounter any issues:

1. Check the browser console for errors related to the PWA, manifest, or service worker.

2. Verify that the icon files exist in the correct location and have the correct names.

3. Clear the browser's cache and reload the application.

4. Ensure that the PWA configuration in `next.config.ts` has `disable: false` to enable PWA in all environments.
