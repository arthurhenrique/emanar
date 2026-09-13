import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';

const canvas = document.querySelector('#game');
const ui = {
  loading: document.querySelector('#loading'), stage: document.querySelector('#stage-name'), gas: document.querySelector('#gas-bar'),
  gasValue: document.querySelector('#gas-value'), domination: document.querySelector('#domination-bar'), dominationValue: document.querySelector('#domination-value'),
  evolution: document.querySelector('#evolution'), questTitle: document.querySelector('#quest-title'), questDetail: document.querySelector('#quest-detail'),
  toast: document.querySelector('#toast'), bossBar: document.querySelector('#boss-bar'), bossName: document.querySelector('#boss-name'), bossHealth: document.querySelector('#boss-health'),
  start: document.querySelector('#start-screen'), pause: document.querySelector('#pause-screen'), level: document.querySelector('#level-screen'),
  gameOver: document.querySelector('#game-over-screen'), ending: document.querySelector('#ending-screen')
};

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x10091d);
scene.fog = new THREE.FogExp2(0x10091d, 0.018);
const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 180);
camera.position.set(0, 6, 15);

const world = new THREE.Group();
scene.add(world);
const clock = new THREE.Clock();
const ray = new THREE.Raycaster();

const state = {
  mode: 'intro', level: 0, gas: 22, maxGas: 100, domination: 0, food: 0, totalFood: 0, deaths: 0,
  levelStarted: 0, totalTime: 0, evolution: 1, muted: false, shake: 0, fartCooldown: 0, coyote: 0,
  jumpBuffer: 0, hasMoved: false, savedBest: Number(localStorage.getItem('peidao-best') || 0)
};

const player = {
  mesh: null, velocity: new THREE.Vector3(), grounded: false, facing: 1, radius: .48, height: 1.5,
  spawn: new THREE.Vector3(), invulnerable: 0, squash: 0
};

const objects = { platforms: [], foods: [], enemies: [], totems: [], particles: [], hazards: [], decorations: [], portal: null, boss: null };
const input = { left: false, right: false, jump: false, fart: false };
const justPressed = { jump: false, fart: false };

const LEVELS = [
  {
    name: 'O ESGOTO TÍMIDO', subtitle: 'Fermente sua coragem', sky: 0x10091d, fog: 0x160d24, accent: 0x9cff38, required: 3,
    platforms: [[-3,0,7,1], [3.2,1.5,3.8,.55], [7.4,3,3.2,.55], [11.5,1.2,4,.55], [16.4,2.4,3.4,.55], [21,0,6,1], [26,2,3.2,.55], [31,0,7,1]],
    foods: [[0,1.2,'cheese'], [3.3,2.4,'cheese'], [7.4,3.9,'cheese'], [12,2.1,'egg'], [16.4,3.3,'egg'], [23,1.2,'egg'], [26,2.9,'shoe']],
    enemies: [[10.8,2.1,'slime'], [20,1.1,'slime'], [29,1.1,'slime']], totems: [[8.2,4], [17.4,3.4], [30.4,1.1]], hazards: [[14,-.15,2.1]], portalX: 33
  },
  {
    name: 'O LIXÃO FERMENTADO', subtitle: 'Quanto pior, mais forte', sky: 0x18100a, fog: 0x241708, accent: 0xffcc35, required: 4,
    platforms: [[-3,0,6,1], [2.3,1.7,3,.55], [6.5,3.2,3,.55], [10.6,1.2,3.2,.55], [15,3.4,3.3,.55], [19.6,1,4,.55], [24.3,3.2,3,.55], [29,1.2,3.4,.55], [34,3.8,3,.55], [39,0,7,1]],
    foods: [[-.5,1.2,'egg'], [2.3,2.6,'shoe'], [6.5,4.1,'shoe'], [10.6,2.1,'fish'], [15,4.3,'shoe'], [19.4,1.9,'fish'], [24.3,4.1,'fish'], [29,2.1,'sock'], [34,4.7,'sock']],
    enemies: [[9.8,2.1,'slime'], [18.5,1.9,'fly'], [27.9,2.1,'slime'], [37.6,1.1,'fly']], totems: [[7.4,4.2], [16,4.4], [25.2,4.2], [38.6,1.1]], hazards: [[12.5,-.15,1.4], [31,-.15,1.7]], portalX: 41
  },
  {
    name: 'A COZINHA PROIBIDA', subtitle: 'O banquete final', sky: 0x14070d, fog: 0x260b16, accent: 0xff4f78, required: 5,
    platforms: [[-3,0,7,1], [3,2,3,.55], [7,4,3,.55], [11.2,2.2,3,.55], [15.7,.7,4,.55], [20.4,3,3,.55], [24.7,5,3,.55], [29,2.6,4,.55], [34,4.5,3,.55], [39,2,3,.55], [44,0,9,1]],
    foods: [[0,1.2,'shoe'], [3,2.9,'fish'], [7,4.9,'sock'], [11.2,3.1,'fish'], [15.6,1.6,'sock'], [20.4,3.9,'diaper'], [24.7,5.9,'diaper'], [29,3.5,'sock'], [34,5.4,'diaper'], [39,2.9,'diaper']],
    enemies: [[10.4,3.1,'fly'], [14.7,1.6,'slime'], [23.8,5.9,'fly'], [28,3.5,'slime'], [38.3,2.9,'fly']], totems: [[7.9,5], [16.8,1.7], [25.7,6], [35,5.5], [42.7,1.1]], hazards: [[17.8,-.15,1.5], [31.5,-.15,1.5]], portalX: 47, boss: true
  }
];

