// Web Mercator keeps all ports and country shapes in one consistent projection.
const mercator = lat => Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));
const north = mercator(47.3), south = mercator(30);
export function project(lon, lat) {
  return { x: lon / 48 * 1200, y: (north - mercator(lat)) / (north - south) * 520 };
}
const definitions = [
  ['Venezia','Venice','PORT OF ORIGIN',12.3388,45.4408,'The beating heart of a maritime empire. From its lagoon, merchants set sail for every corner of the known world.'],
  ['Ragusa','Dubrovnik','ADRIATIC PORT',18.1083,42.6507,'A thriving walled republic on the Adriatic, where merchants and cargo meet on the route east.'],
  ['Corfù','Corfu','IONIAN PORT',19.9217,39.6243,'A green island at the mouth of the Adriatic, guarding the passage between Venice and the eastern seas.'],
  ['Candia','Heraklion, Crete','ISLAND PORT',25.1442,35.3387,'A crossroads of the eastern Mediterranean, rich with the scents and stories of distant shores.'],
  ['Costantinopoli','Istanbul','EASTERN PORT',28.9784,41.0082,'A magnificent city between two continents, and a gateway to the treasures of the East.'],
  ['Alessandria','Alexandria','SOUTHERN PORT',29.9187,31.2001,'An ancient harbour at the edge of the Nile, linking the Mediterranean to trade routes beyond.'],
  ['Beirut','Beirut','LEVANTINE PORT',35.5018,33.8938,'A harbour on the Levantine coast, connecting the sea to routes through the eastern hinterland.']
];
export const ports = definitions.map(([name,english,tag,lon,lat,description]) => ({name,english,tag,lon,lat,description,...project(lon,lat)}));
