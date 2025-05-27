import { expect } from '@playwright/test';
import { test, TEST_USER, login, register } from '../fixtures/auth.fixture';

test.describe('Authentication', () => {
  test('should allow user to register', async ({ page }) => {
    // Generate a unique username to avoid conflicts
    const uniqueUsername = `testuser_${Date.now()}`;
    
    await page.goto('/auth/signup');
    
    // Check that the registration form is displayed
    await expect(page.locator('h1')).toContainText('Регистрация');
    
    // Fill out the registration form
    await page.fill('input[placeholder="Username"]', uniqueUsername);
    await page.fill('input[placeholder="Email"]', `${uniqueUsername}@example.com`);
    await page.fill('input[placeholder="Password"]', TEST_USER.password);
    await page.fill('input[placeholder="Номер машины"]', TEST_USER.carNumber);
    await page.fill('input[placeholder="Модель машины"]', TEST_USER.carModel);
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Wait for navigation to home page after successful registration
    await page.waitForURL('/', { timeout: 10000 });
    
    // Verify we're on the home page
    await expect(page).toHaveURL('/');
    
    // Verify user is logged in (check for profile link in header)
    await expect(page.locator('a[href="/profile"]')).toBeVisible();
  });
  
  test('should allow user to login', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Check that the login form is displayed
    await expect(page.locator('form')).toBeVisible();
    
    // Fill out the login form
    await page.fill('input[placeholder="Username"]', TEST_USER.username);
    await page.fill('input[placeholder="Password"]', TEST_USER.password);
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Wait for navigation to home page after successful login
    await page.waitForURL('/', { timeout: 10000 });
    
    // Verify we're on the home page
    await expect(page).toHaveURL('/');
    
    // Verify user is logged in (check for profile link in header)
    await expect(page.locator('a[href="/profile"]')).toBeVisible();
  });
  
  test('should display error message for invalid login', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Fill out the login form with invalid credentials
    await page.fill('input[placeholder="Username"]', 'invaliduser');
    await page.fill('input[placeholder="Password"]', 'invalidpassword');
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Check for error message
    await expect(page.locator('p[style*="color: red"]')).toBeVisible();
    await expect(page.locator('p[style*="color: red"]')).toContainText('Invalid credentials');
  });
  
  test('should allow user to view and edit profile', async ({ authenticatedPage: page }) => {
    // Navigate to profile page
    await page.goto('/profile');
    
    // Check that the profile page is displayed
    await expect(page.locator('h1')).toContainText('Мой профиль');
    
    // Check that user information is displayed
    await expect(page.locator('div:has-text("Имя пользователя:")')).toBeVisible();
    await expect(page.locator('div:has-text("Email:")')).toBeVisible();
    
    // Click edit button
    await page.click('button:has-text("Редактировать")');
    
    // Check that edit form is displayed
    await expect(page.locator('form')).toBeVisible();
    
    // Update profile information
    const newEmail = `updated_${Date.now()}@example.com`;
    const newCarNumber = 'XYZ789';
    const newCarModel = 'Updated Model';
    
    await page.fill('input[type="email"]', newEmail);
    await page.fill('input[value*="ABC123"]', newCarNumber);
    await page.fill('input[value*="Test Model"]', newCarModel);
    
    // Submit the form
    await page.click('button[type="submit"]:has-text("Сохранить")');
    
    // Check for success message
    await expect(page.locator('p[style*="color: green"]')).toBeVisible();
    await expect(page.locator('p[style*="color: green"]')).toContainText('Профиль успешно обновлен');
    
    // Verify updated information is displayed
    await expect(page.locator(`div:has-text("Email:") >> nth=0`)).toContainText(newEmail);
    await expect(page.locator(`div:has-text("Номер машины:") >> nth=0`)).toContainText(newCarNumber);
    await expect(page.locator(`div:has-text("Модель машины:") >> nth=0`)).toContainText(newCarModel);
  });
});