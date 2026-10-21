import * as T from 'three';
const config=window.RENDER_CONFIG||{},recipeKind=config.recipe||'masala-dosa',W=config.width||854,H=config.height||480;
const scene=new T.Scene();scene.background=new T.Color('#f5eddf');scene.fog=new T.Fog('#f5eddf',15,30);
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true,powerPreference:'low-power'});
renderer.setSize(W,H);renderer.setPixelRatio(1);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
document.body.prepend(renderer.domElement);
const camera=new T.PerspectiveCamera(40,W/H,.1,60);camera.position.set(5.7,4.5,8.2);camera.lookAt(0,2,0);
scene.add(new T.AmbientLight('#ffeed7',.7));scene.add(new T.HemisphereLight('#f9fcff','#bcb596',1.7));
const sun=new T.DirectionalLight('#fff3d9',3.1);sun.position.set(-3,7,5);sun.castShadow=true;sun.shadow.mapSize.set(512,512);Object.assign(sun.shadow.camera,{left:-6,right:6,top:6,bottom:-5,near:.5,far:18});sun.shadow.bias=-.0015;sun.shadow.normalBias=.025;scene.add(sun);
const rim=new T.DirectionalLight('#d5edee',1.1);rim.position.set(4,4,-3);scene.add(rim);
const mat=(color,roughness=.65)=>new T.MeshStandardMaterial({color,roughness,metalness:0});
const skin=mat('#efb58f'),hair=mat('#694431'),hairLight=mat('#8c6042'),white=mat('#fffcf1'),peach=mat('#df9b86'),mint=mat('#8bb5a4'),metal=mat('#9eaca9',.28),dark=mat('#303b3e'),gold=mat('#d5ae68'),wood=mat('#ceac86'),cream=mat('#ece7d7');
const ballGeo=new T.SphereGeometry(1,20,14),boxGeo=new T.BoxGeometry(1,1,1);
function mesh(geo,material,parent=scene){const m=new T.Mesh(geo,material);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function ball(parent,material,x,y,z,sx,sy=sx,sz=sx){const m=mesh(ballGeo,material,parent);m.position.set(x,y,z);m.scale.set(sx,sy,sz);return m;}
function box(parent,material,x,y,z,sx,sy,sz){const m=mesh(boxGeo,material,parent);m.position.set(x,y,z);m.scale.set(sx,sy,sz);return m;}
function cylinder(parent,material,x,y,z,r,h,rt=r,segments=32){const m=mesh(new T.CylinderGeometry(rt,r,h,segments),material,parent);m.position.set(x,y,z);return m;}
function link(parent,material,a,b,r){const v=new T.Vector3().subVectors(b,a),m=mesh(new T.CylinderGeometry(r,r,v.length(),10),material,parent);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return m;}
const vec=(x,y,z)=>new T.Vector3(x,y,z),smooth=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v)},lerp=T.MathUtils.lerp;
// Set construction: dimensional cupboards, window reveal, counter and practical objects.
box(scene,mat('#eadfcc'),0,-.12,0,16,.2,13);box(scene,mat('#f3ecdd'),0,3,-2.4,13,6,.15);
box(scene,cream,0,1.52,.1,8.4,.19,2.7);box(scene,wood,0,.75,.15,8.25,1.45,2.5);
for(const x of [-3,-1,1,3]){box(scene,mint,x,.79,1.416,1.89,1.16,.06);box(scene,gold,x,1.15,1.47,.46,.045,.045);}
for(const x of [1.3,2.8]){box(scene,mint,x,3.15,-2.22,1.4,1.25,.35);box(scene,mat('#a8c8b5'),x,3.15,-2.01,1.22,1.05,.045);box(scene,gold,x+.42,3.13,-1.95,.04,.25,.04);}
box(scene,white,-2.8,3.18,-2.2,1.6,1.8,.16);box(scene,mat('#bcdde3'),-2.8,3.18,-2.08,1.37,1.57,.04);
box(scene,white,-2.8,3.18,-2.02,.055,1.6,.08);box(scene,white,-2.8,3.18,-2.02,1.4,.055,.08);box(scene,cream,-2.8,2.26,-1.96,1.83,.12,.45);
box(scene,wood,-.1,3.1,-2,1.6,.08,.45);for(let i=0;i<2;i++){cylinder(scene,mat(i?'#d6dcba':'#e1c58f'),-.55+i*.45,3.31,-1.95,.12,.32);cylinder(scene,wood,-.55+i*.45,3.49,-1.95,.13,.06);}
cylinder(scene,peach,.4,3.28,-1.95,.15,.25,.19);for(let i=0;i<5;i++){const leaf=ball(scene,mat('#729b72'),.4+Math.sin(i*2)*.16,3.58+Math.cos(i)*.08,-1.95,.08,.24,.035);leaf.rotation.z=Math.sin(i*2)*.8;}
const PAN=vec(.35,1.79,.25),PLATE=vec(2.47,1.65,.69),plateRadius=1.04;
const stoveBase=box(scene,dark,PAN.x,1.67,PAN.z,2.2,.14,1.9);for(const x of [-.35,.35])cylinder(scene,metal,x+.35,1.745,-.1,.36,.025);
const panMesh=cylinder(scene,dark,PAN.x,1.78,PAN.z,.94,.075);const panTop=cylinder(scene,mat('#485052'),PAN.x,1.825,PAN.z,.88,.015);
const panHandle=box(scene,dark,1.55,1.79,.25,.8,.1,.15);
cylinder(scene,white,PLATE.x,PLATE.y,PLATE.z,plateRadius,.055);const plateRim=mesh(new T.TorusGeometry(plateRadius-.025,.03,8,48),mint);plateRim.rotation.x=Math.PI/2;plateRim.position.copy(PLATE).y+=.035;
const plateInner=mesh(new T.TorusGeometry(.92,.012,6,40),mat('#d1e2d1'));plateInner.rotation.x=Math.PI/2;plateInner.position.copy(PLATE).y+=.032;
cylinder(scene,white,3.03,1.72,.33,.2,.12,.24);cylinder(scene,mat('#b2c98d'),3.03,1.79,.33,.19,.015);
function bowl(x,z,color){const b=ball(scene,mat(color),x,1.68,z,.28,.16,.28);cylinder(scene,white,x,1.75,z,.26,.025);return b;}
if(recipeKind!=='vegetable-sandwich'){
bowl(-2,.82,'#d59077');cylinder(scene,mat('#f5e9c9'),-2,1.77,.82,.24,.02);bowl(-.85,.95,'#85aaa0');
for(let i=0;i<6;i++)ball(scene,mat(recipeKind==='pancakes'?'#b66f78':'#e7c159'),-.85+Math.sin(i*3)*.14,1.79,.95+Math.cos(i*3)*.12,.08);
cylinder(scene,mat('#e4cc76'),-.13,1.78,1.02,.075,.32);cylinder(scene,mint,-.13,1.98,1.02,.045,.1);
}else{
cylinder(scene,white,-2,1.66,.82,.37,.035);for(let i=0;i<3;i++)box(scene,mat('#f1d8a5'),-2,1.71+i*.055,.82,.54,.055,.52);
cylinder(scene,white,-.85,1.66,.88,.45,.035);box(scene,mat('#81ad60'),-1.01,1.705,.85,.4,.04,.4);for(let i=0;i<3;i++){cylinder(scene,mat('#d88e70'),-.83+i*.06,1.735+i*.015,.98,.15,.025);cylinder(scene,mat('#9fc17a'),-.64+i*.035,1.72+i*.02,.71,.13,.025);}
cylinder(scene,white,-.12,1.69,.98,.17,.1,.2);cylinder(scene,mat('#82a36b'),-.12,1.75,.98,.15,.012);
}
// Original MAYA: rounded head, sculpted bob, mesh eyes and a soft white toque.
const chef=new T.Group();chef.position.set(-1.55,0,-.65);scene.add(chef);
ball(chef,white,0,2.12,0,.46,.68,.31);box(chef,peach,0,2.03,.306,.58,.77,.035);box(chef,white,0,2.57,.1,.21,.1,.22);
for(const x of [-.24,.24]){const strap=box(chef,peach,x,2.37,.28,.065,.49,.045);strap.rotation.z=-x*.7;}
ball(chef,peach,0,1.88,.34,.19,.15,.03);for(const x of [-.11,.11])ball(chef,gold,x,2.36,.35,.022);
cylinder(chef,skin,0,2.7,0,.15,.26);const scarf=ball(chef,peach,0,2.62,.19,.2,.07,.13);
const head=new T.Group();head.position.set(0,3.28,0);chef.add(head);
ball(head,hair,0,.03,-.09,.66,.68,.49);ball(head,skin,0,0,.045,.59,.62,.48);
for(const x of [-.6,.6]){ball(head,skin,x,-.04,.02,.1,.15,.09);ball(head,hair,x*.92,-.2,-.1,.12,.34,.3);}
const blush=mat('#e99c8f');for(const x of [-.37,.37])ball(head,blush,x,-.17,.425,.115,.06,.018);
ball(head,skin,0,-.085,.53,.075,.07,.085);
const eyes=[],pupils=[];for(const x of [-.225,.225]){
 const eye=new T.Group();eye.position.set(x,.06,.455);head.add(eye);eyes.push(eye);
 ball(eye,white,0,0,0,.174,.22,.072);ball(eye,mat('#4b8d83'),x<0?.014:-.014,-.008,.066,.108,.145,.035);
 const pupil=ball(eye,mat('#203c3d'),x<0?.014:-.014,-.002,.094,.055,.105,.018);pupils.push(pupil);
 ball(eye,white,-.03,.063,.11,.035,.047,.012);ball(eye,white,.042,-.06,.102,.017,.02,.009);
 const brow=ball(head,hair,x,.33,.42,.15,.027,.035);brow.rotation.z=x<0?.1:-.1;
}
for(let i=0;i<5;i++){const lock=ball(head,i%2?hair:hairLight,-.44+i*.2,.45-Math.sin(i)*.03,.32,.16,.25,.17);lock.rotation.z=-.45+i*.12;}
const mouth=new T.Group();mouth.position.set(0,-.32,.475);head.add(mouth);
const mouthOpen=ball(mouth,mat('#713b3e'),0,0,.015,.12,.08,.035),tongue=ball(mouth,mat('#e99699'),0,-.027,.046,.065,.022,.01);
const smile=mesh(new T.TorusGeometry(.115,.014,6,20,Math.PI),mat('#975948'),mouth);smile.rotation.z=Math.PI;smile.position.z=.04;
cylinder(head,white,0,.62,-.01,.55,.22,.58);for(let i=0;i<5;i++)ball(head,white,Math.sin(i*1.3)*.33,.88+Math.cos(i*1.7)*.075,Math.cos(i*1.3)*.2,.32,.28,.29);
// Articulated two-link arms: elbow solved from the shoulder and hand target.
const armRig=[];for(const side of [-1,1]){
 const group=new T.Group();scene.add(group);const upper=mesh(new T.CylinderGeometry(.115,.14,1,10),white,group),lower=mesh(new T.CylinderGeometry(.1,.115,1,10),white,group),elbow=ball(group,white,0,0,0,.12),hand=ball(group,skin,0,0,0,.12,.13,.11);armRig.push({side,upper,lower,elbow,hand});
}
function segment(object,a,b){const d=new T.Vector3().subVectors(b,a);object.position.copy(a).add(b).multiplyScalar(.5);object.scale.y=d.length();object.quaternion.setFromUnitVectors(vec(0,1,0),d.normalize());}
function solveArm(rig,target){const shoulder=vec(chef.position.x+rig.side*.4,2.5,chef.position.z+.04),delta=target.clone().sub(shoulder),dist=delta.length(),upper=.88,lower=.95,max=upper+lower-.005;
 if(dist>max)target=shoulder.clone().add(delta.multiplyScalar(max/dist));
 const direction=target.clone().sub(shoulder).normalize(),d=shoulder.distanceTo(target),along=(upper*upper-lower*lower+d*d)/(2*Math.max(.001,d)),height=Math.sqrt(Math.max(.001,upper*upper-along*along));
 const perpendicular=vec(rig.side*.15,-1,.12).addScaledVector(direction,-vec(rig.side*.15,-1,.12).dot(direction)).normalize();const elbow=shoulder.clone().addScaledVector(direction,along).addScaledVector(perpendicular,height);
 segment(rig.upper,shoulder,elbow);segment(rig.lower,elbow,target);rig.elbow.position.copy(elbow);rig.hand.position.copy(target);return target;
}
const tool=new T.Group();scene.add(tool);const handle=mesh(new T.CylinderGeometry(.035,.035,.59,10),wood,tool);handle.rotation.z=Math.PI/2-.27;handle.position.set(-.29,.08,0);
const ladle=ball(tool,metal,0,0,0,.16,.06,.16),blade=box(tool,metal,.02,0,0,.36,.035,.28);blade.visible=false;
if(recipeKind==='vegetable-sandwich'){panMesh.visible=false;panTop.visible=false;panHandle.visible=false;box(scene,wood,PAN.x,1.8,PAN.z,1.8,.08,1.65);}
const food=new T.Group();scene.add(food);const batter=cylinder(food,mat('#fff0ce'),0,0,0,.76,.022);
const toasted=mat('#e8b663');const folded=mesh(new T.CylinderGeometry(.76,.76,.045,40,1,false,0,Math.PI),toasted,food);folded.rotation.y=-Math.PI/2;folded.visible=false;const foldHinge=new T.Group();food.add(foldHinge);foldHinge.position.y=.025;const flap=mesh(new T.CylinderGeometry(.76,.76,.022,40,1,false,0,Math.PI),toasted,foldHinge);flap.rotation.y=Math.PI/2;foldHinge.visible=false;
const pancakeTop=cylinder(food,toasted,0,.11,0,.69,.12);pancakeTop.visible=false;
const sandwich=new T.Group();food.add(sandwich);const bread=mat('#f1d8a5');box(sandwich,bread,0,.055,0,1.08,.11,1.02);const vegetables=new T.Group();sandwich.add(vegetables);box(vegetables,mat('#81ad60'),0,.135,0,1.03,.055,.98);for(const x of [-.25,.25]){cylinder(vegetables,mat('#d88e70'),x,.18,.1,.23,.045);cylinder(vegetables,mat('#9fc17a'),x,.23,-.17,.22,.04);}
const spreadLayer=box(sandwich,mat('#82a36b'),0,.118,0,1.01,.012,.95);spreadLayer.visible=false;
const carriedVeg=new T.Group();tool.add(carriedVeg);const carriedLettuce=box(carriedVeg,mat('#81ad60'),0,.045,0,.35,.035,.3),carriedTomato=cylinder(carriedVeg,mat('#d88e70'),0,.045,0,.15,.035),carriedCucumber=cylinder(carriedVeg,mat('#9fc17a'),0,.045,0,.14,.035);
const topBread=box(sandwich,bread,0,.305,0,1.08,.11,1.02);sandwich.visible=false;
const speckles=new T.Group();food.add(speckles);for(let i=0;i<26;i++){const a=i*2.399,r=.68*Math.sqrt((i+.5)/26);const spot=cylinder(speckles,mat('#bb8649'),Math.cos(a)*r,.014,Math.sin(a)*r,.018+(i%3)*.006,.002);}
const filling=new T.Group();food.add(filling);for(let i=0;i<9;i++)ball(filling,mat(i%3?'#e4ba50':'#8caa58'),-.22+Math.sin(i*2.4)*.16,.08,.2+Math.cos(i*2.4)*.1,.07,.065,.075);
const stream=mesh(new T.CylinderGeometry(.025,.035,1,8),mat('#fff0ce'));stream.visible=false;
const steam=new T.Group();scene.add(steam);const steamMaterial=new T.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.24,depthWrite:false});for(let i=0;i<3;i++)ball(steam,steamMaterial,(i-1)*.25,0,0,.06,.17,.06);
const carriedFilling=new T.Group();tool.add(carriedFilling);for(let i=0;i<3;i++)ball(carriedFilling,mat('#e4ba50'),(i-1)*.06,.055,0,.055);
const oil=ball(tool,mat('#d9ba57'),0,.035,0,.105,.015,.105);
const oilDrop=ball(scene,mat('#d9ba57'),0,0,0,.02,.05,.02);
const lesson=config.lesson||{steps:[],captions:[],envelope:[]};const preview=!!config.preview,duration=config.duration||lesson.duration||8.79;
let state={};
function actionAt(t){if(preview){const p=t/duration;if(p<.24)return {key:'welcome',p:p/.24};if(p<.43)return{key:'pour',p:(p-.24)/.19};if(p<.62)return{key:'spread',p:(p-.43)/.19};if(p<.72)return{key:'cook',p:(p-.62)/.1};if(p<.8)return{key:'fill',p:(p-.72)/.08};if(p<.87)return{key:'fold',p:(p-.8)/.07};return{key:'serve',p:(p-.87)/.13};}
 const step=lesson.steps.find(s=>t>=s.start&&t<s.end)||lesson.steps.at(-1);return{key:step?.key||'welcome',p:step?Math.min(1,(t-step.start)/(step.speechEnd-step.start)):0,step};}
