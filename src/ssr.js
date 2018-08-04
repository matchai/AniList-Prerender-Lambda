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
  await page.goto(url, { waitUntil: 'networkidle0' });

  let html = '[NotFound] Page not found';
  if (page.url() !== 'https://anilist.co/404') {
    html = await page.content();
  }

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
  const { path } = event.queryStringParameters || {};
  const url = `https://anilist.co/${path}`;

  let data;

  log('Prerendering', url);

  const startTime = Date.now();

  try {
    data = await render(url);
  } catch (error) {
    console.error('Error capturing screenshot for', url, error);
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
