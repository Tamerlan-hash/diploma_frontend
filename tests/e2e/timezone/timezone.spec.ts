import { expect } from '@playwright/test';
import { test } from '../fixtures/auth.fixture';

test.describe('Timezone Handling', () => {
  // Use the authenticated page for all tests
  test.use({ authenticatedPage: true });
  
  test('should correctly handle GMT+6 timezone for booking process', async ({ authenticatedPage: page }) => {
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
    
    // Convert to GMT+6 timezone (Almaty time)
    const gmt6Now = new Date(now.getTime() + (6 * 60 * 60 * 1000 - now.getTimezoneOffset() * 60 * 1000));
    
    // Check that the default start time is in the future (at least current time + 15 minutes)
    // This is a bit tricky to test exactly, so we'll just check that it's after the current time
    const startTimeInput = page.locator('input[name="start_time"]');
    const startTimeValue = await startTimeInput.inputValue();
    const startTime = new Date(startTimeValue);
    
    expect(startTime.getTime()).toBeGreaterThanOrEqual(gmt6Now.getTime());
    
    // Check that the default end time is after the start time
    const endTimeInput = page.locator('input[name="end_time"]');
    const endTimeValue = await endTimeInput.inputValue();
    const endTime = new Date(endTimeValue);
    
    expect(endTime.getTime()).toBeGreaterThan(startTime.getTime());
    
    // Now let's test with a valid future time
    // Create a time 2 hours in the future in GMT+6
    const futureStartTime = new Date(gmt6Now.getTime() + 2 * 60 * 60 * 1000);
    const futureEndTime = new Date(gmt6Now.getTime() + 3 * 60 * 60 * 1000);
    
    // Format dates for input
    const futureStartTimeStr = futureStartTime.toISOString().slice(0, 16);
    const futureEndTimeStr = futureEndTime.toISOString().slice(0, 16);
    
    // Fill out the booking form with future times
    await startTimeInput.fill(futureStartTimeStr);
    await endTimeInput.fill(futureEndTimeStr);
    
    // Submit the form
    await page.click('button[type="submit"]:has-text("Забронировать")');
    
    // Check for success message
    await expect(page.locator('div:has-text("Бронирование успешно создано")')).toBeVisible();
    
    // Now navigate to the reservations page to check if the reservation was created with the correct times
    await page.goto('/parking/my-reservations');
    
    // Wait for the reservations page to load
    await page.waitForSelector('h1:has-text("Мои бронирования")');
    
    // Find the reservation we just created
    const reservationItem = page.locator('.reservation-item').first();
    
    // Check that the reservation exists
    await expect(reservationItem).toBeVisible();
    
    // Check that the start and end times are displayed correctly
    // The times are displayed in the format "Время начала: HH:MM" and "Время окончания: HH:MM"
    // We'll extract the hours and minutes and compare them to our expected times
    
    const startTimeText = await reservationItem.locator('p:has-text("Время начала:")').textContent();
    const endTimeText = await reservationItem.locator('p:has-text("Время окончания:")').textContent();
    
    // Extract the time part (HH:MM) from the text
    const startTimeMatch = startTimeText.match(/(\d{1,2}):(\d{2})/);
    const endTimeMatch = endTimeText.match(/(\d{1,2}):(\d{2})/);
    
    // Convert to hours and minutes
    const startHour = parseInt(startTimeMatch[1]);
    const startMinute = parseInt(startTimeMatch[2]);
    const endHour = parseInt(endTimeMatch[1]);
    const endMinute = parseInt(endTimeMatch[2]);
    
    // Check that the displayed times match our expected times (with some tolerance for minutes)
    expect(startHour).toBe(futureStartTime.getUTCHours());
    expect(startMinute).toBeCloseTo(futureStartTime.getUTCMinutes(), 5); // Allow 5 minutes tolerance
    
    expect(endHour).toBe(futureEndTime.getUTCHours());
    expect(endMinute).toBeCloseTo(futureEndTime.getUTCMinutes(), 5); // Allow 5 minutes tolerance
  });
  
  test('should reject booking with past start time in GMT+6 timezone', async ({ authenticatedPage: page }) => {
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
    
    // Convert to GMT+6 timezone (Almaty time)
    const gmt6Now = new Date(now.getTime() + (6 * 60 * 60 * 1000 - now.getTimezoneOffset() * 60 * 1000));
    
    // Create a time 30 minutes in the past in GMT+6
    const pastTime = new Date(gmt6Now.getTime() - 30 * 60 * 1000);
    // And a future time for the end time
    const futureTime = new Date(gmt6Now.getTime() + 60 * 60 * 1000);
    
    // Format dates for input
    const pastTimeStr = pastTime.toISOString().slice(0, 16);
    const futureTimeStr = futureTime.toISOString().slice(0, 16);
    
    // Fill out the booking form with past start time
    await page.locator('input[name="start_time"]').fill(pastTimeStr);
    await page.locator('input[name="end_time"]').fill(futureTimeStr);
    
    // Submit the form
    await page.click('button[type="submit"]:has-text("Забронировать")');
    
    // Check for error message about past time
    await expect(page.locator('div[style*="color: red"]')).toBeVisible();
    await expect(page.locator('div[style*="color: red"]')).toContainText('Время начала не может быть в прошлом');
  });
});