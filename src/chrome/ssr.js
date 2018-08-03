import Cdp from 'chrome-remote-interface';
import log from '../utils/log';
import sleep from '../utils/sleep';

export default async function render(url) {
  const LOAD_TIMEOUT = process.env.PAGE_LOAD_TIMEOUT || 1000 * 60;

  let result;
  let loaded = false;

  const loading = async (startTime = Date.now()) => {
    if (!loaded && Date.now() - startTime < LOAD_TIMEOUT) {
      await sleep(100);
      await loading(startTime);
    }
  };

  const [tab] = await Cdp.List();
  const client = await Cdp({ host: '127.0.0.1', target: tab });

  const {
    Network, Page, Runtime, Emulation,
  } = client;

  Network.requestWillBeSent((params) => {
    log('Chrome is sending request for:', params.request.url);
  });

  Page.loadEventFired(() => {
    loaded = true;
  });

  try {
    await Promise.all([Network.enable(), Page.enable()]);

    await Emulation.setDeviceMetricsOverride({
      mobile: false,
      deviceScaleFactor: 0,
      scale: 1, // mobile ? 2 : 1,
      width: 1280,
      height: 0,
    });

    await Page.navigate({ url });
    await Page.loadEventFired();
    await loading();

    result = await Runtime.evaluate({
      expression: 'document.documentElement.outerHTML',
    });
  } catch (error) {
    console.error(error);
  }

  await client.close();

  return result.result.value;
}