const FOOD = {
  cheese: { label: 'QUEIJO SUADO', gas: 23, color: 0xffd52e, unlock: 1, emoji: '🧀' },
  egg: { label: 'OVO ESQUECIDO', gas: 29, color: 0xf4ead4, unlock: 1, emoji: '🥚' },
  shoe: { label: 'SAPATO VELHO', gas: 36, color: 0x86512d, unlock: 2, emoji: '👞' },
  fish: { label: 'PEIXE SUSPEITO', gas: 42, color: 0x51cdd4, unlock: 2, emoji: '🐟' },
  sock: { label: 'MEIA RADIOATIVA', gas: 48, color: 0x8d64e8, unlock: 3, emoji: '🧦' },
  diaper: { label: 'FRALDA LENDÁRIA', gas: 58, color: 0xd9f6c6, unlock: 3, emoji: '☣' }
};

const mat = (color, roughness=.72, metalness=.05) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const materials = {
  body: mat(0xd2ff58, .82), belly: mat(0xf3ffb5, .92), dark: mat(0x211632, .8), white: mat(0xffffff, .45),
  pupil: mat(0x090611, .4), platform: mat(0x422f5c, .9), edge: mat(0x7551a1, .65), slime: mat(0x60e77f, .55), portal: mat(0xbfff35, .32, .2)
};

function mesh(geometry, material, parent=world) {
  const value = new THREE.Mesh(geometry, material);
  value.castShadow = true; value.receiveShadow = true; parent.add(value); return value;
}

function createPlayer() {
  const root = new THREE.Group();
  const body = mesh(new THREE.SphereGeometry(.67, 20, 16), materials.body, root); body.scale.set(.92, 1.12, .82); body.position.y = .82;
  const belly = mesh(new THREE.SphereGeometry(.45, 18, 12), materials.belly, root); belly.scale.set(1.05, 1.12, .5); belly.position.set(.1,.73,.5);
  [-.23,.23].forEach(x => {
    const eye = mesh(new THREE.SphereGeometry(.15, 14, 10), materials.white, root); eye.position.set(x,1.12,.52);
    const pupil = mesh(new THREE.SphereGeometry(.065, 10, 8), materials.pupil, root); pupil.position.set(x,1.12,.655);
  });
  [-.36,.36].forEach(x => { const foot = mesh(new THREE.SphereGeometry(.22, 12, 8), materials.dark, root); foot.scale.set(1.25,.55,1.5); foot.position.set(x,.16,.03); });
  const mouth = mesh(new THREE.TorusGeometry(.1,.035,6,14,Math.PI), materials.dark, root); mouth.rotation.z = Math.PI; mouth.position.set(.02,.86,.675);
  const butt = mesh(new THREE.SphereGeometry(.24, 12, 8), materials.body, root); butt.scale.z = .7; butt.position.set(-.56,.62,-.04);
  root.userData.body = body; root.userData.belly = belly; root.userData.mouth = mouth; world.add(root); player.mesh = root;
}

