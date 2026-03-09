import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  await page.goto('http://localhost:5173/#/home');
  console.log('Waiting for #main-content...');
  await page.waitForSelector('#main-content', { timeout: 10000 });
  console.log('Found #main-content');
  await page.waitForTimeout(1000);
  console.log('HTML CONTENT:', await page.content());

  await browser.close();
})();
