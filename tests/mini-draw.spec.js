import { test, expect } from '@playwright/test';
import { POSTCODE, POSTCODE_RE, loginAndBlockNetworks } from './helpers.js';

// The Mini Draw is drawn at 6pm each day.
// Run this file at that time: `npx playwright test mini-draw`
test.describe.serial('mini draw', () => {
	/** @type {import('@playwright/test').BrowserContext} */
	let context;
	/** @type {import('@playwright/test').Page} */
	let page;

	test.beforeAll(async ({ browser }) => {
		({ context, page } = await loginAndBlockNetworks(browser));
		// The mini draw section is in the footer of every page — the homepage (where we
		// land after login) is sufficient; no additional navigation is needed.
		await expect(page.getByRole('heading', { name: 'Main Draw', level: 1 })).toBeVisible({ timeout: 15000 });
	});

	test.afterAll(async () => {
		await context.close();
	});

	test(`mini draw: ${POSTCODE} has not won`, async () => {
		// The £100 Mini Draw section lives in the page footer and is always present.
		// Scope to its container div by stepping up from the heading.
		const miniDrawSection = page.getByRole('heading', { name: '£100 Mini Draw' }).locator('xpath=..');
		await expect(miniDrawSection).toBeVisible({ timeout: 10000 });

		// The current result div contains the winning postcode between 6pm–2am, or
		// "Postcode revealed at 6pm" outside those hours. It is identifiable by the
		// £100 prize amount text it contains (the last-winner div below it does not).
		const currentResultDiv = miniDrawSection.locator('div').filter({ hasText: '£100' }).first();
		const currentText = (await currentResultDiv.locator('p').first().innerText()).trim();

		if (POSTCODE_RE.test(currentText)) {
			// Draw has been revealed — assert the winner is not the watched postcode.
			// If this fails, visit the site immediately to claim the £100 prize!
			expect(currentText.toUpperCase()).not.toBe(POSTCODE.toUpperCase());
		}
		// Outside 6pm–2am the draw is not yet revealed; the test passes with no assertion.
	});
});