function addLights() {
  scene.add(new THREE.HemisphereLight(0x9f8aff, 0x16101c, 2.2));
  const key = new THREE.DirectionalLight(0xfff1cf, 3); key.position.set(-6,12,8); key.castShadow = true; key.shadow.mapSize.set(1024,1024); key.shadow.camera.left=-18; key.shadow.camera.right=18; key.shadow.camera.top=16; key.shadow.camera.bottom=-8; scene.add(key);
  const rim = new THREE.DirectionalLight(0x74ff9a, 2.2); rim.position.set(8,5,-8); scene.add(rim);
}

function roundedBox(width, height, depth, radius=.16) {
  const shape = new THREE.Shape(); const x=-width/2, y=-height/2;
  shape.moveTo(x+radius,y); shape.lineTo(x+width-radius,y); shape.quadraticCurveTo(x+width,y,x+width,y+radius); shape.lineTo(x+width,y+height-radius); shape.quadraticCurveTo(x+width,y+height,x+width-radius,y+height); shape.lineTo(x+radius,y+height); shape.quadraticCurveTo(x,y+height,x,y+height-radius); shape.lineTo(x,y+radius); shape.quadraticCurveTo(x,y,x+radius,y);
  const geo = new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.06,bevelThickness:.06,bevelSegments:2}); geo.center(); return geo;
}

function createPlatform([x,y,w,h]) {
  const p = mesh(roundedBox(w,h,2.6,.22), materials.platform); p.position.set(x,y-.5,-.1);
  const edge = mesh(new THREE.BoxGeometry(w-.25,.08,2.72), materials.edge); edge.position.set(x,y+.02,-.1);
  p.userData.box = { minX:x-w/2, maxX:x+w/2, top:y+h/2-.5, bottom:y-h/2-.5 }; objects.platforms.push(p);
  for(let i=0;i<Math.max(1,Math.floor(w/1.4));i++) { const pipe=mesh(new THREE.CylinderGeometry(.05,.07,.7,7),materials.dark); pipe.position.set(x-w/2+.6+i*1.3,y-.88,1.35); }
}

function createFood([x,y,type]) {
  const data = FOOD[type]; const root = new THREE.Group(); root.position.set(x,y,0); root.userData = { type, collected:false, baseY:y, phase:Math.random()*6 };
  const core = mesh(type==='egg' ? new THREE.SphereGeometry(.27,12,9) : new THREE.DodecahedronGeometry(.3,0), mat(data.color,.58), root);
  core.scale.set(type==='shoe'?1.5:1,type==='fish'?.65:1,type==='diaper'?1.3:1); core.rotation.z=.25;
  const ring = mesh(new THREE.TorusGeometry(.48,.025,5,28), new THREE.MeshBasicMaterial({color:data.color,transparent:true,opacity:.5}), root); ring.rotation.x=Math.PI/2;
  const light = new THREE.PointLight(data.color,1.2,3); root.add(light); world.add(root); objects.foods.push(root);
}

function createEnemy([x,y,type]) {
  const root = new THREE.Group(); root.position.set(x,y,0); root.userData={type,startX:x,dir:Math.random()>.5?1:-1,health:type==='fly'?1:2,dead:false,time:Math.random()*5};
  const body=mesh(type==='fly'?new THREE.SphereGeometry(.3,10,8):new THREE.SphereGeometry(.42,12,9),type==='fly'?materials.dark:materials.slime,root); body.scale.set(type==='fly'?1.2:1,type==='fly'?.8:.7,1);
  [-.13,.13].forEach(ex=>{const eye=mesh(new THREE.SphereGeometry(.08,8,6),materials.white,root);eye.position.set(ex,.12,.29);});
  if(type==='fly') [-1,1].forEach(side=>{const wing=mesh(new THREE.SphereGeometry(.23,8,6),new THREE.MeshPhysicalMaterial({color:0xd7faff,transparent:true,opacity:.5}),root);wing.scale.set(1,.25,1);wing.position.set(side*.35,.12,0);});
  world.add(root); objects.enemies.push(root);
}

