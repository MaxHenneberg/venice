import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { project, ports } from '../src/geography.js';
const countries = JSON.parse(readFileSync(new URL('../src/geography.json', import.meta.url)));
function contains(ring, x, y) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < (xj-xi)*(y-yi)/(yj-yi)+xi) inside = !inside;
  }
  return inside;
}
const landAt = (name,lon,lat) => countries.some(c => c.name === name && contains(c.ring,lon,lat));
test('Natural Earth shapes represent the eastern Mediterranean and preserve sea gaps', () => {
  assert.ok(landAt('Italy', 12.5, 41.9));
  assert.ok(landAt('Greece', 22.95, 40.64));
  assert.ok(landAt('Turkey', 32.85, 39.93));
  assert.ok(landAt('Lebanon', 35.6, 34.0));
  assert.ok(landAt('Egypt', 31.23, 30.05));
  assert.ok(!countries.some(c => contains(c.ring, 16, 42)));
  assert.ok(!countries.some(c => contains(c.ring, 27, 34)));
});
test('ports are consistently projected and near their real coastlines', () => {
  assert.equal(ports.length, 7);
  for (const port of ports) {
    assert.deepEqual({x:port.x,y:port.y}, project(port.lon,port.lat));
    assert.ok(port.x >= 0 && port.x <= 1200 && port.y >= 0 && port.y <= 520, port.name);
    const distance = Math.min(...countries.flatMap(c => c.ring.map(([lon,lat]) => Math.hypot(lon-port.lon,lat-port.lat))));
    assert.ok(distance < .5, `${port.name} is ${distance.toFixed(2)} degrees from the nearest coastline or border`);
  }
});
