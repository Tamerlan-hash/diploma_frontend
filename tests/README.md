# E2E Tests

This directory contains end-to-end tests for the Smart Parking application using Playwright.

## Structure

- `e2e/` - End-to-end tests
  - `auth/` - Authentication tests (login, registration, profile)
  - `map/` - Map functionality tests (viewing, selecting spots, booking)
  - `reservations/` - Reservation management tests (viewing, canceling, payments)
  - `fixtures/` - Test fixtures and utilities

## Running Tests

To run the tests, you need to have the application running locally. You can use the following commands:

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install

# Run all tests
npm run test:e2e

# Run tests with UI
npm run test:e2e:ui

# Run tests in debug mode
npm run test:e2e:debug

# Run specific test file
npx playwright test tests/e2e/auth/auth.spec.ts
```

## Test Coverage

The tests cover the following functionality:

### Authentication
- User registration
- User login
- Invalid login handling
- Profile viewing and editing

### Map Functionality
- Map loading and display
- Parking spot selection
- Reservation creation
- Error handling for invalid booking times
- Canceling the booking form

### Reservation Management
- Viewing reservations
- Viewing reservation details
- Canceling reservations
- Activating reservations
- Making payments for reservations

## CI/CD Integration

The tests are integrated with GitHub Actions and run automatically on push to the main branch and on pull requests. The test reports are uploaded as artifacts and can be viewed in the GitHub Actions UI.

## Adding New Tests

To add new tests:

1. Create a new test file in the appropriate directory
2. Import the necessary fixtures and utilities
3. Write your tests using the Playwright API
4. Run the tests to ensure they pass

Example:

```typescript
import { expect } from '@playwright/test';
import { test } from '../fixtures/auth.fixture';

test.describe('New Feature', () => {
  test('should do something', async ({ page }) => {
    // Your test code here
  });
});
```