function createTotem([x,y], index) {
  const root=new THREE.Group(); root.position.set(x,y,0); root.userData={active:false,index};
  const post=mesh(new THREE.CylinderGeometry(.16,.24,1.25,8),materials.dark,root);post.position.y=.45;
  const head=mesh(new THREE.DodecahedronGeometry(.38,0),mat(0x6f4a8f,.7),root);head.position.y=1.18;
  const ring=mesh(new THREE.TorusGeometry(.48,.07,7,18),mat(0x75479b,.4),root);ring.position.y=1.18;ring.rotation.x=Math.PI/2;root.userData.ring=ring;
  world.add(root);objects.totems.push(root);
}

function createHazard([x,y,w]) {
  const acid=mesh(new THREE.BoxGeometry(w,.18,2.3),new THREE.MeshStandardMaterial({color:0x7eff31,emissive:0x315d13,emissiveIntensity:1.4,roughness:.3}));acid.position.set(x,y,0);acid.userData={minX:x-w/2,maxX:x+w/2,top:y+.2};objects.hazards.push(acid);
}

function createPortal(x) {
  const root=new THREE.Group();root.position.set(x,1.35,0);
  const outer=mesh(new THREE.TorusGeometry(.85,.13,10,28),materials.portal,root);outer.scale.y=1.35;
  const inner=mesh(new THREE.CircleGeometry(.7,32),new THREE.MeshBasicMaterial({color:0x83ff43,transparent:true,opacity:.13,side:THREE.DoubleSide}),root);inner.scale.y=1.35;
  const light=new THREE.PointLight(0xaaff44,0,7);root.add(light);root.userData={outer,inner,light,open:false};world.add(root);objects.portal=root;
}

function createBoss(x=44) {
  const root=new THREE.Group();root.position.set(x,1.15,0);root.userData={health:8,maxHealth:8,dir:-1,dead:false,cooldown:1};
  const body=mesh(new THREE.SphereGeometry(1.05,18,14),mat(0xba4363,.65),root);body.scale.set(1,1.15,.8);
  const crown=mesh(new THREE.ConeGeometry(.62,.7,5),mat(0xffd93d,.35,.5),root);crown.position.y=1.15;crown.rotation.z=.1;
  [-.35,.35].forEach(ex=>{const eye=mesh(new THREE.SphereGeometry(.19,12,8),materials.white,root);eye.position.set(ex,.35,.78);const pupil=mesh(new THREE.SphereGeometry(.08,8,6),materials.pupil,root);pupil.position.set(ex,.35,.94);});
  world.add(root);objects.boss=root;
}

function addBackdrop(level) {
  scene.background.setHex(level.sky); scene.fog.color.setHex(level.fog);
  for(let i=0;i<34;i++) {
    const h=2+Math.random()*7, w=.7+Math.random()*1.7;
    const block=mesh(new THREE.BoxGeometry(w,h,.8),mat(new THREE.Color(level.accent).multiplyScalar(.12+Math.random()*.09),1));
    block.position.set(-8+i*1.8,-1+h/2,-5-Math.random()*5); block.castShadow=false; objects.decorations.push(block);
    if(Math.random()>.35){const window=mesh(new THREE.PlaneGeometry(.12,.22),new THREE.MeshBasicMaterial({color:level.accent,transparent:true,opacity:.2+Math.random()*.35}));window.position.set(block.position.x,Math.random()*h,block.position.z+.42);objects.decorations.push(window);}
  }
  for(let i=0;i<20;i++){const bubble=mesh(new THREE.SphereGeometry(.05+Math.random()*.12,7,5),new THREE.MeshBasicMaterial({color:level.accent,transparent:true,opacity:.18}));bubble.position.set(Math.random()*55-8,Math.random()*10,-2-Math.random()*4);bubble.userData.float=true;bubble.userData.speed=.2+Math.random()*.4;objects.decorations.push(bubble);}
}

function clearLevel() {
  while(world.children.length) world.remove(world.children[0]);
  Object.keys(objects).forEach(k=>objects[k]=Array.isArray(objects[k])?[]:null);
}

