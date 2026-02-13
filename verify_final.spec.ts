
import { test, expect } from '@playwright/test';

test('verify transcription app', async ({ page }) => {
  await page.goto('http://localhost:3000');
  // Wait for some content to load
  await page.waitForSelector('button', { timeout: 10000 });

  // Take screenshot of main page
  await page.screenshot({ path: '/home/jules/verification/final_main.png' });

  // Open settings
  const settingsBtn = page.locator('button:has(.lucide-settings), .lucide-settings').first();
  await settingsBtn.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/home/jules/verification/final_settings.png' });
});
