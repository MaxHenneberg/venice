import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
const candidates=[process.env.CHROME_PATH,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','/usr/bin/chromium','/usr/bin/google-chrome'].filter(Boolean);
test('map-only selection shows goods and cargo and supports keyboard/mobile interaction',async()=>{
 const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'silent'});await server.listen();const browser=await chromium.launch({headless:true,executablePath:candidates.find(existsSync)});
 try {
  const page=await browser.newPage({viewport:{width:1280,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/`,{waitUntil:'domcontentloaded'});await page.locator('canvas').waitFor();
  assert.equal(await page.locator('.harbor').count(),7);assert.equal(await page.locator('.harbor-goods').count(),7);assert.equal(await page.locator('.trading,.below,#route-form').count(),0);
  const venice=page.getByRole('button',{name:/Venezia: produces Glass.*needs Spices/}),ragusa=page.getByRole('button',{name:/Ragusa: produces Salt.*needs Glass/});
  await venice.click();assert.match(await page.locator('#map-instruction').innerText(),/select a destination/i);await page.keyboard.press('Escape');assert.match(await page.locator('#map-instruction').innerText(),/cancelled/i);
  await venice.focus();await page.keyboard.press('Enter');await ragusa.focus();await page.keyboard.press('Enter');
  assert.match(await page.locator('#map-instruction').innerText(),/created.*Loading Glass/);await page.waitForTimeout(2200);
  await page.waitForFunction(()=>/\b[1-8]\/8/.test(document.querySelector('.ship-label')?.textContent||''),null,{timeout:10000});
  await page.locator('summary').filter({hasText:'Voyages'}).click();assert.match(await page.locator('.route-state').innerText(),/Loading.*Glass.*1.0s per unit/);
  await page.getByRole('button',{name:/Remove route from Venezia to Ragusa/}).click();assert.equal(await page.locator('.ship-label').count(),0);
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);assert.ok(await page.locator('.map-viewport').evaluate(el=>el.scrollWidth>el.clientWidth));
  await venice.click();await page.getByRole('button',{name:/Corfù: produces/}).click();assert.match(await page.locator('#map-instruction').innerText(),/needs Salt.*held/);assert.equal(await page.locator('.ship-label').count(),1);
  await venice.click();await ragusa.click();
  await page.waitForFunction(()=>[...document.querySelectorAll('.route-state')].some(e=>/Holding.*Glass.*needs Salt/.test(e.textContent)),null,{timeout:45000});
  await page.waitForFunction(()=>{const label=[...document.querySelectorAll('.harbor')].find(e=>e.getAttribute('aria-label').startsWith('Ragusa:'));return /needs Glass, [1-9]\d* received/.test(label?.getAttribute('aria-label')||'');},null,{timeout:45000});
  assert.deepEqual(errors,[]);
 }finally{await browser.close();await server.close();}
});