function loadLevel(index) {
  clearLevel(); state.level=index; state.domination=0; state.gas=Math.min(state.maxGas,28+index*8); state.evolution=index+1; state.levelStarted=performance.now(); state.mode='playing';
  const level=LEVELS[index]; addBackdrop(level); createPlayer();
  level.platforms.forEach(createPlatform); level.foods.forEach(createFood); level.enemies.forEach(createEnemy); level.totems.forEach(createTotem); level.hazards.forEach(createHazard); createPortal(level.portalX); if(level.boss)createBoss(44);
  player.spawn.set(-3,1,0);player.mesh.position.copy(player.spawn);player.velocity.set(0,0,0);player.invulnerable=1;
  ui.stage.textContent=level.name;ui.evolution.textContent=`INTESTINO ${['I','II','III'][index]}`;ui.questTitle.textContent=`Domine ${level.required} totens`;
  ui.questDetail.textContent=index===0?'Coma para abastecer. Peide perto dos totens.':index===1?'Agora cada evolução exige comidas piores.':'Derrube o Rei da Cozinha e abra o portal.';
  ui.bossBar.classList.toggle('hidden',!level.boss);updateUI();hideScreens();toast(`${level.subtitle.toUpperCase()} · FASE ${index+1}`);
}

function hideScreens(){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('visible'));}
function showScreen(name){state.mode=name;ui[name].classList.add('visible');}
function formatTime(seconds){const m=Math.floor(seconds/60);const s=Math.floor(seconds%60).toString().padStart(2,'0');return `${m}:${s}`;}
let toastTimer;
function toast(text){ui.toast.textContent=text;ui.toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>ui.toast.classList.remove('show'),1500);}

function updateUI(){
  const level=LEVELS[state.level];ui.gas.style.width=`${state.gas/state.maxGas*100}%`;ui.gasValue.textContent=`${Math.round(state.gas)}%`;
  ui.domination.style.width=`${Math.min(100,state.domination/level.required*100)}%`;ui.dominationValue.textContent=`${Math.min(state.domination,level.required)}/${level.required}`;
  if(objects.boss)ui.bossHealth.style.width=`${Math.max(0,objects.boss.userData.health/objects.boss.userData.maxHealth*100)}%`;
}

function particles(position,color,count=12,power=1) {
  for(let i=0;i<count;i++){
    const p=mesh(new THREE.SphereGeometry(.05+Math.random()*.1,6,4),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.75}));p.position.copy(position);p.position.y+=.45;
    p.userData={velocity:new THREE.Vector3((-1.2-Math.random()*2)*player.facing,power*(Math.random()*1.5-.15),(Math.random()-.5)*1.5),life:.65+Math.random()*.55,maxLife:1.2};objects.particles.push(p);
  }
}

function playFart(power){
  if(state.muted)return;const ctx=playFart.ctx||(playFart.ctx=new AudioContext());const now=ctx.currentTime;
  const osc=ctx.createOscillator(),gain=ctx.createGain(),filter=ctx.createBiquadFilter();osc.type='sawtooth';osc.frequency.setValueAtTime(75+Math.random()*18,now);osc.frequency.exponentialRampToValueAtTime(28,now+.22+power*.12);filter.type='lowpass';filter.frequency.value=190;
  gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.18,now+.015);gain.gain.exponentialRampToValueAtTime(.0001,now+.25+power*.13);osc.connect(filter).connect(gain).connect(ctx.destination);osc.start();osc.stop(now+.45);
  const buffer=ctx.createBuffer(1,ctx.sampleRate*.32,ctx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);const noise=ctx.createBufferSource(),ng=ctx.createGain(),nf=ctx.createBiquadFilter();noise.buffer=buffer;nf.type='lowpass';nf.frequency.value=120;ng.gain.value=.09;noise.connect(nf).connect(ng).connect(ctx.destination);noise.start(now);
}

