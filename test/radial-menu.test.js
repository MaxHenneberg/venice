import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';

const candidates=[process.env.CHROME_PATH,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','/usr/bin/chromium','/usr/bin/google-chrome'].filter(Boolean);

test('radial town actions keep the town name clear and expose icon labels as tooltips',async()=>{
  const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'silent'});await server.listen();
  const browser=await chromium.launch({headless:true,executablePath:candidates.find(existsSync)});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:900}});
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/`,{waitUntil:'domcontentloaded'});await page.locator('canvas').waitFor();
    const venice=page.getByRole('button',{name:/Venezia: produces Glass/});await venice.click();
    const radial=page.locator('.harbor-radial'),townName=page.locator('.radial-town-name');
    assert.equal(await townName.innerText(),'VENEZIA');
    for(const [id,label,glyph] of [['town-info-action','Town Info','ⓘ'],['create-route-action','Create Trade Route','↗']]){
      const action=page.locator(`#${id}`);assert.equal(await action.getAttribute('aria-label'),label);assert.equal(await action.getAttribute('title'),label);assert.equal((await action.innerText()).trim(),glyph,'the icon is the only visible action content; its title provides the tooltip');
    }
    const townBox=await townName.boundingBox();
    for(const action of await radial.locator('.radial-action').all()){
      const actionBox=await action.boundingBox();
      assert.ok(actionBox.x+actionBox.width<=townBox.x||actionBox.x>=townBox.x+townBox.width||actionBox.y+actionBox.height<=townBox.y||actionBox.y>=townBox.y+townBox.height,'radial buttons must not overlap the readable town name at the center');
      assert.ok(actionBox.width>=42&&actionBox.height>=42,'radial icons need a practical touch target');
    }
    await page.keyboard.press('Escape');
    const ragusa=page.getByRole('button',{name:/Ragusa: produces Salt/});await ragusa.click();
    assert.equal(await townName.innerText(),'RAGUSA','the center label updates when another town is selected');
    await page.keyboard.press('Escape');await venice.click();
    const townView=page.getByRole('button',{name:'Open Town View'});assert.equal(await townView.getAttribute('title'),'Open Town View');assert.equal((await townView.innerText()).trim(),'⌂');
    assert.deepEqual(await page.locator('.harbor-radial .radial-action span:not(.radial-glyph)').count(),0,'no persistent menu labels should render beside the icons');
  }finally{await browser.close();await server.close();}
});
