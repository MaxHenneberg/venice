import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';

const candidates=[process.env.CHROME_PATH,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','/usr/bin/chromium','/usr/bin/google-chrome'].filter(Boolean);

test('wide displays use the available map width and zoom scales the entire trading map',async()=>{
  const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'silent'});await server.listen();
  const browser=await chromium.launch({headless:true,executablePath:candidates.find(existsSync)});
  try{
    const page=await browser.newPage({viewport:{width:1920,height:1080}});const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/`);await page.locator('canvas').waitFor();
    const viewport=page.locator('.map-viewport'),game=page.locator('#game');
    const initial=await game.boundingBox();assert.ok(initial.width>1700,`wide desktop should use the available screen width, got ${initial.width}`);
    const initialHarbor=await page.getByRole('button',{name:/Venezia: produces/}).boundingBox();
    const initialScroll=await viewport.evaluate(el=>el.scrollWidth);await page.getByRole('button',{name:'Zoom in'}).click();
    assert.equal(await page.locator('#map-zoom-value').textContent(),'125%');assert.ok(await viewport.evaluate(el=>el.scrollWidth)>initialScroll);
    assert.ok(await viewport.evaluate(el=>el.scrollLeft>0),'zooming in should keep the map centered in the viewport');
    const initialRelative=(initialHarbor.x+initialHarbor.width/2-initial.x)/initial.width;
    const gameBox=await game.boundingBox(),harborBox=await page.getByRole('button',{name:/Venezia: produces/}).boundingBox();
    const relativeHarbor=(harborBox.x+harborBox.width/2-gameBox.x)/gameBox.width;
    assert.ok(Math.abs(relativeHarbor-initialRelative)<0.01,`Venezia stays anchored at its map location after zoom (${relativeHarbor} vs ${initialRelative})`);
    await page.getByRole('button',{name:'Zoom out'}).click();assert.equal(await page.locator('#map-zoom-value').textContent(),'100%');
    await page.getByRole('button',{name:'Zoom out'}).click();assert.equal(await page.locator('#map-zoom-value').textContent(),'75%');
    assert.equal(await page.getByRole('button',{name:'Zoom out'}).isDisabled(),true);await page.getByRole('button',{name:'Reset zoom'}).click();assert.equal(await page.locator('#map-zoom-value').textContent(),'100%');
    assert.deepEqual(errors,[]);
  }finally{await browser.close();await server.close();}
});

test('phone landscape fits the map at 100% and only pans after deliberate zoom',async()=>{
  const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'silent'});await server.listen();
  const browser=await chromium.launch({headless:true,executablePath:candidates.find(existsSync)});
  try{
    const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true,isMobile:true,deviceScaleFactor:1});const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/`);await page.locator('canvas').waitFor();
    const viewport=page.locator('.map-viewport'),game=page.locator('#game'),spacer=page.locator('#map-zoom-spacer');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
    const map=await viewport.boundingBox(),stage=await game.boundingBox();
    assert.ok(map.height>=375&&map.height<=390);
    assert.ok(Math.abs(stage.width-map.width)<=1,`default map should fit the landscape viewport (${stage.width} vs ${map.width})`);
    assert.ok(stage.height<map.height,`fit-width preserves the map aspect ratio (${stage.height} tall in ${map.height})`);
    assert.equal(await viewport.evaluate(el=>el.scrollWidth<=el.clientWidth),true,'no horizontal map scrollbar should appear at 100%');
    const before=await viewport.evaluate(el=>el.scrollWidth);await page.getByRole('button',{name:'Zoom in'}).click();
    assert.ok(await viewport.evaluate(el=>el.scrollWidth)>before);assert.ok((await spacer.boundingBox()).height>map.height);
    await page.locator('.map-viewport').evaluate(el=>{el.scrollLeft=0});
    const harbor=page.getByRole('button',{name:/Venezia: produces/});await harbor.click();assert.equal(await page.getByRole('button',{name:/Town Info/}).isVisible(),true);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);assert.deepEqual(errors,[]);
  }finally{await browser.close();await server.close();}
});
