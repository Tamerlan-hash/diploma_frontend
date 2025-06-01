import { expect } from '@playwright/test';
import { test } from '../fixtures/auth.fixture';

test.describe('Map Functionality', () => {
  // Use the authenticated page for all tests
  test.use({ authenticatedPage: true });

  test('should display map with parking spots', async ({ authenticatedPage: page }) => {
    // Navigate to map page
    await page.goto('/map');

    // Wait for map to load
    await page.waitForSelector('.leaflet-container', { timeout: 10000 });

    // Check that map container is visible
    await expect(page.locator('.leaflet-container')).toBeVisible();

    // Check that parking spots are displayed (polygons)
    await expect(page.locator('.leaflet-overlay-pane path')).toBeVisible();

    // Check that at least one parking spot is displayed
    const spotCount = await page.locator('.leaflet-overlay-pane path').count();
    expect(spotCount).toBeGreaterThan(0);
  });

  test('should allow selecting a parking spot', async ({ authenticatedPage: page }) => {
    // Navigate to map page
    await page.goto('/map');

    // Wait for map to load
    await page.waitForSelector('.leaflet-container', { timeout: 10000 });

    // Find a free parking spot (green polygon)
    const freeSpot = page.locator('.leaflet-overlay-pane path[stroke="green"]').first();

    // Click on the free parking spot
    await freeSpot.click();

    // Check that booking form appears
    await expect(page.locator('h3:has-text("Бронирование парковочного места")')).toBeVisible();

    // Check that form has start and end time inputs
    await expect(page.locator('input[type="datetime-local"]')).toHaveCount(2);

    // Check that booking and cancel buttons are displayed
    await expect(page.locator('button:has-text("Забронировать")')).toBeVisible();
    await expect(page.locator('button:has-text("Отмена")')).toBeVisible();
  });

  test('should create a reservation when booking form is submitted', async ({ authenticatedPage: page }) => {
    // Navigate to map page
    await page.goto('/map');

    // Wait for map to load
    await page.waitForSelector('.leaflet-container', { timeout: 10000 });

    // Find a free parking spot (green polygon)
    const freeSpot = page.locator('.leaflet-overlay-pane path[stroke="green"]').first();

    // Click on the free parking spot
    await freeSpot.click();

    // Wait for booking form to appear
    await page.waitForSelector('h3:has-text("Бронирование парковочного места")');

    // Get the current date and time
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    // Format dates for input
    const startTime = oneHourLater.toISOString().slice(0, 16);
    const endTime = twoHoursLater.toISOString().slice(0, 16);

    // Fill out the booking form
    await page.fill('input[type="datetime-local"]:nth-child(1)', startTime);
    await page.fill('input[type="datetime-local"]:nth-child(2)', endTime);

    // Submit the form
    await page.click('button[type="submit"]:has-text("Забронировать")');

    // Check for success message
    await expect(page.locator('div[style*="color: green"]')).toBeVisible();
    await expect(page.locator('div[style*="color: green"]')).toContainText('Бронирование успешно создано');
  });

  test('should show error for invalid booking times', async ({ authenticatedPage: page }) => {
    // Navigate to map page
    await page.goto('/map');

    // Wait for map to load
    await page.waitForSelector('.leaflet-container', { timeout: 10000 });

    // Find a free parking spot (green polygon)
    const freeSpot = page.locator('.leaflet-overlay-pane path[stroke="green"]').first();

    // Click on the free parking spot
    await freeSpot.click();

    // Wait for booking form to appear
    await page.waitForSelector('h3:has-text("Бронирование парковочного места")');

    // Get the current date and time
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    // Format dates for input (end time before start time)
    const startTime = oneHourLater.toISOString().slice(0, 16);
    const endTime = now.toISOString().slice(0, 16);

    // Fill out the booking form with invalid times
    await page.fill('input[type="datetime-local"]:nth-child(1)', startTime);
    await page.fill('input[type="datetime-local"]:nth-child(2)', endTime);

    // Submit the form
    await page.click('button[type="submit"]:has-text("Забронировать")');

    // Check for error message
    await expect(page.locator('div[style*="color: red"]')).toBeVisible();
    await expect(page.locator('div[style*="color: red"]')).toContainText('Время окончания должно быть позже времени начала');
  });

  test('should close booking form when cancel button is clicked', async ({ authenticatedPage: page }) => {
    // Navigate to map page
    await page.goto('/map');

    // Wait for map to load
    await page.waitForSelector('.leaflet-container', { timeout: 10000 });

    // Find a free parking spot (green polygon)
    const freeSpot = page.locator('.leaflet-overlay-pane path[stroke="green"]').first();

    // Click on the free parking spot
    await freeSpot.click();

    // Wait for booking form to appear
    await page.waitForSelector('h3:has-text("Бронирование парковочного места")');

    // Click the cancel button
    await page.click('button:has-text("Отмена")');

    // Check that booking form is no longer visible
    await expect(page.locator('h3:has-text("Бронирование парковочного места")')).not.toBeVisible();
  });

  test('should handle GMT+6 timezone correctly for past time validation', async ({ authenticatedPage: page }) => {
    // Navigate to map page
    await page.goto('/map');

    // Wait for map to load
    await page.waitForSelector('.leaflet-container', { timeout: 10000 });

    // Find a free parking spot (green polygon)
    const freeSpot = page.locator('.leaflet-overlay-pane path[stroke="green"]').first();

    // Click on the free parking spot
    await freeSpot.click();

    // Wait for booking form to appear
    await page.waitForSelector('h3:has-text("Бронирование парковочного места")');

    // Get the current date and time
    const now = new Date();

    // Create a date that's in the past in GMT+6 timezone
    // First convert to GMT+6 by adding 6 hours
    const gmt6Now = new Date(now.getTime() + (6 * 60 * 60 * 1000 - now.getTimezoneOffset() * 60 * 1000));
    // Then create a time 30 minutes in the past
    const pastTime = new Date(gmt6Now.getTime() - 30 * 60 * 1000);
    // And a future time for the end time
    const futureTime = new Date(gmt6Now.getTime() + 60 * 60 * 1000);

    // Format dates for input
    const pastTimeStr = pastTime.toISOString().slice(0, 16);
    const futureTimeStr = futureTime.toISOString().slice(0, 16);

    // Fill out the booking form with past start time
    await page.fill('input[type="datetime-local"]:nth-child(1)', pastTimeStr);
    await page.fill('input[type="datetime-local"]:nth-child(2)', futureTimeStr);

    // Submit the form
    await page.click('button[type="submit"]:has-text("Забронировать")');

    // Check for error message about past time
    await expect(page.locator('div[style*="color: red"]')).toBeVisible();
    await expect(page.locator('div[style*="color: red"]')).toContainText('Время начала не может быть в прошлом');
  });
});
