import { test, expect } from '@playwright/test';

// ponytail: Basic E2E tests verifying page loading, header link scroll interaction, and FAQ existence
test.describe('NoiseGone Web App UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the home page with header and upload zone', async ({ page }) => {
    // Check main title
    await expect(page.locator('h1')).toContainText('NoiseGone');
    
    // Check upload zone exists
    await expect(page.locator('text=Drag & drop a video file')).toBeVisible();
    await expect(page.locator('text=browse files')).toBeVisible();
  });

  test('should show FAQ section and scroll to it when Header link is clicked', async ({ page }) => {
    const faqSection = page.locator('#faq');
    await expect(faqSection).toBeVisible();
    await expect(faqSection.locator('h2')).toContainText('Frequently Asked Questions');

    // Click FAQ in header
    const faqHeaderLink = page.locator('header >> text=FAQ');
    await expect(faqHeaderLink).toBeVisible();
    await faqHeaderLink.click();

    // Verify it scrolled to FAQ or focused it (element is in viewport)
    await expect(faqSection).toBeInViewport();
  });
});
