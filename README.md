# Trade Winds

A Phaser foundation for a Venice-inspired trade route game. Explore a stylized Mediterranean map, connect ports and watch ships transport goods between them. The map is illustrative rather than a navigation chart.

## Run locally

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

Open the local address printed by Vite. Use the port markers or the previous/next buttons to explore. Run `npm run build` for a production build and `npm test` for the available automated checks.

## Map data

The land and modern country outlines are derived from [Natural Earth 1:50m Admin 0 Countries](https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries/), cropped to the map region. Natural Earth data is public domain: https://www.naturalearthdata.com/about/terms-of-use/. Borders are modern geographic reference lines, not a depiction of 15th-century political boundaries. Port coordinates are approximate modern city locations.

## Trading

Each port starts with 12 units of its own good, produces one every five seconds up to 40, and has one standing need shown when the port is selected. Choose origin and destination in the form or select **Draw on map**, then click two ports. A ship loads up to eight available units, sails each leg in 12 seconds, and repeats the journey. It delivers only when the destination needs its cargo; otherwise it stays there holding the cargo. Removing a route returns its cargo to its origin. The simulation is kept in the current browser session and resets on reload.