function speechProgress(act,t){
 const split={pour:.6,fold:.2,serve:.6,cook:.4}[act.key];
 const sentences=(lesson.segments||[]).filter(s=>s.key===act.key);
 if(split===undefined||sentences.length<2)return act.p;
 const [first,second]=sentences;
 return t<=first.end?Math.max(0,Math.min(1,(t-first.start)/(first.end-first.start)))*split:lerp(split,1,Math.max(0,Math.min(1,(t-first.end)/(second.end-first.end))));
}
function frame(t,draw=true){
 const act=actionAt(t),originalKey=act.key,key=({pick:'pour',layer:'fill',close:'fold',flip:'fold',stack:'fill'})[act.key]||act.key,p=speechProgress(act,t),order=['welcome','safe','ingredients','pour','spread','cook','fill','fold','serve'],index=order.indexOf(key),amp=lesson.envelope[Math.floor(t/.02)]||0;
 chef.position.x=key==='serve'?lerp(-1.05,1.3,smooth(p*1.8)):key==='pour'?lerp(-2.5,-1.05,smooth(p)):key==='fill'?lerp(-1.5,-1.05,smooth(p*2)):index>=3?-1.05:-1.55;
 head.rotation.z=Math.sin(t*1.5)*.035;head.rotation.y=index>=3&&index<8?.13:Math.sin(t*.8)*.035;head.position.y=3.28+Math.sin(t*2)*.012;
 const blink=1-Math.sin(Math.min(1,(t%3.9)/.18)*Math.PI)*.96;eyes.forEach(e=>e.scale.y=blink);pupils.forEach(e=>e.position.x=index>=3?.028:.01);
 mouthOpen.visible=amp>.045;tongue.visible=amp>.25;smile.visible=amp<=.045;mouthOpen.scale.y=.012+amp*.095;
 let tip=vec(-.5,2.38,.0);let grow=index>4?1:0;stream.visible=false;filling.visible=index===6;
 if(key==='pour'){const z=smooth(p/.6);tip.set(lerp(-2,PAN.x,z),lerp(1.98,2.28,z),lerp(.82,PAN.z,z));grow=smooth((p-.6)/.4)*.23;stream.visible=p>.6;}
 if(key==='spread'){const r=lerp(.1,.6,p),a=p*Math.PI*5;tip.copy(PAN).add(vec(Math.cos(a)*r,.13,Math.sin(a)*r));grow=lerp(.23,1,smooth(p));}
 if(key==='cook'){
  if(recipeKind==='masala-dosa'&&p<.4){const q=smooth(p/.4);tip.set(lerp(-.13,PAN.x+.5,q),2.08,lerp(1.02,PAN.z,q));}
  else tip.copy(PAN).add(vec(.65,.4,0));
 }
 if(key==='fill'){tip.set(lerp(-.85,PAN.x-.2,smooth(p*2)),2.05,lerp(.95,PAN.z,smooth(p*2)));}
 if(key==='fold')tip.copy(PAN).add(vec(lerp(.6,0,smooth(p)),.1+Math.sin(p*Math.PI)*.25,0));
 if(key==='fold'&&recipeKind==='masala-dosa'){
  const angle=Math.PI*smooth((p-.2)/.65);
  tip.set(PAN.x,1.852+.025+.45*Math.sin(angle)-.018,PAN.z-(p<.2?lerp(.85,.45,smooth(p/.2)):.45*Math.cos(angle)));
 }
 food.position.copy(PAN).y=1.852;food.scale.setScalar(Math.max(.001,grow));batter.visible=index<7;folded.visible=index>=7;foldHinge.visible=index>=7;foldHinge.rotation.x=key==='fold'?Math.PI*smooth((p-.2)/.65):Math.PI;filling.visible=key==='fill'&&p>=.52||key==='fold'&&p<.65;filling.scale.setScalar(key==='fill'?Math.max(.001,smooth((p-.52)/.12)):1);speckles.visible=index>=5&&index<7;
 batter.material.color.set('#fff0ce').lerp(new T.Color('#ddb365'),index>5?1:key==='cook'?p:0);
 let landed=false,withdraw=0;
 if(key==='serve'){const z=smooth(p*1.8);food.position.lerpVectors(vec(PAN.x,1.87,PAN.z),vec(PLATE.x-.18,PLATE.y+(recipeKind==='vegetable-sandwich'?.03:recipeKind==='pancakes'?.085:.052),PLATE.z+.14),z);food.position.y+=Math.sin(z*Math.PI)*.35;food.scale.setScalar(lerp(1,.88,z));landed=z===1;tip.copy(food.position).y-=.035;withdraw=smooth((p-.62)/.23);tip.lerp(vec(1.05,2.05,.38),withdraw);}
 if(recipeKind==='vegetable-sandwich'){sandwich.visible=true;foldHinge.visible=false;batter.visible=false;folded.visible=false;filling.visible=false;speckles.visible=false;stream.visible=false;steam.visible=false;food.scale.setScalar(key==='serve'?lerp(1,.88,smooth(p*1.8)):1);food.visible=index>=3;spreadLayer.visible=index>=4;spreadLayer.scale.set(1.01*(key==='spread'?Math.max(.01,smooth(p)):1),.012,.95*(key==='spread'?Math.max(.01,smooth(p)):1));vegetables.visible=index>=6;for(let i=0;i<vegetables.children.length;i++){const threshold=i===0?.7/3:i===1||i===3?1.7/3:2.7/3;vegetables.children[i].visible=originalKey!=='layer'||p>=threshold;}topBread.visible=index>=7;topBread.position.y=key==='fold'?lerp(.65,.305,smooth(p)):.305;if(key==='pour'){food.position.set(lerp(-2,PAN.x,smooth(p)),1.86+Math.sin(p*Math.PI)*.3,lerp(.82,PAN.z,smooth(p)));}blade.visible=true;ladle.visible=false;}
 if(recipeKind==='pancakes'){if(key!=='serve')food.position.y+=.05;if(key==='pour'){food.scale.setScalar(Math.max(.001,smooth((p-.6)/.4)));food.position.y=1.8375+.055*food.scale.y;}foldHinge.visible=false;batter.scale.y=5;folded.visible=false;batter.visible=true;filling.visible=false;pancakeTop.visible=index>=6;steam.visible=index>=5&&index<8;if(originalKey==='flip'){food.rotation.z=p*Math.PI;food.position.y+=Math.sin(p*Math.PI)*.85;}else food.rotation.z=0;}
 carriedVeg.visible=false;tool.visible=true;
 carriedFilling.visible=recipeKind==='masala-dosa'&&key==='fill'&&p<.52;
 oil.visible=recipeKind==='masala-dosa'&&key==='cook'&&p<.35;
 oilDrop.visible=oil.visible&&p>.22;
 oilDrop.position.copy(tip).y=lerp(2.03,1.88,(t*3)%1);
 blade.rotation.z=recipeKind==='pancakes'&&originalKey==='flip'?p*Math.PI:0;
 if(recipeKind==='pancakes'&&originalKey==='flip')tip.copy(food.position).add(vec(Math.sin(p*Math.PI)*.0725,-Math.cos(p*Math.PI)*.0725,0));
 if(recipeKind==='pancakes'&&key==='serve'&&withdraw===0)tip.y=food.position.y-.055*food.scale.y-.0175;
 blade.rotation.x=recipeKind==='masala-dosa'&&key==='fold'?foldHinge.rotation.x:0;
 ladle.rotation.z=key==='pour'&&p>.6?Math.sin((p-.6)/.4*Math.PI)*.3:0;
 if(recipeKind==='pancakes'&&originalKey==='stack'){pancakeTop.position.y=lerp(.65,.11,smooth(p));tip.copy(food.position).y+=pancakeTop.position.y-.075;}else pancakeTop.position.y=.11;

 if(recipeKind==='vegetable-sandwich'&&originalKey==='layer'){
  const cycle=Math.min(2.999,p*3),q=cycle%1,z=q<.7?smooth(q/.7):1-smooth((q-.7)/.3);const stage=Math.min(2,Math.floor(cycle));tip.set(lerp(-.85,PAN.x,z),lerp(1.9,food.position.y+[.135,.18,.23][stage]-.045,z)+Math.sin(z*Math.PI)*.23,lerp(.82,PAN.z,z));
  carriedVeg.visible=q<.7&&p<.999;carriedLettuce.visible=cycle<1;carriedTomato.visible=cycle>=1&&cycle<2;carriedCucumber.visible=cycle>=2;
 }
 if(recipeKind==='vegetable-sandwich'&&originalKey==='close'){tool.visible=false;tip.copy(food.position).add(vec(.01,topBread.position.y-.16,0));}
 if(recipeKind==='vegetable-sandwich'&&key==='spread')tip.y=food.position.y+.138;
 if(recipeKind==='vegetable-sandwich'&&key==='serve'&&withdraw===0)tip.y=food.position.y-.0175;
 if(recipeKind==='vegetable-sandwich'&&key==='pour')tip.copy(food.position).y-=.0175;
 blade.visible=recipeKind==='vegetable-sandwich'||index>=7;ladle.visible=recipeKind!=='vegetable-sandwich'&&index<7;
 // Hand target is the handle's grip; the utensil is attached to the solved wrist.
 const wanted=tip.clone().add(vec(-.58,.16,0)),actual=solveArm(armRig[1],wanted);tool.position.copy(actual).add(vec(.58,-.16,0));
 const freeHand=vec(chef.position.x-.56,2.05,chef.position.z+.35);if(key==='welcome')freeHand.y+=Math.sin(p*Math.PI)*.48;solveArm(armRig[0],freeHand);
 if(stream.visible){const start=tool.position.clone(),end=vec(PAN.x,1.86,PAN.z);segment(stream,start,end);}
 steam.visible=recipeKind!=='vegetable-sandwich'&&index>=5&&index<8;steam.position.set(PAN.x,2.08+(t*.16% .3),PAN.z);steam.rotation.y=t*.4;
 const startCam=vec(5.7,4.5,8.2),cookCam=vec(4.2,4.1,6.7),serveCam=vec(5.3,3.7,6.3),look=vec(0,2.3,0);
 camera.position.copy(index<3?startCam:key==='serve'?serveCam:cookCam);if(key==='serve')look.set(.7,2.35,.1);if(W<H){const focus=key==='serve'?1.45:.7;camera.position.set(focus+2,4.7,key==='serve'?10.7:15);look.set(focus,2.3,.1);}camera.lookAt(look);camera.updateMatrixWorld();scene.updateMatrixWorld(true);
 document.getElementById('subtitle').textContent=lesson.captions.find(c=>t>=c.start&&t<c.end)?.text||'';
 if(draw)renderer.render(scene,camera);
 const foodCenter=food.getWorldPosition(vec(0,0,0)),toolTip=tool.getWorldPosition(vec(0,0,0));
 state={key,p,time:t,foldAngle:foldHinge.rotation.x,landed,withdraw,food:foodCenter.toArray(),tool:toolTip.toArray(),plate:PLATE.toArray(),foodRadius:.76*food.scale.x,plateRadius,foodBottom:recipeKind==='pancakes'?new T.Box3().setFromObject(batter).min.y:recipeKind==='vegetable-sandwich'?foodCenter.y:foodCenter.y-.0225*food.scale.y,bladeTop:toolTip.y+.0175,mouthOpen:mouthOpen.visible,speechEnergy:amp,steamVisible:steam.visible,spreadHeight:spreadLayer.scale.y,handBottom:actual.y-.13,gripError:actual.distanceTo(wanted),meshes:renderer.info.render.calls,triangles:renderer.info.render.triangles,perspective:camera.isPerspectiveCamera,webgl:renderer.capabilities.isWebGL2,threeRevision:T.REVISION};window.frameState=state;return state;
}
window.setFrame=frame;window.studio={scene,camera,renderer,food,chef,plate:PLATE};frame(0);window.studioReady=true;
