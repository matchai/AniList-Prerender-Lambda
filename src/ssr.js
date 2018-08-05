const request = require('superagent');
const launchChrome = require('@serverless-chrome/lambda');
const puppeteer = require('puppeteer');

async function getChrome() {
  const chrome = await launchChrome();

  const response = await request
    .get(`${chrome.url}/json/version`)
    .set('Content-Type', 'application/json');

  const debuggerUrl = response.body.webSocketDebuggerUrl;

  return {
    debuggerUrl,
    instance: chrome,
  };
}

async function render(url) {
  const chrome = await getChrome();
  const browser = await puppeteer.connect({
    browserWSEndpoint: chrome.debuggerUrl,
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(url, { waitUntil: 'networkidle0' });

  if (page.url() === 'https://anilist.co/404') {
    throw '[NotFound] Page not found';
  }
  
  const html = await page.content();
  
  await browser.close();
  setTimeout(() => chrome.instance.kill(), 0);
  return html;
}

function log(...stuffToLog) {
  if (process.env.LOGGING) {
    console.log(...stuffToLog);
  }
}

module.exports.handler = async function handler(event, context, callback) {
  const { url } = event.queryStringParameters || {};
  const fullUrl = `https://anilist.co/${url}`;

  let data;

  log('Prerendering', fullUrl);

  const startTime = Date.now();

  try {
    data = await render(fullUrl);
  } catch (error) {
    console.error('Error rendering page for', fullUrl, error);
    return callback(error);
  }

  log(`Chromium took ${Date.now() - startTime}ms to load URL and capture screenshot.`);

  return callback(null, {
    statusCode: 200,
    body: data,
    headers: {
      'Content-Type': 'text/html',
    },
  });
};
