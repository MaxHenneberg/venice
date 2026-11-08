import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { build, preview } from 'vite';
import { chromium } from 'playwright';

const candidates = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/chromium', '/usr/bin/google-chrome'].filter(Boolean);

test('production build loads and decodes the Venice map artwork', async () => {
  await build();
  const server = await preview({ preview: { host: '127.0.0.1', port: 0 } });
  const previewPort = server.httpServer.address().port;
  const proxy = createServer(async (request, response) => {
    const requestUrl = new URL(request.url, 'http://localhost');
    const prefix = '/venice/pr-15';
    if (!requestUrl.pathname.startsWith(`${prefix}/`)) {
      response.writeHead(404).end();
      return;
    }
    const resourcePath = requestUrl.pathname.slice(prefix.length) || '/';
    const upstream = await fetch(`http://127.0.0.1:${previewPort}${resourcePath}${requestUrl.search}`);
    const headers = Object.fromEntries([...upstream.headers.entries()].filter(([name]) => !['content-length', 'content-encoding', 'transfer-encoding', 'connection'].includes(name.toLowerCase())));
    response.writeHead(upstream.status, headers);
    response.end(Buffer.from(await upstream.arrayBuffer()));
  });
  await new Promise(resolve => proxy.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true, executablePath: candidates.find(existsSync) });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const port = proxy.address().port;
    await page.goto(`http://127.0.0.1:${port}/venice/pr-15/`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Venezia: produces Glass/ }).click();
    await page.getByRole('button', { name: 'Open Town View' }).click();
    await page.getByRole('dialog', { name: 'Venice' }).waitFor();

    const artwork = page.locator('.town-board-wrap img.venice-historic-map');
    await artwork.waitFor();
    const href = await artwork.evaluate(image => image.currentSrc);
    assert.match(href, /assets\/venice-lagoon-1500-[\w-]+\.png$/, 'the generated raster must be bundled as a production asset');
    assert.equal(new URL(href).pathname.startsWith('/venice/pr-15/assets/'), true, 'asset URL must stay under the GitHub Pages PR preview path');
    const response = await page.request.get(href);
    assert.equal(response.status(), 200, 'the bundled map URL must resolve from the built site');
    assert.match(response.headers()['content-type'], /image\/png/, 'the bundled URL must return a PNG rather than the SPA fallback page');
    const decoded = await artwork.evaluate(async image => {
      await image.decode();
      const box = image.getBoundingClientRect();
      const board = document.querySelector('#town-board');
      const boardBox = board.getBoundingClientRect();
      return {
        width: image.naturalWidth,
        height: image.naturalHeight,
        complete: image.complete,
        displayedWidth: box.width,
        displayedHeight: box.height,
        boardWidth: boardBox.width,
        boardHeight: boardBox.height,
        behindBoard: Boolean(image.compareDocumentPosition(board) & Node.DOCUMENT_POSITION_FOLLOWING)
      };
    });
    assert.equal(decoded.width, 1672, 'the original map image width must survive bundling');
    assert.equal(decoded.height, 941, 'the original map image height must survive bundling');
    assert.equal(decoded.complete, true, 'the production image must finish decoding');
    assert.equal(decoded.displayedWidth, decoded.boardWidth, 'the image must cover the board horizontally');
    assert.equal(decoded.displayedHeight, decoded.boardHeight, 'the image must cover the board vertically');
    assert.equal(decoded.behindBoard, true, 'the production raster must sit underneath the interactive SVG hex layer');
  } finally {
    await browser.close();
    await new Promise(resolve => proxy.close(resolve));
    await new Promise(resolve => server.httpServer.close(resolve));
  }
});
