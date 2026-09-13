import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err.message));
  page.on('requestfailed', request => console.error('REQUEST FAILED:', request.url(), request.failure().errorText));

  await page.goto('http://localhost:5000', { waitUntil: 'networkidle2' });
  
  setTimeout(async () => {
    await browser.close();
  }, 2000);
})();
