# Test info

- Name: Authentication >> should allow user to login
- Location: C:\Users\dzhur\Desktop\Diploma\diploma_frontend\tests\e2e\auth\auth.spec.ts:34:7

# Error details

```
Error: browserType.launch: Executable doesn't exist at C:\Users\dzhur\AppData\Local\ms-playwright\webkit-2158\Playwright.exe
╔═════════════════════════════════════════════════════════════════════════╗
║ Looks like Playwright Test or Playwright was just installed or updated. ║
║ Please run the following command to download new browsers:              ║
║                                                                         ║
║     npx playwright install                                              ║
║                                                                         ║
║ <3 Playwright Team                                                      ║
╚═════════════════════════════════════════════════════════════════════════╝
```

# Test source

```ts
   1 | import { expect } from '@playwright/test';
   2 | import { test, TEST_USER, login, register } from '../fixtures/auth.fixture';
   3 |
   4 | test.describe('Authentication', () => {
   5 |   test('should allow user to register', async ({ page }) => {
   6 |     // Generate a unique username to avoid conflicts
   7 |     const uniqueUsername = `testuser_${Date.now()}`;
   8 |     
   9 |     await page.goto('/auth/signup');
   10 |     
   11 |     // Check that the registration form is displayed
   12 |     await expect(page.locator('h1')).toContainText('Регистрация');
   13 |     
   14 |     // Fill out the registration form
   15 |     await page.fill('input[placeholder="Username"]', uniqueUsername);
   16 |     await page.fill('input[placeholder="Email"]', `${uniqueUsername}@example.com`);
   17 |     await page.fill('input[placeholder="Password"]', TEST_USER.password);
   18 |     await page.fill('input[placeholder="Номер машины"]', TEST_USER.carNumber);
   19 |     await page.fill('input[placeholder="Модель машины"]', TEST_USER.carModel);
   20 |     
   21 |     // Submit the form
   22 |     await page.click('button[type="submit"]');
   23 |     
   24 |     // Wait for navigation to home page after successful registration
   25 |     await page.waitForURL('/', { timeout: 10000 });
   26 |     
   27 |     // Verify we're on the home page
   28 |     await expect(page).toHaveURL('/');
   29 |     
   30 |     // Verify user is logged in (check for profile link in header)
   31 |     await expect(page.locator('a[href="/profile"]')).toBeVisible();
   32 |   });
   33 |   
>  34 |   test('should allow user to login', async ({ page }) => {
      |       ^ Error: browserType.launch: Executable doesn't exist at C:\Users\dzhur\AppData\Local\ms-playwright\webkit-2158\Playwright.exe
   35 |     await page.goto('/auth/login');
   36 |     
   37 |     // Check that the login form is displayed
   38 |     await expect(page.locator('form')).toBeVisible();
   39 |     
   40 |     // Fill out the login form
   41 |     await page.fill('input[placeholder="Username"]', TEST_USER.username);
   42 |     await page.fill('input[placeholder="Password"]', TEST_USER.password);
   43 |     
   44 |     // Submit the form
   45 |     await page.click('button[type="submit"]');
   46 |     
   47 |     // Wait for navigation to home page after successful login
   48 |     await page.waitForURL('/', { timeout: 10000 });
   49 |     
   50 |     // Verify we're on the home page
   51 |     await expect(page).toHaveURL('/');
   52 |     
   53 |     // Verify user is logged in (check for profile link in header)
   54 |     await expect(page.locator('a[href="/profile"]')).toBeVisible();
   55 |   });
   56 |   
   57 |   test('should display error message for invalid login', async ({ page }) => {
   58 |     await page.goto('/auth/login');
   59 |     
   60 |     // Fill out the login form with invalid credentials
   61 |     await page.fill('input[placeholder="Username"]', 'invaliduser');
   62 |     await page.fill('input[placeholder="Password"]', 'invalidpassword');
   63 |     
   64 |     // Submit the form
   65 |     await page.click('button[type="submit"]');
   66 |     
   67 |     // Check for error message
   68 |     await expect(page.locator('p[style*="color: red"]')).toBeVisible();
   69 |     await expect(page.locator('p[style*="color: red"]')).toContainText('Invalid credentials');
   70 |   });
   71 |   
   72 |   test('should allow user to view and edit profile', async ({ authenticatedPage: page }) => {
   73 |     // Navigate to profile page
   74 |     await page.goto('/profile');
   75 |     
   76 |     // Check that the profile page is displayed
   77 |     await expect(page.locator('h1')).toContainText('Мой профиль');
   78 |     
   79 |     // Check that user information is displayed
   80 |     await expect(page.locator('div:has-text("Имя пользователя:")')).toBeVisible();
   81 |     await expect(page.locator('div:has-text("Email:")')).toBeVisible();
   82 |     
   83 |     // Click edit button
   84 |     await page.click('button:has-text("Редактировать")');
   85 |     
   86 |     // Check that edit form is displayed
   87 |     await expect(page.locator('form')).toBeVisible();
   88 |     
   89 |     // Update profile information
   90 |     const newEmail = `updated_${Date.now()}@example.com`;
   91 |     const newCarNumber = 'XYZ789';
   92 |     const newCarModel = 'Updated Model';
   93 |     
   94 |     await page.fill('input[type="email"]', newEmail);
   95 |     await page.fill('input[value*="ABC123"]', newCarNumber);
   96 |     await page.fill('input[value*="Test Model"]', newCarModel);
   97 |     
   98 |     // Submit the form
   99 |     await page.click('button[type="submit"]:has-text("Сохранить")');
  100 |     
  101 |     // Check for success message
  102 |     await expect(page.locator('p[style*="color: green"]')).toBeVisible();
  103 |     await expect(page.locator('p[style*="color: green"]')).toContainText('Профиль успешно обновлен');
  104 |     
  105 |     // Verify updated information is displayed
  106 |     await expect(page.locator(`div:has-text("Email:") >> nth=0`)).toContainText(newEmail);
  107 |     await expect(page.locator(`div:has-text("Номер машины:") >> nth=0`)).toContainText(newCarNumber);
  108 |     await expect(page.locator(`div:has-text("Модель машины:") >> nth=0`)).toContainText(newCarModel);
  109 |   });
  110 | });
```