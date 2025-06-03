# PWA Testing Guide

This document provides instructions on how to test the Progressive Web App (PWA) functionality of the Diploma Frontend application.

## Prerequisites

Before testing the PWA, make sure you have:

1. Generated the required PWA icon files:
   ```bash
   npm run generate-pwa-icons
   ```

2. Generated the required screenshot files:
   ```bash
   npm run generate-screenshots
   ```

Alternatively, you can run both commands at once:
```bash
npm run setup-pwa
```

## Building and Starting the Application

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the application:
   ```bash
   npm run start
   ```

## Testing PWA Functionality

### 1. Check the Manifest

1. Open the application in Chrome or Edge
2. Open DevTools (F12 or right-click and select "Inspect")
3. Go to the "Application" tab
4. Select "Manifest" in the left sidebar
5. Verify that:
   - All icons are loading correctly (no 404 errors)
   - The manifest has the correct fields (id, name, short_name, description, start_url, display, icons, screenshots)
   - There are no errors or warnings related to the manifest

### 2. Check PWA Installation

1. Look for the install icon in the browser's address bar
2. Click on it to install the PWA
3. Verify that the PWA can be installed and launched as a standalone application
4. Check that the correct icon is displayed for the installed application

### 3. Verify Desktop and Mobile Compatibility

#### Desktop:
1. Install the PWA on a desktop device
2. Verify that it opens in a standalone window
3. Check that the application functions correctly in standalone mode

#### Mobile (or Mobile Emulation):
1. Open the application on a mobile device or use Chrome's device emulation
2. Install the PWA
3. Verify that it opens in fullscreen or standalone mode
4. Check that the application functions correctly in this mode

## Troubleshooting

If you encounter any issues:

1. Check the browser console for errors related to the PWA, manifest, or service worker
2. Verify that all required files exist:
   - Icon files in public/icons directory
   - Screenshot files in public/screenshots directory
   - manifest.json in public directory
3. Clear the browser's cache and reload the application
4. Ensure that the PWA configuration in next.config.ts has `disable: false` to enable PWA in all environments

## Expected Results

After completing all the steps above, you should have:
- No errors or warnings in the Manifest section of DevTools
- A successfully installed PWA on both desktop and mobile devices
- Correct icons displayed for the installed application
- A functional standalone application experience