import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';

const candidates=[process.env.CHROME_PATH,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','/usr/bin/chromium','/usr/bin/google-chrome'].filter(Boolean);

test('trade office HUD shows treasury, fleet state, and a live cargo summary',async()=>{
  const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'silent'});await server.listen();
  const browser=await chromium.launch({headless:true,executablePath:candidates.find(existsSync)});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:900}});const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/`);await page.locator('canvas').waitFor();
    const hud=page.getByRole('complementary',{name:'Trade office'});
    assert.ok(await hud.isVisible());assert.match(await page.locator('.trade-hud-kicker').innerText(),/THE DOGE'S LEDGER/);
    assert.match(await page.locator('#treasury').innerText(),/1000 ducats/);assert.equal(await page.locator('#fleet-count').innerText(),'At anchor');
    assert.match(await page.locator('#fleet-voyages').innerText(),/All ships are in port/);
    const controls=page.locator('#landscape-controls');assert.ok(await controls.isVisible());
    const venice=page.getByRole('button',{name:/Venezia: produces Glass/});
    await venice.click();await page.getByRole('button',{name:'Create Trade Route'}).click();
    await page.getByRole('button',{name:/Ragusa: produces Salt/}).click();await page.getByRole('button',{name:'Establish route'}).click();
    assert.equal(await page.locator('#fleet-count').innerText(),'1 at sea');
    const voyage=page.locator('.fleet-voyage');assert.equal(await voyage.count(),1);assert.match(await voyage.innerText(),/Venezia → Ragusa/);assert.match(await voyage.locator('.fleet-voyage-status').getAttribute('aria-label'),/Glassware cargo: 0 of 8 units, Loading/);
    await page.waitForFunction(()=>document.querySelector('.fleet-voyage-status')?.textContent.includes('1/8'),null,{timeout:5000});
    const routePanel=page.getByRole('button',{name:'Voyages 1'});await routePanel.click();assert.equal(await page.getByRole('region',{name:'Active voyages'}).isVisible(),true);
    assert.deepEqual(errors,[]);
  }finally{await browser.close();await server.close();}
});

test('trade HUD controls remain inside the map and usable on mobile',async()=>{
  const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'silent'});await server.listen();
  const browser=await chromium.launch({headless:true,executablePath:candidates.find(existsSync)});
  try{
    const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/`);await page.locator('canvas').waitFor();
    const hud=page.locator('.trade-hud'),shell=page.locator('.map-shell');const hudBox=await hud.boundingBox(),shellBox=await shell.boundingBox();
    assert.ok(hudBox.x>=shellBox.x&&hudBox.y>=shellBox.y&&hudBox.x+hudBox.width<=shellBox.x+shellBox.width&&hudBox.y+hudBox.height<=shellBox.y+shellBox.height);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,JSON.stringify(await page.evaluate(()=>[...document.querySelectorAll('body *')].map(el=>({tag:el.tagName,id:el.id,cls:el.className,right:Math.round(el.getBoundingClientRect().right),width:Math.round(el.getBoundingClientRect().width)})).filter(el=>el.right>innerWidth+1).slice(0,8))));
    assert.equal(await page.locator('#landscape-controls').isVisible(),true);const menu=page.getByRole('button',{name:'Map controls'});assert.equal(await menu.isHidden(),true);
    for(const selector of ['#harbor-labels-toggle','#goods-toggle','#voyages-toggle'])assert.ok((await page.locator(selector).boundingBox()).height>=44,`${selector} should be touch-sized`);
    await page.getByRole('button',{name:'Harbor labels: off'}).tap();assert.equal(await page.getByRole('button',{name:'Harbor labels: on'}).getAttribute('aria-pressed'),'true');
    const assertHudFits=async()=>{
      const result=await page.evaluate(()=>{const shell=document.querySelector('.map-shell').getBoundingClientRect(),hud=document.querySelector('.trade-hud').getBoundingClientRect();const elements=[document.querySelector('.trade-hud'),...document.querySelector('.trade-hud').querySelectorAll('*')];const escaped=elements.map(el=>{const r=el.getBoundingClientRect();return {name:el.id||el.className||el.tagName,left:r.left,right:r.right,width:r.width,visible:r.width>0&&r.height>0,hudLeft:hud.left,hudRight:hud.right,shellLeft:shell.left,shellRight:shell.right}}).filter(item=>item.visible&&(item.left<item.hudLeft-1||item.right>item.hudRight+1||item.left<item.shellLeft-1||item.right>item.shellRight+1));return {escaped,scrollWidth:document.documentElement.scrollWidth,viewportWidth:window.innerWidth}});
      assert.ok(result.scrollWidth<=result.viewportWidth,`document overflows at 844x390: ${JSON.stringify(result)}`);
      assert.deepEqual(result.escaped,[],`HUD content escapes its panel/map at 844x390: ${JSON.stringify(result.escaped)}`);
    };
    await page.setViewportSize({width:844,height:390});assert.ok(await menu.isVisible());
    await assertHudFits();
    assert.equal(await page.locator('#landscape-menu-toggle').evaluate(el=>getComputedStyle(el).fontSize),'0px');
    assert.ok((await page.locator('#landscape-menu-toggle').boundingBox()).width<=44);
    await menu.tap();assert.equal(await page.locator('#landscape-controls').isVisible(),true);
    await assertHudFits();
    if(await page.locator('.trade-hud-zoom').count())await page.getByRole('button',{name:'Zoom in'}).tap();
    await assertHudFits();
  }finally{await browser.close();await server.close();}
});

