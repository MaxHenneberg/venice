import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';

const candidates=[process.env.CHROME_PATH,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','/usr/bin/chromium','/usr/bin/google-chrome'].filter(Boolean);

test('phone landscape keeps map, controls and paid route flow usable without desktop regression',async()=>{
  const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'silent'});await server.listen();
  const browser=await chromium.launch({headless:true,executablePath:candidates.find(existsSync)});
  try{
    const url=`http://127.0.0.1:${server.httpServer.address().port}/`;
    for(const size of [{width:844,height:390},{width:667,height:375}]){
      const page=await browser.newPage({viewport:size,hasTouch:true,isMobile:true,deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.goto(url);await page.locator('canvas').waitFor();
      const shell=page.locator('.map-shell'),viewport=page.locator('.map-viewport'),menu=page.getByRole('button',{name:'Map controls'});
      const map=await viewport.boundingBox();assert.ok(map.height>=size.height-15);assert.ok(map.y+map.height<=size.height);assert.ok(await viewport.evaluate(el=>el.scrollWidth>el.clientWidth));
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);assert.equal(await menu.isVisible(),true);assert.ok((await menu.boundingBox()).height>=44);
      assert.equal(await page.getByRole('button',{name:'Harbor labels: off'}).isHidden(),true);
      const venice=page.getByRole('button',{name:/Venezia: produces Glass/});assert.equal(await venice.evaluate(el=>getComputedStyle(el,'::before').width),'44px');
      await menu.tap();assert.equal(await menu.getAttribute('aria-expanded'),'true');const labels=page.locator('#harbor-labels-toggle');assert.ok((await labels.boundingBox()).height>=44);await labels.tap();assert.equal(await labels.getAttribute('aria-pressed'),'true');
      await menu.tap();await venice.tap();assert.match(await page.locator('#map-help-text').innerText(),/From Venezia/);
      await page.getByRole('button',{name:/Ragusa: produces Salt/}).tap();const pop=await page.locator('#route-popover').boundingBox(),frame=await shell.boundingBox();
      assert.ok(pop.x>=frame.x&&pop.y>=frame.y&&pop.x+pop.width<=frame.x+frame.width&&pop.y+pop.height<=size.height);assert.match(await page.locator('#map-instruction').innerText(),/total \d+ ducats/);
      const confirm=page.getByRole('button',{name:'Establish route'});assert.ok((await confirm.boundingBox()).height>=44);await confirm.tap();assert.match(await page.locator('#map-announcement').textContent(),/created.*Loading Glass/);assert.equal(await page.locator('.ship-label').count(),1);
      await menu.tap();await page.getByRole('button',{name:'Voyages 1'}).tap();const panel=page.getByRole('region',{name:'Active voyages'}),panelBox=await panel.boundingBox();assert.ok(panelBox.y>=0&&panelBox.y+panelBox.height<=size.height);assert.match(await panel.innerText(),/Venezia → Ragusa/);
      assert.deepEqual(errors,[]);await page.close();
    }
    const desktop=await browser.newPage({viewport:{width:1280,height:900}});await desktop.goto(url);await desktop.locator('canvas').waitFor();
    assert.equal(await desktop.getByRole('button',{name:'Map controls'}).isHidden(),true);assert.equal(await desktop.getByRole('button',{name:'Harbor labels: off'}).isVisible(),true);assert.equal(await desktop.getByRole('button',{name:'Goods & handling'}).isVisible(),true);await desktop.close();
  }finally{await browser.close();await server.close();}
});
