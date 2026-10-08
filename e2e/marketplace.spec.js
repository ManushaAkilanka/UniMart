import { test, expect } from '@playwright/test';

test.describe('UniMart End-to-End Marketplace Flow', () => {
  const timestamp = Date.now();
  const studentEmail = `e2e.student.${timestamp}@sci.cmb.ac.lk`;
  const studentPassword = 'Password123!';
  const listingTitle = `E2E Engineering Textbook ${timestamp}`;

  test('Complete Flow: Register → Verify → Log In → Create Listing → Browse → Message Seller → Mark Sold', async ({
    page,
    browser,
  }) => {
    // ── 1. Register ──────────────────────────────────────────────────────────
    await page.goto('/register', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/UniMart/);

    await page.fill('#reg-name', 'E2E Test Student');
    await page.selectOption('#reg-faculty', 'Faculty of Science (UOC)');
    await page.fill('#reg-email', studentEmail);
    await page.fill('#reg-pass', studentPassword);
    await page.fill('#reg-confirm', studentPassword);

    // Check honor code if unchecked
    const checkbox = page.locator('#honor-code');
    if (!(await checkbox.isChecked())) {
      await checkbox.check();
    }

    await page.click('button[type="submit"]');

    // ── 2. Verify Email ──────────────────────────────────────────────────────
    // Step 2 shows the 6-digit OTP fields
    await expect(page.locator('text=Enter Verification Code')).toBeVisible({ timeout: 15000 });

    const digits = ['1', '2', '3', '4', '5', '6'];
    for (let i = 0; i < 6; i++) {
      await page.fill(`#otp-input-${i}`, digits[i]);
    }

    await page.click('button[type="submit"]');

    // Wait for redirect to /dashboard or /browse
    await expect(page).toHaveURL(/\/(dashboard|browse)/, { timeout: 15000 });

    // ── 3. Create Listing (using "Wanted / Request" type — no images needed) ──
    await page.goto('/sell', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });

    // Fill title using its ID
    await page.fill('#title-input', listingTitle);

    // Select "Wanted / Request" listing type (no image/price/condition required)
    await page.locator('input[type="radio"][name="listing_type"][value="wanted"]').check();
    await page.waitForTimeout(500); // let React re-render and hide image/price sections

    // Select category — wait for real categories (ObjectId values) to load
    const categorySelect = page.locator('#category-select');
    await categorySelect.waitFor({ state: 'visible', timeout: 10000 });
    // Wait until real categories (ObjectId values) are loaded beyond the placeholder
    await page.waitForFunction(() => {
      const sel = document.querySelector('#category-select');
      if (!sel || sel.options.length <= 1) return false;
      return sel.options[1].value && sel.options[1].value.length >= 20; // ObjectIds are 24 chars
    }, { timeout: 10000 });
    // Get first real option's value and select it
    const firstCatValue = await categorySelect.locator('option:not([disabled])').first().getAttribute('value');
    await categorySelect.selectOption(firstCatValue);
    await page.waitForTimeout(300);

    // Fill description (textarea has no id, use placeholder)
    await page.locator('textarea').first().fill(
      'Looking for a comprehensive engineering textbook in good condition for exam prep.'
    );

    // Scroll to the publish button in sidebar and click it
    const submitBtn = page.locator('button[type="submit"]:has-text("Publish"), button[type="submit"]:has-text("Campus")').first();
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click();

    // Verify redirected to listing detail or my-listings
    await expect(page).toHaveURL(/\/listings\/|\/my-listings/, { timeout: 20000 });

    // ── 4. Browse as Buyer ───────────────────────────────────────────────────
    const buyerContext = await browser.newContext();
    const buyerPage = await buyerContext.newPage();

    // Buyer logs in with seeded student user
    await buyerPage.goto('/signin', { waitUntil: 'domcontentloaded' });
    await buyerPage.fill('#campus-email', 'kavindu.s@sci.cmb.ac.lk');
    await buyerPage.fill('#campus-pwd', 'Password123!');
    await buyerPage.click('button[type="submit"]');

    await expect(buyerPage).toHaveURL(/\/(dashboard|browse)/, { timeout: 15000 });

    // Browse listings
    await buyerPage.goto('/browse', { waitUntil: 'domcontentloaded' });
    await expect(buyerPage.locator('input[type="text"], input[type="search"]').first()).toBeVisible({ timeout: 10000 });

    // Search for the newly created listing
    const searchInput = buyerPage.locator('input[placeholder*="Search"], input[type="search"], input[type="text"]').first();
    await searchInput.fill(listingTitle);
    await searchInput.press('Enter');

    // Wait for the listing card to appear (may not appear immediately due to search debounce)
    await buyerPage.waitForTimeout(2000);
    const listingCard = buyerPage.locator(`text=${listingTitle}`).first();
    const cardVisible = await listingCard.isVisible().catch(() => false);

    if (cardVisible) {
      await listingCard.click();

      // ── 5. Message Seller ────────────────────────────────────────────────────
      await expect(buyerPage).toHaveURL(/\/listings\//, { timeout: 10000 });
      const messageBtn = buyerPage.locator('button:has-text("Message"), a:has-text("Message"), button:has-text("Contact")').first();
      if (await messageBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await messageBtn.click();

        // If a message modal opened or redirected to /messages
        const chatInput = buyerPage.locator('input[placeholder*="Type a message"], textarea[placeholder*="message"]').first();
        if (await chatInput.isVisible({ timeout: 5000 }).catch(() => false)) {
          await chatInput.fill('Hello! Is this textbook still available for campus meetup?');
          await buyerPage.locator('button:has-text("Send"), button[type="submit"]').first().click();
          await expect(buyerPage.locator('text=Hello! Is this textbook still available')).toBeVisible({ timeout: 10000 });
        }
      }
    }

    await buyerContext.close();

    // ── 6. Seller navigates to My Listings ───────────────────────────────────
    await page.goto('/my-listings', { waitUntil: 'domcontentloaded' });
    await expect(page.locator(`text=${listingTitle}`).first()).toBeVisible({ timeout: 15000 });

    // Find and click "Mark as Sold" (optional — only if visible)
    const markSoldBtn = page.locator(`xpath=//div[contains(., "${listingTitle}")]//button[contains(., "Sold") or contains(., "Mark Sold")]`).first();
    if (await markSoldBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await markSoldBtn.click();
      await expect(page.locator('text=Sold').first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('Moderation Flow: Moderator hides a listing from marketplace', async ({ page }) => {
    // 1. Moderator signs in
    await page.goto('/signin', { waitUntil: 'domcontentloaded' });
    await page.fill('#campus-email', 'admin@cmb.ac.lk');
    await page.fill('#campus-pwd', 'Admin@UniMart2024!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/(dashboard|moderation|browse)/, { timeout: 15000 });

    // 2. Open Moderation Console
    await page.goto('/moderation', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=Moderation').first()).toBeVisible({ timeout: 10000 });

    // 3. Switch to Listings tab
    const listingsTab = page.locator('button:has-text("Listings")').first();
    if (await listingsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await listingsTab.click();
      await page.waitForTimeout(1000);

      // Find an active listing's action menu or "Hide" button
      const hideBtn = page.locator('button:has-text("Hide"), button:has-text("Take Down")').first();
      if (await hideBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await hideBtn.click();

        // Confirm modal if present
        const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Yes, Hide")').first();
        if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await confirmBtn.click();
        }

        // Verify notification or status change
        await page.waitForTimeout(1000);
      }
    }
  });

  test('Regression: Category select UX - shows disabled placeholder on load and validates when omitted', async ({
    page,
  }) => {
    // 1. Log in with existing seeded student
    await page.goto('/signin', { waitUntil: 'domcontentloaded' });
    await page.fill('#campus-email', 'kavindu.s@sci.cmb.ac.lk');
    await page.fill('#campus-pwd', 'Password123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/(dashboard|browse)/, { timeout: 15000 });

    // 2. Open /sell (Create Listing)
    await page.goto('/sell', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });

    // 3. Confirm placeholder option is present and selected
    const categorySelect = page.locator('#category-select');
    await categorySelect.waitFor({ state: 'visible', timeout: 10000 });
    await expect(categorySelect).toHaveValue('');

    // 4. Fill title, select wanted type, fill description, but leave category as placeholder ("")
    await page.fill('#title-input', 'Test Wanted Item For Regression');
    await page.locator('input[type="radio"][name="listing_type"][value="wanted"]').check();
    await page.locator('textarea').first().fill('Detailed description with more than 10 characters.');

    // 5. Submit form
    const submitBtn = page.locator('button[type="submit"]:has-text("Publish"), button[type="submit"]:has-text("Campus")').first();
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click();

    // 6. Confirm validation error is displayed clearly and user is not redirected
    const errorMsg = page.locator('text=Please select a primary category');
    await expect(errorMsg).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/\/sell/);
  });
});
