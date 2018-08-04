import * as launchChrome from '@serverless-chrome/lambda';
import * as request from 'superagent';

export default async function getChrome() {
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
