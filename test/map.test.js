import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';

const candidates = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/chromium', '/usr/bin/google-chrome'].filter(Boolean);

test('the map loads and port navigation works at desktop and mobile widths', async () => {
  const server = await createServer({server:{host:'127.0.0.1', port:0}, logLevel:'silent'});
  await server.listen();
  const address = server.httpServer.address();
  const browser = await chromium.launch({headless:true, executablePath:candidates.find(existsSync)});
  try {
    const page = await browser.newPage({viewport:{width:1280,height:900}});
    const errors=[];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${address.port}/`);
    await page.locator('#game canvas').waitFor();
    assert.match(await page.locator('#port-name').innerText(), /Venezia/);
    await page.getByRole('button',{name:'Next port'}).click();
    assert.match(await page.locator('#port-name').innerText(), /Ragusa/);
    await page.getByRole('button',{name:'Previous port'}).click();
    assert.match(await page.locator('#port-name').innerText(), /Venezia/);
    await page.setViewportSize({width:375,height:812});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); await server.close(); }
});
