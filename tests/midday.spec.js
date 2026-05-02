import { test, expect } from '@playwright/test';
import { POSTCODE, POSTCODE_RE, loginAndBlockNetworks } from './helpers.js';

// The Main, Survey, Video and Bonus draws are all drawn at midday each day.
// All four checks share a single login to avoid four separate sign-in flows.
test.describe.serial('midday draws', () => {
	/** @type {import('@playwright/test').BrowserContext} */
	let context;
	/** @type {import('@playwright/test').Page} */
	let page;

	test.beforeAll(async ({ browser }) => {
		({ context, page } = await loginAndBlockNetworks(browser));
		// Confirm the homepage has fully loaded and the session is established before
		// any test starts navigating to individual draw pages.
		await expect(page.getByRole('heading', { name: 'Main Draw', level: 1 })).toBeVisible({ timeout: 15000 });
	});

	test.afterAll(async () => {
		await context.close();
	});

	test(`main draw: ${POSTCODE} has not won`, async () => {
		// Still on the homepage from beforeAll — no navigation needed.
		// The winning postcode is the first postcode-format text on the page.
		const winner = page.getByText(POSTCODE_RE).first();
		await expect(winner).toBeVisible({ timeout: 10000 });
		const text = await winner.innerText();
		// If this assertion fails, the postcode has won the main draw — visit the site to claim!
		expect(text.trim().toUpperCase()).not.toBe(POSTCODE.toUpperCase());
	});

	test(`survey draw: ${POSTCODE} has not won`, async () => {
		await page.goto('https://pickmypostcode.com/survey-draw/');
		// The results are hidden behind a survey prompt; bypass it to reveal the winners.
		await page.getByRole('button', { name: 'No thanks, not today' }).click();
		await expect(page.locator('p.text-result').first()).toBeVisible({ timeout: 15000 });
		const winners = await page.locator('p.text-result').allInnerTexts();
		// The survey draw can have multiple winning postcodes on a given day.
		const hasWon = winners.some(p => p.trim().toUpperCase() === POSTCODE.toUpperCase());
		expect(hasWon, `${POSTCODE} found in survey draw winners: ${winners.join(', ')}`).toBe(false);
	});

	test(`video draw: ${POSTCODE} has not won`, async () => {
		await page.goto('https://pickmypostcode.com/video/');
		await expect(page.getByRole('heading', { name: 'Video Draw', level: 1 })).toBeVisible({ timeout: 15000 });

		// The video CDN is blocked, so the video player fails immediately and the page
		// shows "Show the postcode" without requiring the video to be watched first.
		// When the CDN is available, the button has a countdown and is initially disabled.
		const showPostcodeButton = page.getByRole('button', { name: /show the postcode/i });
		await expect(showPostcodeButton).toBeVisible({ timeout: 30000 });
		await expect(showPostcodeButton).toBeEnabled({ timeout: 120000 });
		await showPostcodeButton.click();

		await expect(page.locator('p.text-result').first()).toBeVisible({ timeout: 10000 });
		const winner = await page.locator('p.text-result').first().innerText();
		expect(winner.trim().toUpperCase()).not.toBe(POSTCODE.toUpperCase());
	});

	test(`bonus draw: ${POSTCODE} has not won`, async () => {
		await page.goto('https://pickmypostcode.com/your-bonus/');
		// The bonus draw has three tiers (£5, £10, £20). Wait for the £5 heading to confirm
		// the page has loaded; only the £5 tier is unlocked for this account.
		await expect(page.getByRole('heading', { name: '£5 Bonus Draw', exact: true })).toBeVisible({ timeout: 15000 });
		const winners = await page.locator('p.text-result').allInnerTexts();
		const hasWon = winners.some(p => p.trim().toUpperCase() === POSTCODE.toUpperCase());
		expect(hasWon, `${POSTCODE} found in bonus draw winners: ${winners.join(', ')}`).toBe(false);
	});
});
