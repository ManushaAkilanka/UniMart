import { test, expect } from '@playwright/test';

test.describe('Navbar Functionality & Dark Mode Audit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('Navbar brand logo links to home page', async ({ page }) => {
    const logoLink = page.locator('header a[aria-label="UniMart home"]').first();
    await expect(logoLink).toBeVisible();
    await logoLink.click();
    await expect(page).toHaveURL('/');
  });

  test('Navigation links navigate correctly', async ({ page }) => {
    // Desktop nav links
    const browseLink = page.locator('header nav a:has-text("Browse")').first();
    await browseLink.click();
    await expect(page).toHaveURL(/\/browse/);

    const categoriesLink = page.locator('header nav a:has-text("Categories")').first();
    await categoriesLink.click();
    await expect(page).toHaveURL(/\/categories/);

    const wantedLink = page.locator('header nav a:has-text("Wanted")').first();
    await wantedLink.click();
    await expect(page).toHaveURL(/\/browse\?listingType=wanted/);

    const freeLink = page.locator('header nav a:has-text("Free Items")').first();
    await freeLink.click();
    await expect(page).toHaveURL(/\/browse\?listingType=free/);
  });

  test('Global search submits and navigates with search query', async ({ page }) => {
    const searchInput = page.locator('header input[placeholder*="Search textbooks"]').first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill('laptop');
    await searchInput.press('Enter');
    await expect(page).toHaveURL(/\/browse\?search=laptop/);
  });

  test('Logged-out click on Post Listing redirects to /login with state', async ({ page }) => {
    const postListingBtn = page.locator('header a:has-text("Post Listing")').first();
    await postListingBtn.click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('Sign In and Register buttons navigate correctly', async ({ page }) => {
    const signInBtn = page.locator('header a:has-text("Sign In")').first();
    await expect(signInBtn).toBeVisible();
    await signInBtn.click();
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/');
    const registerBtn = page.locator('header a:has-text("Register")').first();
    await expect(registerBtn).toBeVisible();
    await registerBtn.click();
    await expect(page).toHaveURL(/\/register/);
  });

  test('Theme toggle toggles dark class and persists across reload', async ({ page }) => {
    const themeBtn = page.locator('header button[aria-label*="mode"]').first();
    await expect(themeBtn).toBeVisible();

    // Determine initial state
    const isInitiallyDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    );

    // Click toggle
    await themeBtn.click();

    // Verify state flipped
    const isFlippedDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    );
    expect(isFlippedDark).toBe(!isInitiallyDark);

    // Verify localStorage persistence
    const storedTheme = await page.evaluate(() => localStorage.getItem('theme'));
    expect(storedTheme).toBe(isFlippedDark ? 'dark' : 'light');

    // Reload page
    await page.reload();

    // Verify state persisted after reload
    const isPersistedDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    );
    expect(isPersistedDark).toBe(isFlippedDark);
  });

  test('Mobile drawer opens and closes properly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const hamburger = page.locator('button[aria-label="Toggle navigation menu"]');
    await expect(hamburger).toBeVisible();

    // Open drawer
    await hamburger.click();
    const drawerLink = page.locator('header div.lg\\:hidden a:has-text("Browse")').first();
    await expect(drawerLink).toBeVisible();

    // Close on Escape
    await page.keyboard.press('Escape');
    await expect(drawerLink).not.toBeVisible();
  });
});
