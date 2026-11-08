import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';

const candidates=[process.env.CHROME_PATH,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','/usr/bin/chromium','/usr/bin/google-chrome'].filter(Boolean);

test('non-harbor map clicks and taps cancel origin and quote without interfering with controls',async()=>{
  const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'silent'});await server.listen();const browser=await chromium.launch({headless:true,executablePath:candidates.find(existsSync)});
  try{
    const url=process.env.PREVIEW_URL || `http://127.0.0.1:${server.httpServer.address().port}/`;
    const entries=[{size:{width:1280,height:900},touch:false},{size:{width:844,height:390},touch:true}].filter(entry=>!process.env.CANCEL_INPUT||(entry.touch?'touch':'mouse')===process.env.CANCEL_INPUT);
    for(const entry of entries){
      const page=await browser.newPage({viewport:entry.size,hasTouch:entry.touch,isMobile:entry.touch});await page.goto(url);await page.locator('canvas').waitFor();
      const venice=page.getByRole('button',{name:/Venezia: produces Glass/}),ragusa=page.getByRole('button',{name:/Ragusa: produces Salt/}),viewport=page.locator('.map-viewport');
      const activate=locator=>entry.touch?locator.tap():locator.click();
      async function openWater(){
        const box=await viewport.boundingBox(),point={x:box.x+12,y:box.y+Math.min(200,box.height/2)};
        const target=await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.tagName,point);assert.equal(target,'CANVAS');
        if(entry.touch)await page.touchscreen.tap(point.x,point.y);else await page.mouse.click(point.x,point.y);
      }
      await activate(venice);assert.match(await page.locator('#map-help-text').innerText(),/From Venezia/);
      await openWater();assert.match(await page.locator('#map-announcement').textContent(),/cancelled/i,`${entry.touch?'touch':'mouse'} origin cancellation`);assert.equal(await venice.getAttribute('aria-pressed'),'false');
      await activate(venice);await activate(ragusa);assert.equal(await page.locator('#route-popover').isVisible(),true);const balance=await page.locator('#treasury').innerText();
      await openWater();assert.equal(await page.locator('#route-popover').isHidden(),true);assert.equal(await page.locator('#treasury').innerText(),balance);assert.equal(await venice.getAttribute('aria-pressed'),'false');
      await activate(venice);await activate(ragusa);assert.equal(await page.locator('#route-popover').isVisible(),true);
      await activate(page.locator('#map-instruction'));assert.equal(await page.locator('#route-popover').isHidden(),true);assert.equal(await page.locator('#treasury').innerText(),balance);
      await activate(venice);const menu=page.locator('#landscape-menu-toggle');if(await menu.isVisible())await activate(menu);const labels=page.locator('#harbor-labels-toggle');await activate(labels);assert.equal(await venice.getAttribute('aria-pressed'),'true');assert.equal(await labels.getAttribute('aria-pressed'),'true');
      await page.close();
    }
  }finally{await browser.close();await server.close();}
});

test('horizontal touch dragging does not cancel selection',async()=>{
  const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'silent'});await server.listen();const browser=await chromium.launch({headless:true,executablePath:candidates.find(existsSync)});
  try{
    const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/`);await page.locator('canvas').waitFor();
    const venice=page.getByRole('button',{name:/Venezia: produces Glass/}),viewport=page.locator('.map-viewport');await venice.tap();
    const box=await viewport.boundingBox(),before=await viewport.evaluate(el=>el.scrollLeft);const cdp=await page.context().newCDPSession(page);const point={x:box.x+180,y:box.y+200};
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x-85,y:point.y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
    assert.equal(await venice.getAttribute('aria-pressed'),'true');assert.ok(await viewport.evaluate(el=>el.scrollLeft)>before);
  }finally{await browser.close();await server.close();}
});
