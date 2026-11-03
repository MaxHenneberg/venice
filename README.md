# Trade Winds

A Phaser foundation for a Venice-inspired trade route game. Explore a stylized Mediterranean map, connect ports and watch ships transport goods between them. The map is illustrative rather than a navigation chart.

## Run locally

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

Open the local address printed by Vite. Select an origin and destination harbor directly on the map to create a route. Harbor buttons are keyboard accessible. Run `npm run build` for a production build and `npm test` for the available automated checks.

## Map data

The land and modern country outlines are derived from [Natural Earth 1:50m Admin 0 Countries](https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries/), cropped to the map region. Natural Earth data is public domain: https://www.naturalearthdata.com/about/terms-of-use/. Borders are modern geographic reference lines, not a depiction of 15th-century political boundaries. Port coordinates are approximate modern city locations.

## Trading

Each port starts with 12 units of its own good, produces one every five seconds up to 40, and displays icons for its production and need. Select two harbor buttons to create a route; select the same harbor or press Escape to cancel. A ship loads up to eight units one at a time, travels each leg in 12 seconds, and unloads one unit at a time only if the destination needs that good. Otherwise it waits with its cargo. Each good has its own seconds-per-unit handling interval, shown in the map's Goods & handling key. The Voyages panel shows route status and allows removal, returning remaining cargo to its origin. The simulation resets on reload.

The treasury starts with 1,000 ducats. Before establishing a route, the map quotes a fixed 150-ducat ship cost plus 0.2 ducats for each nautical mile along the navigable path (distance and the resulting distance charge round up). Confirming pays the cost once; a route cannot be established without sufficient funds. Each unit unloaded at a port that needs it earns 20 ducats. Cargo held at a port that does not need it earns nothing, and removing a route does not refund its cost.

