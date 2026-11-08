import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
const candidates=[process.env.CHROME_PATH,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','/usr/bin/chromium','/usr/bin/google-chrome'].filter(Boolean);
async function beginRouteFrom(page,harbor){await harbor.click();await page.getByRole('button',{name:'Create Trade Route'}).click();}
test('map-only selection shows goods and cargo and supports keyboard/mobile interaction',async()=>{
 const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'silent'});await server.listen();const browser=await chromium.launch({headless:true,executablePath:candidates.find(existsSync)});
 try {
  const page=await browser.newPage({viewport:{width:1280,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/`,{waitUntil:'domcontentloaded'});await page.locator('canvas').waitFor();
  assert.equal(await page.locator('.harbor').count(),7);
  assert.equal(await page.locator('.harbor-goods small').filter({hasText:'MAKES'}).count(),7);assert.equal(await page.locator('.harbor-goods small').filter({hasText:'NEEDS'}).count(),7);
  const labels=page.locator('#harbor-labels-toggle');assert.equal(await labels.getAttribute('aria-pressed'),'false');assert.equal(await page.locator('.harbor-goods:visible').count(),0);
  const hiddenVenice=page.getByRole('button',{name:/Venezia: produces Glass.*needs Spices/});await hiddenVenice.click();assert.equal(await page.getByRole('button',{name:'Town Info'}).isVisible(),true);assert.equal(await page.getByRole('button',{name:'Create Trade Route'}).isVisible(),true);assert.equal(await page.locator('.harbor-goods:visible').count(),1);assert.equal(await page.locator('#route-popover').isHidden(),true);
  const radialBox=await page.locator('.harbor-radial').boundingBox(),gameBox=await page.locator('#game').boundingBox();assert.ok(radialBox.x>=gameBox.x&&radialBox.y>=gameBox.y&&radialBox.x+radialBox.width<=gameBox.x+gameBox.width&&radialBox.y+radialBox.height<=gameBox.y+gameBox.height);
  await page.getByRole('button',{name:'Town Info'}).click();const info=page.getByRole('dialog',{name:'Venezia'});await info.waitFor();assert.match(await info.innerText(),/Produces 🏺 Glass/);assert.match(await info.innerText(),/1 unit \/ 5s.*12\.0 units per minute/);assert.match(await info.innerText(),/Consumes 🌶️ Spices/);assert.match(await info.innerText(),/1 unit \/ 1\.3s while a compatible ship unloads.*46\.2 units per ship per minute/);assert.match(await info.innerText(),/12 units available/);assert.match(await info.innerText(),/0 units consumed from deliveries/);const infoBox=await info.boundingBox(),shellBox=await page.locator('.map-shell').boundingBox();assert.ok(infoBox.x>=shellBox.x&&infoBox.y>=shellBox.y&&infoBox.x+infoBox.width<=shellBox.x+shellBox.width&&infoBox.y+infoBox.height<=shellBox.y+shellBox.height);await page.keyboard.press('Escape');assert.equal(await info.isHidden(),true);
  await hiddenVenice.click();await page.getByRole('button',{name:'Create Trade Route'}).click();assert.match(await page.locator('#map-help-text').innerText(),/From Venezia/);assert.equal(await page.locator('.harbor-goods:visible').count(),7);assert.equal(await page.locator('.good-needed:visible').count(),7);assert.equal(await page.locator('.good-made:visible').count(),1);assert.equal(await page.getByRole('button',{name:'Cancel'}).count(),0);
  await page.locator('.map-viewport').click({position:{x:10,y:200}});assert.match(await page.locator('#map-announcement').textContent(),/cancelled/i);assert.equal(await page.locator('.harbor-goods:visible').count(),0);
  await hiddenVenice.focus();await page.keyboard.press('Enter');await page.keyboard.press('Escape');assert.equal(await page.locator('#route-popover').isHidden(),true);assert.equal(await page.locator('.harbor-goods:visible').count(),0);
  await labels.focus();await page.keyboard.press('Enter');assert.equal(await labels.getAttribute('aria-pressed'),'true');assert.equal(await page.locator('.harbor-goods:visible').count(),7);assert.equal(await page.locator('.harbor-goods').count(),7);assert.equal(await page.locator('.trading,.below,#route-form').count(),0);
  const goodsToggle=page.getByRole('button',{name:'Goods & handling'});assert.equal(await goodsToggle.getAttribute('aria-expanded'),'false');await goodsToggle.click();assert.equal(await goodsToggle.getAttribute('aria-expanded'),'true');
  const goods=page.getByRole('region',{name:'Goods and handling intervals'});const goodsSnapshot=await goods.ariaSnapshot();assert.match(goodsSnapshot,/Glass.*1.0s per unit/);assert.match(goodsSnapshot,/Salt.*0.5s per unit/);
  const goodsCdp=await page.context().newCDPSession(page);await goodsCdp.send('Accessibility.enable');const goodsAx=(await goodsCdp.send('Accessibility.getFullAXTree')).nodes.filter(n=>!n.ignored);assert.ok(goodsAx.some(n=>n.name?.value?.includes('Glass')&&n.name?.value?.includes('1.0s per unit')));assert.ok(goodsAx.some(n=>n.name?.value?.includes('Salt')&&n.name?.value?.includes('0.5s per unit')));assert.ok(goodsAx.some(n=>n.name?.value?.includes('Treasury')&&n.name?.value?.includes('1000 ducats')));await goodsCdp.detach();await goodsToggle.click();assert.equal(await goodsToggle.getAttribute('aria-expanded'),'false');
  const venice=page.getByRole('button',{name:/Venezia: produces Glass.*needs Spices/}),ragusa=page.getByRole('button',{name:/Ragusa: produces Salt.*needs Glass/});
  await beginRouteFrom(page,venice);assert.match(await page.locator('#map-help-text').innerText(),/select a destination/i);await page.keyboard.press('Escape');assert.match(await page.locator('#map-announcement').textContent(),/cancelled/i);
  await venice.focus();await page.keyboard.press('Enter');assert.equal(await page.getByRole('button',{name:'Town Info'}).evaluate(el=>document.activeElement===el),true);await page.keyboard.press('Enter');assert.equal(await page.locator('.town-info-close').evaluate(el=>document.activeElement===el),true);await page.keyboard.press('Escape');assert.equal(await info.isHidden(),true);
  await venice.focus();await page.keyboard.press('Enter');await page.keyboard.press('Tab');assert.equal(await page.getByRole('button',{name:'Create Trade Route'}).evaluate(el=>document.activeElement===el),true);await page.keyboard.press('Enter');assert.match(await page.locator('#map-help-text').innerText(),/select a destination/i);await page.keyboard.press('Escape');
  await beginRouteFrom(page,venice);await ragusa.focus();await page.keyboard.press('Enter');
  assert.match(await page.locator('#map-instruction').innerText(),/nautical miles.*plus ship 150; total \d+ ducats/);
  const bounds=await page.locator('#route-popover').boundingBox(),map=await page.locator('.map-shell').boundingBox();assert.ok(bounds.x>=map.x&&bounds.y>=map.y&&bounds.x+bounds.width<=map.x+map.width&&bounds.y+bounds.height<=map.y+map.height);
  await page.locator('.map-viewport').click({position:{x:10,y:200}});assert.equal(await page.locator('#route-popover').isHidden(),true);assert.match(await page.locator('#treasury').innerText(),/1000 ducats/);
  await beginRouteFrom(page,venice);await ragusa.click();
  assert.match(await page.locator('#treasury').innerText(),/1000 ducats/);
  await page.getByRole('button',{name:'Establish route'}).click();
  assert.equal(await page.locator('#route-popover').isHidden(),true);assert.match(await page.locator('#map-announcement').textContent(),/created.*Loading Glass/);await page.waitForTimeout(2200);
  await page.waitForFunction(()=>/\b[1-8]\/8/.test(document.querySelector('.ship-label')?.textContent||''),null,{timeout:10000});
  const voyagesToggle=page.getByRole('button',{name:'Voyages 1'});assert.equal(await voyagesToggle.getAttribute('aria-expanded'),'false');await voyagesToggle.click();assert.equal(await voyagesToggle.getAttribute('aria-expanded'),'true');assert.match(await page.locator('.route-state').innerText(),/Loading.*Glass.*1.0s per unit/);
  const region=page.getByRole('region',{name:'Active voyages'});
  const snapshot=await region.ariaSnapshot();
  assert.match(snapshot,/Venezia → Ragusa/);assert.match(snapshot,/Loading.*Glass/);assert.match(snapshot,/button "Remove route from Venezia to Ragusa"/);
  const cdp=await page.context().newCDPSession(page);await cdp.send('Accessibility.enable');
  const ax=(await cdp.send('Accessibility.getFullAXTree')).nodes.filter(node=>!node.ignored);
  assert.ok(ax.some(node=>node.role?.value==='button' && node.name?.value==='Remove route from Venezia to Ragusa'));
  assert.ok(ax.some(node=>node.name?.value?.includes('Venezia → Ragusa')));
  assert.ok(ax.some(node=>node.name?.value?.includes('Glass') && node.name?.value?.includes('Loading')));
  await cdp.detach();
  const remove=page.getByRole('button',{name:'Remove route from Venezia to Ragusa'});await remove.focus();
  const previousStatus=await region.getByRole('status').innerText();await page.waitForFunction(old=>document.querySelector('.route-state')?.textContent!==old,previousStatus,{timeout:5000});
  assert.equal(await remove.evaluate(el=>document.activeElement===el),true);assert.match(await region.ariaSnapshot(),/Glass/);
  await remove.click();assert.equal(await page.locator('.ship-label').count(),0);assert.equal(await page.locator('#voyages-toggle').evaluate(el=>document.activeElement===el),true);
  await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Harbor labels: on'}).click();assert.equal(await page.locator('.harbor-goods:visible').count(),0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);assert.ok(await page.locator('.map-viewport').evaluate(el=>el.scrollWidth>el.clientWidth));
  await beginRouteFrom(page,venice);assert.equal(await page.locator('.good-needed:visible').count(),7);await page.locator('.map-viewport').click({position:{x:10,y:200}});assert.equal(await page.locator('.harbor-goods:visible').count(),0);await beginRouteFrom(page,venice);await page.getByRole('button',{name:/Corfù: produces/}).click();assert.match(await page.locator('#map-instruction').innerText(),/needs Salt.*held/);await page.getByRole('button',{name:'Establish route'}).click();assert.equal(await page.locator('.ship-label').count(),1);
  await beginRouteFrom(page,venice);await ragusa.click();await page.getByRole('button',{name:'Establish route'}).click();
  const paidBalance=Number((await page.locator('#treasury').innerText()).match(/\d+/)[0]);
  await page.waitForFunction(()=>[...document.querySelectorAll('.route-state')].some(e=>/Holding.*Glass.*needs Salt/.test(e.textContent)),null,{timeout:45000});
  await page.waitForFunction(()=>{const label=[...document.querySelectorAll('.harbor')].find(e=>e.getAttribute('aria-label').startsWith('Ragusa:'));return /needs Glass, [1-9]\d* received/.test(label?.getAttribute('aria-label')||'');},null,{timeout:45000});
  await page.waitForFunction(before=>Number(document.querySelector('#treasury').textContent.match(/\d+/)[0])>before,paidBalance,{timeout:5000});
  assert.deepEqual(errors,[]);
 }finally{await browser.close();await server.close();}
});

test('route quote is shown before payment and insufficient funds prevents purchase',async()=>{
 const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'silent'});await server.listen();const browser=await chromium.launch({headless:true,executablePath:candidates.find(existsSync)});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/`);await page.locator('canvas').waitFor();
  const origin=page.getByRole('button',{name:/Venezia: produces/}),confirm=page.getByRole('button',{name:'Establish route'});
  let rejected=false;
  for(const destination of ['Beirut','Alessandria','Costantinopoli','Candia','Corfù','Ragusa']){
   const before=await page.locator('#treasury').innerText();await beginRouteFrom(page,origin);await page.getByRole('button',{name:new RegExp(`${destination}: produces`)}).click();
   const popup=await page.locator('#route-popover').boundingBox(),map=await page.locator('.map-shell').boundingBox();assert.ok(popup.x>=map.x&&popup.y>=map.y&&popup.x+popup.width<=map.x+map.width&&popup.y+popup.height<=map.y+map.height);
   const message=await page.locator('#map-instruction').innerText();assert.match(message,/nautical miles.*plus ship 150; total \d+ ducats/);assert.equal(await page.locator('#treasury').innerText(),before);
   if(await confirm.isDisabled()){assert.match(message,/Insufficient funds/);rejected=true;break;}
   const total=Number(message.match(/total (\d+) ducats/)[1]);await confirm.click();const after=Number((await page.locator('#treasury').innerText()).match(/\d+/)[0]);assert.equal(after,Number(before.match(/\d+/)[0])-total);
  }
  assert.equal(rejected,true);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
 }finally{await browser.close();await server.close();}
});

test('portrait mobile radial actions stay clear of toolbar and remain clickable',async()=>{
 const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'silent'});await server.listen();const browser=await chromium.launch({headless:true,executablePath:candidates.find(existsSync)});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/`);await page.locator('canvas').waitFor();
  const venice=page.getByRole('button',{name:/Venezia: produces Glass/}),toolbar=page.locator('.map-tools');await venice.click();const infoAction=page.getByRole('button',{name:'Town Info'}),routeAction=page.getByRole('button',{name:'Create Trade Route'});assert.ok(await infoAction.isVisible());assert.ok(await routeAction.isVisible());
  const toolbarBox=await toolbar.boundingBox();for(const action of [infoAction,routeAction]){const box=await action.boundingBox();assert.ok(box.x+box.width<=toolbarBox.x||box.x>=toolbarBox.x+toolbarBox.width||box.y+box.height<=toolbarBox.y||box.y>=toolbarBox.y+toolbarBox.height,'radial action must not overlap map tools');const hit=await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.closest('.radial-action')?.id,{x:box.x+box.width/2,y:box.y+box.height/2});assert.equal(hit,await action.getAttribute('id'),'each action center must hit its own radial control');}
  await infoAction.click();const info=page.getByRole('dialog',{name:'Venezia'});assert.ok(await info.isVisible());await page.keyboard.press('Escape');await venice.click();await routeAction.click();assert.match(await page.locator('#map-help-text').innerText(),/From Venezia/);await page.getByRole('button',{name:/Ragusa: produces Salt/}).click();assert.match(await page.locator('#map-instruction').innerText(),/total \d+ ducats/);assert.deepEqual(errors,[]);
 }finally{await browser.close();await server.close();}
});