function fart(){
  if(state.gas<10||state.fartCooldown>0){if(state.gas<10)toast('TANQUE SECO — COMA ALGUMA COISA');return;}
  const power=Math.min(1.7,.75+state.gas/110+state.evolution*.12);state.gas=Math.max(0,state.gas-(16-state.evolution*2));state.fartCooldown=.28;state.shake=.32;
  player.velocity.x+=player.facing*4.8*power;player.velocity.y+=player.grounded?3.6:2.2*power;particles(player.mesh.position,0xbaff39,14+state.evolution*5,power);playFart(power);
  objects.totems.forEach(t=>{if(!t.userData.active&&t.position.distanceTo(player.mesh.position)<3.4+state.evolution*.35){t.userData.active=true;t.userData.ring.material=mat(0xcaff36,.3,.1);state.domination++;particles(t.position,0xcaff36,20,1.4);toast('ZONA DOMINADA +1');}});
  objects.enemies.forEach(e=>{if(!e.userData.dead&&Math.abs(e.position.x-player.mesh.position.x)<3.1&&Math.abs(e.position.y-player.mesh.position.y)<2.1){e.userData.health-=state.evolution>=3?2:1;e.userData.dir=player.facing;e.position.x-=player.facing*1.1;if(e.userData.health<=0){e.userData.dead=true;particles(e.position,0x7fff5b,18,1.2);}}});
  if(objects.boss&&!objects.boss.userData.dead&&Math.abs(objects.boss.position.x-player.mesh.position.x)<4){objects.boss.userData.health--;objects.boss.position.x-=player.facing*.8;particles(objects.boss.position,0xff5277,24,1.6);if(objects.boss.userData.health<=0){objects.boss.userData.dead=true;toast('O REI CAIU. O FEDOR VENCEU.');}updateUI();}
  checkPortal();updateUI();
}

function eat(food){
  food.userData.collected=true;food.visible=false;const data=FOOD[food.userData.type];state.gas=Math.min(state.maxGas,state.gas+data.gas);state.food++;state.totalFood++;player.squash=.28;
  particles(food.position,data.color,14,1);toast(`${data.emoji} ${data.label} · +${data.gas}% PRESSÃO`);updateUI();
}

function checkPortal(){
  const level=LEVELS[state.level];const bossReady=!objects.boss||objects.boss.userData.dead;
  if(state.domination>=level.required&&bossReady&&!objects.portal.userData.open){objects.portal.userData.open=true;objects.portal.userData.light.intensity=3;toast('PORTAL ABERTO — CORRA!');ui.questTitle.textContent='Entre no portal';ui.questDetail.textContent='A próxima nojeira está esperando.';}
}

function damage(sourceX){
  if(player.invulnerable>0)return;player.invulnerable=1.4;player.velocity.set(player.mesh.position.x<sourceX?-6:6,6,0);state.gas=Math.max(0,state.gas-18);state.shake=.5;toast('VAZAMENTO DE PRESSÃO!');updateUI();
}

function respawn(){state.deaths++;player.mesh.position.copy(player.spawn);player.velocity.set(0,0,0);player.invulnerable=1.5;state.gas=Math.max(20,state.gas-10);}

function finishLevel(){
  const elapsed=(performance.now()-state.levelStarted)/1000;state.totalTime+=elapsed;state.mode='level';document.querySelector('#level-title').textContent=['O ESGOTO CEDEU','O LIXÃO SE CURVOU','A COZINHA CAIU'][state.level];document.querySelector('#level-time').textContent=formatTime(elapsed);document.querySelector('#level-food').textContent=state.food;ui.level.classList.add('visible');
}

