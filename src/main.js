import Phaser from 'phaser';
import './style.css';

const ports = [
  {name:'Venezia', english:'Venice', tag:'PORT OF ORIGIN', x:506,y:128, description:'The beating heart of a maritime empire. From its lagoon, merchants set sail for every corner of the known world.'},
  {name:'Ragusa', english:'Dubrovnik', tag:'ADRIATIC PORT', x:632,y:228, description:'A thriving walled republic on the Adriatic, where merchants and cargo meet on the route east.'},
  {name:'Corfù', english:'Corfu', tag:'IONIAN PORT', x:670,y:316, description:'A green island at the mouth of the Adriatic, guarding the passage between Venice and the eastern seas.'},
  {name:'Candia', english:'Crete', tag:'ISLAND PORT', x:847,y:418, description:'A crossroads of the eastern Mediterranean, rich with the scents and stories of distant shores.'},
  {name:'Costantinopoli', english:'Constantinople', tag:'EASTERN PORT', x:1001,y:174, description:'A magnificent city between two continents, and a gateway to the treasures of the East.'},
  {name:'Alessandria', english:'Alexandria', tag:'SOUTHERN PORT', x:992,y:489, description:'An ancient harbour at the edge of the Nile, linking the Mediterranean to trade routes beyond.'}
];
let selected = 0;
let scene;
function selectPort(index) {
  selected = (index + ports.length) % ports.length;
  const port = ports[selected];
  document.querySelector('#port-number').textContent = `${String(selected + 1).padStart(2,'0')} / 06`;
  document.querySelector('.eyebrow.small').textContent = port.tag;
  document.querySelector('#port-name').replaceChildren(document.createTextNode(port.name + ' '), Object.assign(document.createElement('em'), {textContent:port.english}));
  document.querySelector('#port-description').textContent = port.description;
  if (scene) scene.updateSelection();
}
document.querySelector('#previous').addEventListener('click', () => selectPort(selected - 1));
document.querySelector('#next').addEventListener('click', () => selectPort(selected + 1));

