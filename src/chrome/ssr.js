import puppeteer from 'puppeteer';
import getChrome from './getChrome';

export default async function render(url) {
  const chrome = await getChrome();
  const browser = await puppeteer.connect({
    browserWSEndpoint: chrome.debuggerUrl,
  });

  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle0' });

  let html = '[NotFound] Page not found';
  if (page.url() !== 'https://anilist.co/404') {
    html = await page.content();
  }

  await browser.close();
  setTimeout(() => chrome.instance.kill(), 0);
  return html;
}