function updatePlayer(dt){
  const accel=player.grounded?38:22,maxSpeed=6.8+state.evolution*.25,friction=player.grounded?.78:.94;
  if(input.left){player.velocity.x-=accel*dt;player.facing=-1;state.hasMoved=true;}if(input.right){player.velocity.x+=accel*dt;player.facing=1;state.hasMoved=true;}if(!input.left&&!input.right)player.velocity.x*=Math.pow(friction,dt*60);
  player.velocity.x=THREE.MathUtils.clamp(player.velocity.x,-maxSpeed,maxSpeed);state.coyote=player.grounded?.11:Math.max(0,state.coyote-dt);state.jumpBuffer=justPressed.jump?.13:Math.max(0,state.jumpBuffer-dt);
  if(state.jumpBuffer>0&&state.coyote>0){player.velocity.y=9.3;player.grounded=false;state.coyote=0;state.jumpBuffer=0;player.squash=.2;}
  if(justPressed.fart)fart();player.velocity.y-=22*dt;player.velocity.y=Math.max(-17,player.velocity.y);
  const oldY=player.mesh.position.y;player.mesh.position.x+=player.velocity.x*dt;player.mesh.position.y+=player.velocity.y*dt;player.grounded=false;
  const half=.42,bottom=player.mesh.position.y;objects.platforms.forEach(p=>{const b=p.userData.box;if(player.mesh.position.x+half>b.minX&&player.mesh.position.x-half<b.maxX&&oldY>=b.top-.08&&bottom<=b.top+.1&&player.velocity.y<=0){player.mesh.position.y=b.top;player.velocity.y=0;player.grounded=true;}});
  if(player.mesh.position.y<-5)respawn();
  objects.hazards.forEach(h=>{if(player.mesh.position.x>h.userData.minX&&player.mesh.position.x<h.userData.maxX&&player.mesh.position.y<h.userData.top+.8)damage(h.position.x);});
  objects.foods.forEach(f=>{if(!f.userData.collected&&f.position.distanceTo(player.mesh.position)<1){eat(f);}});
  objects.enemies.forEach(e=>{if(!e.userData.dead&&e.position.distanceTo(player.mesh.position)<.85)damage(e.position.x);});
  if(objects.boss&&!objects.boss.userData.dead&&objects.boss.position.distanceTo(player.mesh.position)<1.35)damage(objects.boss.position.x);
  if(objects.portal?.userData.open&&objects.portal.position.distanceTo(player.mesh.position)<1.15)finishLevel();
  player.mesh.rotation.y=THREE.MathUtils.lerp(player.mesh.rotation.y,player.facing===1?0:Math.PI,.18);player.mesh.userData.body.rotation.z=-player.velocity.x*.025;
  player.squash=Math.max(0,player.squash-dt);const bounce=player.squash>0?Math.sin(player.squash*30)*.1:0;player.mesh.scale.set(1+bounce,1-bounce,1+bounce);player.mesh.visible=player.invulnerable<=0||Math.floor(player.invulnerable*12)%2===0;player.invulnerable=Math.max(0,player.invulnerable-dt);
}

function updateWorld(dt,time){
  state.fartCooldown=Math.max(0,state.fartCooldown-dt);
  objects.foods.forEach(f=>{if(!f.userData.collected){f.rotation.y+=dt*1.4;f.position.y=f.userData.baseY+Math.sin(time*2+f.userData.phase)*.12;}});
  objects.totems.forEach(t=>{t.userData.ring.rotation.z+=dt*(t.userData.active?4:1);if(t.userData.active)t.userData.ring.scale.setScalar(1+Math.sin(time*6+t.userData.index)*.08);});
  objects.enemies.forEach(e=>{if(e.userData.dead){e.scale.multiplyScalar(Math.pow(.02,dt));if(e.scale.x<.03)e.visible=false;return;}e.userData.time+=dt;if(e.userData.type==='fly'){e.position.y+=Math.sin(e.userData.time*5)*dt*.6;}e.position.x+=e.userData.dir*dt*(1.2+state.level*.25);if(Math.abs(e.position.x-e.userData.startX)>1.5)e.userData.dir*=-1;e.rotation.y=e.userData.dir>0?0:Math.PI;});
  if(objects.boss&&!objects.boss.userData.dead){const b=objects.boss;b.userData.cooldown-=dt;if(b.userData.cooldown<=0){b.userData.dir=player.mesh.position.x<b.position.x?-1:1;b.userData.cooldown=.8;}b.position.x+=b.userData.dir*dt*1.3;b.position.x=THREE.MathUtils.clamp(b.position.x,41,47);b.rotation.z=Math.sin(time*3)*.05;}
  if(objects.portal){const p=objects.portal;p.userData.outer.rotation.z+=dt*(p.userData.open?2.7:.45);p.userData.inner.material.opacity=p.userData.open?.25+Math.sin(time*4)*.07:.06;}
  for(let i=objects.particles.length-1;i>=0;i--){const p=objects.particles[i];p.userData.life-=dt;p.userData.velocity.y-=1.3*dt;p.position.addScaledVector(p.userData.velocity,dt);p.scale.setScalar(Math.max(.01,p.userData.life/p.userData.maxLife));p.material.opacity=Math.max(0,p.userData.life);if(p.userData.life<=0){world.remove(p);objects.particles.splice(i,1);}}
  objects.decorations.forEach(d=>{if(d.userData.float){d.position.y+=d.userData.speed*dt;if(d.position.y>11)d.position.y=-1;}});
}

