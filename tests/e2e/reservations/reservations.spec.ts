import { expect } from '@playwright/test';
import { test } from '../fixtures/auth.fixture';

test.describe('Reservation Management', () => {
  // Use the authenticated page for all tests
  test.use({ authenticatedPage: true });
  
  // Helper function to create a reservation
  async function createReservation(page) {
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
    
    // Wait for success message
    await page.waitForSelector('div[style*="color: green"]');
  }
  
  test('should display user reservations', async ({ authenticatedPage: page }) => {
    // First create a reservation
    await createReservation(page);
    
    // Navigate to my reservations page
    await page.goto('/parking/my-reservations');
    
    // Check that reservations are displayed
    await expect(page.locator('h1:has-text("Мои бронирования")')).toBeVisible();
    
    // Check that at least one reservation is displayed
    const reservationCount = await page.locator('.reservation-item').count();
    expect(reservationCount).toBeGreaterThan(0);
    
    // Check that reservation details are displayed
    await expect(page.locator('.reservation-item')).toContainText('Парковочное место');
    await expect(page.locator('.reservation-item')).toContainText('Время начала');
    await expect(page.locator('.reservation-item')).toContainText('Время окончания');
    await expect(page.locator('.reservation-item')).toContainText('Статус');
  });
  
  test('should allow viewing reservation details', async ({ authenticatedPage: page }) => {
    // Navigate to my reservations page
    await page.goto('/parking/my-reservations');
    
    // Click on the first reservation
    await page.click('.reservation-item');
    
    // Check that reservation details page is displayed
    await expect(page.locator('h1:has-text("Детали бронирования")')).toBeVisible();
    
    // Check that reservation details are displayed
    await expect(page.locator('.reservation-details')).toContainText('Парковочное место');
    await expect(page.locator('.reservation-details')).toContainText('Время начала');
    await expect(page.locator('.reservation-details')).toContainText('Время окончания');
    await expect(page.locator('.reservation-details')).toContainText('Статус');
    await expect(page.locator('.reservation-details')).toContainText('Цена');
  });
  
  test('should allow canceling a reservation', async ({ authenticatedPage: page }) => {
    // First create a reservation
    await createReservation(page);
    
    // Navigate to my reservations page
    await page.goto('/parking/my-reservations');
    
    // Click on the first reservation
    await page.click('.reservation-item');
    
    // Check that reservation details page is displayed
    await expect(page.locator('h1:has-text("Детали бронирования")')).toBeVisible();
    
    // Click on the cancel button
    await page.click('button:has-text("Отменить бронирование")');
    
    // Confirm cancellation in the dialog
    await page.click('button:has-text("Да, отменить")');
    
    // Check for success message
    await expect(page.locator('div[style*="color: green"]')).toBeVisible();
    await expect(page.locator('div[style*="color: green"]')).toContainText('Бронирование успешно отменено');
    
    // Check that the status is updated to "cancelled"
    await expect(page.locator('.reservation-status')).toContainText('cancelled');
  });
  
  test('should allow activating a reservation', async ({ authenticatedPage: page }) => {
    // Navigate to my reservations page
    await page.goto('/parking/my-reservations');
    
    // Find a pending reservation
    const pendingReservation = page.locator('.reservation-item:has-text("pending")').first();
    
    // Click on the pending reservation
    await pendingReservation.click();
    
    // Check that reservation details page is displayed
    await expect(page.locator('h1:has-text("Детали бронирования")')).toBeVisible();
    
    // Click on the activate button
    await page.click('button:has-text("Активировать")');
    
    // Check for success message
    await expect(page.locator('div[style*="color: green"]')).toBeVisible();
    await expect(page.locator('div[style*="color: green"]')).toContainText('Бронирование успешно активировано');
    
    // Check that the status is updated to "active"
    await expect(page.locator('.reservation-status')).toContainText('active');
  });
  
  test('should allow making a payment for a reservation', async ({ authenticatedPage: page }) => {
    // Navigate to my reservations page
    await page.goto('/parking/my-reservations');
    
    // Click on the first reservation
    await page.click('.reservation-item');
    
    // Check that reservation details page is displayed
    await expect(page.locator('h1:has-text("Детали бронирования")')).toBeVisible();
    
    // Click on the pay button
    await page.click('button:has-text("Оплатить")');
    
    // Check that payment form is displayed
    await expect(page.locator('h2:has-text("Оплата бронирования")')).toBeVisible();
    
    // Fill out payment form
    await page.fill('input[placeholder="Номер карты"]', '4242424242424242');
    await page.fill('input[placeholder="Имя владельца"]', 'Test User');
    await page.fill('input[placeholder="MM/YY"]', '12/25');
    await page.fill('input[placeholder="CVC"]', '123');
    
    // Submit payment form
    await page.click('button:has-text("Оплатить")');
    
    // Check for success message
    await expect(page.locator('div[style*="color: green"]')).toBeVisible();
    await expect(page.locator('div[style*="color: green"]')).toContainText('Оплата успешно выполнена');
    
    // Check that payment status is updated
    await expect(page.locator('.payment-status')).toContainText('completed');
  });
});