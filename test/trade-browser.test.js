import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { ports } from '../src/geography.js';
const candidates = [process.env.CHROME_PATH,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','/usr/bin/chromium','/usr/bin/google-chrome'].filter(Boolean);
test('route form and map drawing create visible moving ships and support removal', async () => {
  const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'silent'}); await server.listen();
  const browser=await chromium.launch({headless:true,executablePath:candidates.find(existsSync)});
  try {
    const page=await browser.newPage({viewport:{width:1280,height:1000}}); const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/`,{waitUntil:'domcontentloaded'});await page.locator('canvas').waitFor();
    await page.getByRole('button',{name:/Create route/}).click();
    const row=page.locator('.route-row').first();assert.match(await row.innerText(),/Venezia → Ragusa/);assert.match(await row.innerText(),/8 \/ 8 Glass/);
    await page.waitForTimeout(1200);assert.doesNotMatch(await row.innerText(),/0% along route/);
    await page.getByRole('button',{name:'Remove route from Venezia to Ragusa'}).click();assert.equal(await page.locator('.route-row').count(),0);
    await page.getByRole('button',{name:/Draw on map/}).click();
    const canvas=page.locator('canvas');await canvas.scrollIntoViewIfNeeded();const box=await canvas.boundingBox();
    for(const i of [0,2]) await page.mouse.click(box.x+ports[i].x/1200*box.width,box.y+ports[i].y/520*box.height);
    assert.match(await page.locator('.route-row').innerText(),/Venezia → Corfù/);
    assert.match(await page.locator('#route-message').innerText(),/retain its cargo/);
    await page.locator('#route-to').selectOption('1');
    await page.getByRole('button',{name:/Create route/}).click();
    await page.waitForTimeout(13000);
    assert.match(await page.locator('.route-row').first().innerText(),/holding 8 \/ 8 Glass/);
    assert.match(await page.locator('.route-row').last().innerText(),/Returning/);
    await page.getByRole('button',{name:'Previous port'}).click();
    assert.match(await page.locator('#port-economy').innerText(),/4 units received/);
    await page.setViewportSize({width:320,height:812});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
    assert.deepEqual(errors,[]);
  } finally {await browser.close();await server.close();}
});

