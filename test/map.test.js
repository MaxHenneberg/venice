import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
const candidates=[process.env.CHROME_PATH,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','/usr/bin/chromium','/usr/bin/google-chrome'].filter(Boolean);
test('map renders and harbor navigation works at desktop and mobile widths',async()=>{
 const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'silent'});await server.listen();const browser=await chromium.launch({headless:true,executablePath:candidates.find(existsSync)});
 try {
  const page=await browser.newPage({viewport:{width:1280,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/`,{waitUntil:'domcontentloaded'});await page.locator('canvas').waitFor();
  const venice=page.getByRole('button',{name:/Venezia: produces Glass.*needs Spices/});const ragusa=page.getByRole('button',{name:/Ragusa: produces Salt.*needs Glass/});
  await venice.click();assert.match(await page.locator('#map-instruction').innerText(),/From Venezia/);await ragusa.click();assert.match(await page.locator('#map-instruction').innerText(),/Venezia to Ragusa created/);
  await page.setViewportSize({width:375,height:812});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
  const viewport=page.locator('.map-viewport');assert.equal(await viewport.evaluate(el=>el.scrollWidth>el.clientWidth),true);assert.ok(await page.locator('#game canvas').evaluate(el=>el.getBoundingClientRect().width)>=1400);
  await viewport.focus();await page.keyboard.press('End');assert.ok(await viewport.evaluate(el=>el.scrollLeft)>0);assert.deepEqual(errors,[]);
 }finally{await browser.close();await server.close();}
});