function updateCamera(dt){
  const targetX=player.mesh?player.mesh.position.x+2.2*player.facing:0,targetY=player.mesh?Math.max(3.3,player.mesh.position.y+2.2):4;
  camera.position.x=THREE.MathUtils.damp(camera.position.x,targetX,4,dt);camera.position.y=THREE.MathUtils.damp(camera.position.y,targetY,4,dt);camera.position.z=THREE.MathUtils.damp(camera.position.z,12.5,4,dt);
  if(state.shake>0){camera.position.x+=(Math.random()-.5)*state.shake;camera.position.y+=(Math.random()-.5)*state.shake;state.shake=Math.max(0,state.shake-dt*1.8);}camera.lookAt(camera.position.x+.5,camera.position.y-1.8,0);
}

function animate(){
  requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.033),time=performance.now()/1000;
  if(state.mode==='playing'){updatePlayer(dt);updateWorld(dt,time);updateCamera(dt);justPressed.jump=false;justPressed.fart=false;}
  renderer.render(scene,camera);
}

function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w/h<.8?62:48;camera.updateProjectionMatrix();}
addEventListener('resize',resize);resize();addLights();

const keyMap={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'jump',KeyW:'jump',Space:'fart'};
addEventListener('keydown',e=>{const key=keyMap[e.code];if(key){e.preventDefault();if(!input[key]&&(key==='jump'||key==='fart'))justPressed[key]=true;input[key]=true;}if(e.code==='Escape'&&state.mode==='playing')pauseGame();});
addEventListener('keyup',e=>{const key=keyMap[e.code];if(key)input[key]=false;});
document.querySelectorAll('[data-control]').forEach(button=>{const key=button.dataset.control;const down=e=>{e.preventDefault();if(!input[key]&&(key==='jump'||key==='fart'))justPressed[key]=true;input[key]=true;button.classList.add('active');};const up=e=>{e.preventDefault();input[key]=false;button.classList.remove('active');};button.addEventListener('pointerdown',down);button.addEventListener('pointerup',up);button.addEventListener('pointercancel',up);button.addEventListener('pointerleave',up);});

function pauseGame(){if(state.mode!=='playing')return;showScreen('pause');}
document.querySelector('#start-button').onclick=()=>{loadLevel(0);};
document.querySelector('#pause').onclick=pauseGame;
document.querySelector('#resume-button').onclick=()=>{hideScreens();state.mode='playing';clock.getDelta();};
document.querySelector('#restart-button').onclick=()=>loadLevel(state.level);
document.querySelector('#retry-button').onclick=()=>loadLevel(state.level);
document.querySelector('#next-button').onclick=()=>{state.food=0;if(state.level<LEVELS.length-1)loadLevel(state.level+1);else{const final=state.totalTime;state.savedBest=!state.savedBest||final<state.savedBest?final:state.savedBest;localStorage.setItem('peidao-best',state.savedBest);document.querySelector('#final-time').textContent=formatTime(final);document.querySelector('#final-food').textContent=state.totalFood;hideScreens();showScreen('ending');}};
document.querySelector('#again-button').onclick=()=>{state.totalTime=0;state.totalFood=0;state.food=0;loadLevel(0);};
document.querySelector('#mute').onclick=e=>{state.muted=!state.muted;e.currentTarget.textContent=state.muted?'×':'♪';};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.mode==='playing')pauseGame();});
addEventListener('blur',()=>{Object.keys(input).forEach(key=>input[key]=false);});

loadLevel(0);state.mode='intro';ui.start.classList.add('visible');setTimeout(()=>ui.loading.classList.add('done'),450);animate();