class MapScene extends Phaser.Scene {
  constructor(){ super('map'); }
  create(){
    scene=this;
    const g=this.add.graphics();
    g.fillStyle(0xa9c9c4).fillRect(0,0,1200,520);
    // A softly layered sea and a restrained cartographic grid.
    g.lineStyle(1,0x729e99,.16);
    for(let x=60;x<1200;x+=90) g.lineBetween(x,0,x,520);
    for(let y=40;y<520;y+=80) g.lineBetween(0,y,1200,y);
    const land = (points) => {g.fillStyle(0xe5dec5).lineStyle(2,0xc1b998,.85);g.beginPath();g.moveTo(points[0][0],points[0][1]);points.slice(1).forEach(([x,y])=>g.lineTo(x,y));g.closePath();g.fillPath();g.strokePath();};
    // Iberia and southern France, the Italian peninsula, and the Balkans.
    land([[0,0],[460,0],[461,36],[430,49],[411,74],[373,83],[350,99],[324,91],[304,113],[280,112],[252,134],[224,135],[211,166],[187,169],[171,196],[145,197],[130,220],[100,224],[80,250],[48,248],[24,266],[0,257]]);
    land([[0,300],[23,294],[49,307],[73,301],[96,318],[117,314],[145,333],[168,337],[184,358],[180,383],[159,394],[131,385],[112,401],[85,398],[57,415],[31,408],[0,416]]);
    land([[442,40],[478,43],[501,59],[514,78],[520,99],[535,117],[542,140],[557,156],[568,177],[582,189],[581,207],[598,219],[608,243],[625,254],[626,267],[642,284],[640,297],[623,296],[608,279],[592,269],[580,250],[561,238],[548,218],[535,211],[526,195],[510,180],[504,161],[486,153],[472,135],[459,126],[445,108],[426,101],[419,82]]);
    land([[570,0],[1200,0],[1200,137],[1163,142],[1143,151],[1107,142],[1079,151],[1052,145],[1024,160],[996,151],[978,172],[951,169],[936,181],[916,174],[903,190],[885,185],[872,206],[856,200],[847,216],[829,219],[822,238],[807,241],[800,263],[784,258],[775,281],[761,281],[752,300],[736,304],[727,321],[709,315],[706,298],[692,289],[690,270],[678,257],[678,239],[659,234],[651,216],[634,209],[627,191],[610,181],[600,162],[580,152],[566,135],[550,114],[539,88],[530,67],[542,50],[553,30]]);
    // Greece, the Aegean and Anatolia.
    land([[736,304],[751,311],[762,327],[779,327],[785,344],[802,345],[808,361],[795,374],[777,369],[767,383],[755,373],[748,356],[737,349],[725,332]]);
    land([[919,222],[946,218],[970,223],[998,214],[1025,219],[1052,208],[1077,215],[1105,207],[1135,212],[1160,205],[1200,209],[1200,335],[1172,327],[1150,333],[1124,320],[1096,323],[1075,313],[1047,318],[1022,307],[999,313],[978,300],[961,299],[944,284],[931,279],[925,260],[912,249]]);
    // North Africa.
    land([[0,468],[50,456],[97,462],[137,449],[177,453],[217,443],[258,451],[296,442],[329,454],[366,449],[398,461],[433,460],[469,470],[501,464],[545,472],[585,468],[617,479],[650,473],[682,483],[717,479],[753,491],[786,488],[824,499],[855,493],[892,501],[930,489],[965,485],[994,476],[1028,483],[1057,477],[1092,485],[1127,474],[1167,476],[1200,466],[1200,520],[0,520]]);
    land([[531,320],[557,312],[584,318],[603,332],[587,343],[559,344],[538,337]]); // Sicily
    land([[378,237],[390,229],[398,239],[395,264],[385,276],[377,260]]); // Sardinia
    land([[390,180],[399,174],[404,188],[401,208],[393,215],[386,203]]); // Corsica
    land([[811,407],[835,402],[862,405],[890,416],[883,425],[855,424],[826,420],[810,414]]); // Crete
    land([[943,364],[954,361],[961,366],[954,372]]); land([[786,283],[794,280],[797,289],[790,293]]);
    // Fine decorative relief marks.
    g.lineStyle(1,0xb9b392,.48);
    [[116,104],[143,88],[182,82],[225,76],[266,66],[305,57],[347,54],[376,42],[574,43],[609,63],[648,76],[690,91],[727,99],[769,109],[810,123],[854,112],[900,93],[951,82],[997,77],[1050,76],[1096,65],[1144,62],[78,356],[111,348],[146,360],[1034,262],[1080,250],[1134,251]].forEach(([x,y])=>{g.lineBetween(x-10,y+5,x,y-5);g.lineBetween(x,y-5,x+10,y+5)});
    // Dotted connections evoke possible trade routes, without implying game mechanics.
    g.lineStyle(2,0xb36b50,.7);
    const dash=(a,b)=>{const dist=Phaser.Math.Distance.Between(a.x,a.y,b.x,b.y);for(let i=0;i<dist;i+=12){const t=i/dist,u=Math.min((i+5)/dist,1);g.lineBetween(Phaser.Math.Linear(a.x,b.x,t),Phaser.Math.Linear(a.y,b.y,t),Phaser.Math.Linear(a.x,b.x,u),Phaser.Math.Linear(a.y,b.y,u));}};
    [[0,1],[1,2],[2,3],[3,4],[3,5]].forEach(([a,b])=>dash(ports[a],ports[b]));
    const label=(text,x,y,size=14,color='#6e938c',spacing=4)=>this.add.text(x,y,text,{fontFamily:'Georgia',fontStyle:'italic',fontSize:`${size}px`,color,letterSpacing:spacing}).setOrigin(.5);
    label('A D R I A T I C   S E A',580,155,13);label('I O N I A N   S E A',704,393,13);label('M E D I T E R R A N E A N   S E A',367,399,15);label('A E G E A N   S E A',874,291,12);label('ITALIA',485,76,12,'#aaa98e');label('NORTH AFRICA',580,505,11,'#aaa98e');
    this.markers=ports.map((p,i)=>{const group=this.add.container(p.x,p.y);const ring=this.add.circle(0,0,11,0xf0e8d3,.25).setStrokeStyle(1,0xa85e45,.65);const dot=this.add.circle(0,0,5,0xa85e45).setStrokeStyle(2,0xf6edda);const text=this.add.text(0,-20,p.name.toUpperCase(),{fontFamily:'Arial',fontSize:i===4?'10px':'11px',fontStyle:'bold',color:'#455b50',letterSpacing:1,backgroundColor:'#e8e3cf'}).setOrigin(.5,1).setPadding(4,2);group.add([ring,dot,text]);group.setSize(40,40).setInteractive({useHandCursor:true}).on('pointerdown',()=>selectPort(i));return {ring,dot,text};});
    // Compass rose and map furniture.
    this.add.text(76,62,'N',{fontFamily:'Georgia',fontSize:'13px',color:'#547b72'}).setOrigin(.5);
    g.lineStyle(1,0x648e83,.8).strokeCircle(76,105,25).lineBetween(76,70,76,140).lineBetween(41,105,111,105);
    g.fillStyle(0x658c80,.7).fillTriangle(76,78,71,105,76,100).fillTriangle(76,132,81,105,76,110);
    this.add.text(48,432,'MARE NOSTRUM',{fontFamily:'Georgia',fontStyle:'italic',fontSize:'13px',color:'#638b83'});
    this.add.text(48,450,'~  1 : 7,500,000  ~',{fontFamily:'Arial',fontSize:'9px',color:'#789991',letterSpacing:2});
    this.updateSelection();
  }
  updateSelection(){this.markers?.forEach((m,i)=>{m.ring.setRadius(i===selected?14:10).setFillStyle(i===selected?0xe8cfad:0xf0e8d3,i===selected?.7:.25);m.dot.setRadius(i===selected?6:5);});}
}
new Phaser.Game({type:Phaser.AUTO,parent:'game',width:1200,height:520,backgroundColor:'#a9c9c4',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:MapScene,render:{antialias:true}});
