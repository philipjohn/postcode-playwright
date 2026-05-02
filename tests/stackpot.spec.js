import { test, expect } from '@playwright/test';
import { POSTCODE, loginAndBlockNetworks } from './helpers.js';

// The Stackpot is drawn twice a day at 9am and 9pm.
// Run this file at both times: `npx playwright test stackpot`
test.describe.serial('stackpot draw', () => {
	/** @type {import('@playwright/test').BrowserContext} */
	let context;
	/** @type {import('@playwright/test').Page} */
	let page;

	test.beforeAll(async ({ browser }) => {
		({ context, page } = await loginAndBlockNetworks(browser));
		// Confirm login is complete before navigating to the stackpot page
		await expect(page.getByRole('heading', { name: 'Main Draw', level: 1 })).toBeVisible({ timeout: 15000 });
		await page.goto('https://pickmypostcode.com/stackpot/');
		await expect(page.getByRole('heading', { name: 'Stackpot', level: 1 })).toBeVisible({ timeout: 15000 });
	});

	test.afterAll(async () => {
		await context.close();
	});

	test(`stackpot: ${POSTCODE} has not won`, async () => {
		// The stackpot has multiple winning postcodes; check none of them match.
		const winners = await page.locator('p.text-result').allInnerTexts();
		const hasWon = winners.some(p => p.trim().toUpperCase() === POSTCODE.toUpperCase());
		// If this assertion fails, the postcode has won the stackpot — visit the site to claim!
		expect(hasWon, `${POSTCODE} found in stackpot winners: ${winners.join(', ')}`).toBe(false);
	});
});
