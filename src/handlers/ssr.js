import log from '../utils/log';
import render from '../chrome/ssr';

export default async function handler(event, context, callback) {
  const { url } = event.queryStringParameters || {};

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
}
