import { test as base } from '@playwright/test';
import { Page } from '@playwright/test';

// Define test user data
export const TEST_USER = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'password123',
  carNumber: 'ABC123',
  carModel: 'Test Model'
};

// Extend the base test with authentication helpers
export const test = base.extend({
  // Authenticated page
  authenticatedPage: async ({ page }, use) => {
    // Login before running the test
    await login(page, TEST_USER.username, TEST_USER.password);
    
    // Use the authenticated page
    await use(page);
    
    // Clean up (optional)
    await page.evaluate(() => {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    });
  }
});

// Helper function to login
export async function login(page: Page, username: string, password: string) {
  await page.goto('/auth/login');
  await page.fill('input[placeholder="Username"]', username);
  await page.fill('input[placeholder="Password"]', password);
  await page.click('button[type="submit"]');
  
  // Wait for navigation or success indicator
  await page.waitForURL('/', { timeout: 10000 });
}

// Helper function to register
export async function register(
  page: Page, 
  username: string, 
  email: string, 
  password: string, 
  carNumber: string, 
  carModel: string
) {
  await page.goto('/auth/signup');
  await page.fill('input[placeholder="Username"]', username);
  await page.fill('input[placeholder="Email"]', email);
  await page.fill('input[placeholder="Password"]', password);
  await page.fill('input[placeholder="Номер машины"]', carNumber);
  await page.fill('input[placeholder="Модель машины"]', carModel);
  await page.click('button[type="submit"]');
  
  // Wait for navigation or success indicator
  await page.waitForURL('/', { timeout: 10000 });
}