// Read credentials from environment variables. Set these in a local .env file
// (see .env.example) or via GitHub Actions secrets.
if (!process.env.POSTCODE || !process.env.EMAIL) {
	throw new Error(
		'POSTCODE and EMAIL environment variables must be set.\n' +
		'Copy .env.example to .env and fill in your values.'
	);
}

export const POSTCODE = process.env.POSTCODE;
export const EMAIL = process.env.EMAIL;

// UK postcode pattern — used to detect postcode-format text on the page
export const POSTCODE_RE = /[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}/i;

/**
 * Creates a browser context with ad/video networks blocked, then logs in to
 * pickmypostcode.com. Returns { context, page } ready for use in tests.
 *
 * @param {import('@playwright/test').Browser} browser
 * @returns {Promise<{ context: import('@playwright/test').BrowserContext, page: import('@playwright/test').Page }>}
 */
export async function loginAndBlockNetworks(browser) {
	const context = await browser.newContext();

	// Block ad and video networks to reduce noise and speed up page loads
	await context.route(/cdn\.target-video\.com/, route => route.abort());
	await context.route(/player\.target-video\.com/, route => route.abort());
	await context.route(/show-ad\.js/, route => route.abort());
	await context.route(/static\.criteo\.net/, route => route.abort());
	await context.route(/cmp\.inmobi\.com/, route => route.abort());

	const page = await context.newPage();

	await page.goto('https://pickmypostcode.com/');

	// Dismiss the cookie notice that appears on first visit
	await page.getByRole('button', { name: 'No thanks' }).click();

	// Open the sign-in modal. There are multiple "Sign in" buttons in the DOM (mobile nav,
	// sign-in modal, and desktop nav); nth(2) targets the desktop navigation button.
	await page.getByRole('button', { name: 'Sign in' }).nth(2).click();

	// Fill in postcode and email within the sign-in modal.
	await page.getByRole('textbox', { name: 'Your postcode Your postcode' }).fill(POSTCODE.toLowerCase());
	await page.getByRole('textbox', { name: 'Your email address Your email' }).fill(EMAIL);

	// Submit the sign-in form, scoped to avoid matching the registration form
	await page.locator('form').filter({ hasText: 'Sign into your account Not a' }).getByRole('button').click();

	// Dismiss the GDPR consent dialog if it appears (shown on first login of the day)
	const disagreeButton = page.getByRole('button', { name: 'DISAGREE' });
	if (await disagreeButton.isVisible({ timeout: 5000 }).catch(() => false)) {
		await disagreeButton.click();
	}

	return { context, page };
}
