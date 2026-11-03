import countries from './geography.json' with { type: 'json' };
import { project } from './geography.js';
const STEP = 10, W = 120, H = 52;
const polygons = countries.map(c => {
  const points = c.ring.map(([x,y]) => project(x,y));
  return {points, minX:Math.min(...points.map(p=>p.x)), maxX:Math.max(...points.map(p=>p.x)), minY:Math.min(...points.map(p=>p.y)), maxY:Math.max(...points.map(p=>p.y))};
});
function inside(points,x,y) {
  let result = false;
  for (let i=0,j=points.length-1;i<points.length;j=i++) { const a=points[i], b=points[j]; if ((a.y>y)!==(b.y>y) && x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x) result=!result; }
  return result;
}
export function onLand(x,y) { return polygons.some(p=>x>=p.minX&&x<=p.maxX&&y>=p.minY&&y<=p.maxY&&inside(p.points,x,y)); }
const water = Array.from({length:W*H},(_,i)=>!onLand((i%W+.5)*STEP,(Math.floor(i/W)+.5)*STEP));
// Restrict coastal attachment to the Mediterranean's navigable grid component.
// This keeps Istanbul connected when the Bosphorus is narrower than one grid cell.
const reachable = new Uint8Array(W*H), queue=[45*W+65]; reachable[queue[0]]=1;
for (let q=0;q<queue.length;q++) {
  const i=queue[q],x=i%W,y=Math.floor(i/W);
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {const nx=x+dx,ny=y+dy,n=ny*W+nx;if(nx>=0&&nx<W&&ny>=0&&ny<H&&water[n]&&!reachable[n]){reachable[n]=1;queue.push(n);}}
}
const center = i => ({x:(i%W+.5)*STEP,y:(Math.floor(i/W)+.5)*STEP});
function nearestWater(point) {
  let best=-1, distance=Infinity;
  for(let i=0;i<water.length;i++) if(water[i] && reachable[i]) {const p=center(i), d=(p.x-point.x)**2+(p.y-point.y)**2;if(d<distance){best=i;distance=d;}}
  return best;
}
export function seaPath(start,end) {
  const source=nearestWater(start), target=nearestWater(end), score=new Float64Array(W*H).fill(Infinity), previous=new Int32Array(W*H).fill(-1), closed=new Uint8Array(W*H);
  score[source]=0; const open=[source];
  const heuristic=i=>{const a=center(i),b=center(target);return Math.hypot(a.x-b.x,a.y-b.y)/STEP;};
  while(open.length) {
    let best=0;for(let j=1;j<open.length;j++) if(score[open[j]]+heuristic(open[j])<score[open[best]]+heuristic(open[best]))best=j;
    const current=open.splice(best,1)[0];if(closed[current])continue;closed[current]=1;if(current===target)break;
    const x=current%W,y=Math.floor(current/W);
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
      const nx=x+dx,ny=y+dy,n=ny*W+nx;if(nx<0||nx>=W||ny<0||ny>=H||!water[n]||closed[n])continue;
      if(dx&&dy&&(!water[y*W+nx]||!water[ny*W+x]))continue;
      const next=score[current]+Math.hypot(dx,dy);if(next<score[n]){score[n]=next;previous[n]=current;open.push(n);}
    }
  }
  if(source!==target&&previous[target]===-1)return null;
  const chain=[];for(let i=target;i!==-1;i=previous[i]){chain.push(center(i));if(i===source)break;}chain.reverse();
  // Remove redundant collinear grid points while keeping the route in navigable water.
  const simplified=chain.filter((p,i)=>i===0||i===chain.length-1||((p.x-chain[i-1].x)*(chain[i+1].y-p.y)!==(p.y-chain[i-1].y)*(chain[i+1].x-p.x)));
  return [start,...simplified,end];
}
export function pointAlong(path, progress) {
  const lengths=path.slice(1).map((p,i)=>Math.hypot(p.x-path[i].x,p.y-path[i].y));
  let remaining=lengths.reduce((a,b)=>a+b,0)*Math.max(0,Math.min(1,progress));
  for(let i=0;i<lengths.length;i++){if(remaining<=lengths[i]||i===lengths.length-1){const t=lengths[i]?remaining/lengths[i]:0;return {x:path[i].x+(path[i+1].x-path[i].x)*t,y:path[i].y+(path[i+1].y-path[i].y)*t};}remaining-=lengths[i];}
  return path[0];
}

// Approximate nautical miles along the navigable polyline by undoing the projection.
export function routeDistanceNm(path) {
  const north=Math.log(Math.tan(Math.PI/4+47.3*Math.PI/360));
  const south=Math.log(Math.tan(Math.PI/4+30*Math.PI/360));
  const coordinate=p=>({lon:p.x/1200*48*Math.PI/180,lat:2*Math.atan(Math.exp(north-p.y/520*(north-south)))-Math.PI/2});
  let distance=0;
  for(let i=1;i<path.length;i++){
    const a=coordinate(path[i-1]),b=coordinate(path[i]);
    const h=Math.sin((b.lat-a.lat)/2)**2+Math.cos(a.lat)*Math.cos(b.lat)*Math.sin((b.lon-a.lon)/2)**2;
    distance+=3440.065*2*Math.asin(Math.sqrt(Math.min(1,h)));
  }
  return Math.ceil(distance);
}

