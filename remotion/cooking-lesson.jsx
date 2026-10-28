import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'};
const ease = Easing.inOut(Easing.cubic);
const mix = (value, from, to) => from + (to - from) * value;
const progress = value => interpolate(value, [0, 1], [0, 1], {...clamp, easing: ease});
const stepTitle = value => String(value || 'Cooking step')
  .replaceAll('_', ' ')
  .replace(/^saute\b/i, 'Sauté')
  .replace(/^\w/, letter => letter.toUpperCase());

function activeState(plan, lesson, time) {
  const steps = lesson.steps || [];
  const found = steps.findIndex(step => time >= step.start && time < step.end);
  const index = found >= 0 ? found : Math.max(0, steps.length - 1);
  const timeline = steps[index] || steps.at(-1) || {key: 'welcome', start: 0, speechEnd: 1, end: 1, text: 'Let’s cook!'};
  const action = (plan.actions || []).find(item => item.key === timeline.key) || (plan.actions || [])[index] || {action: 'show', key: timeline.key};
  const span = Math.max(0.2, (timeline.speechEnd || timeline.end) - timeline.start);
  return {timeline, action, index, p: progress((time - timeline.start) / span)};
}

const Arm = ({side, angle, bend, skin = '#f3b38f'}) => {
  const x = side * 48;
  return (
    <g transform={`translate(${x} -28) rotate(${angle})`}>
      <line x1="0" y1="0" x2="0" y2="55" stroke="#fffaf0" strokeWidth="24" strokeLinecap="round" />
      <g transform={`translate(0 52) rotate(${bend})`}>
        <line x1="0" y1="0" x2="0" y2="48" stroke={skin} strokeWidth="18" strokeLinecap="round" />
        <circle cx="0" cy="51" r="13" fill={skin} />
      </g>
    </g>
  );
};

const Maya = ({x, y, scale, action, p, time, speech}) => {
  const verb = action.action || 'show';
  const beat = Math.sin(time * 5.4);
  let leftAngle = 18, rightAngle = -18, leftBend = -8, rightBend = 8;
  if (action.key === 'welcome' || verb === 'show') {
    leftAngle = -72 + beat * 10; leftBend = -36; rightAngle = -8;
  } else if (['add', 'pour', 'sprinkle', 'layer', 'place'].includes(verb)) {
    rightAngle = -68 * p; rightBend = -42 * p; leftAngle = 18;
  } else if (['stir', 'mix', 'spread', 'cook', 'boil', 'simmer', 'fry', 'saute'].includes(verb)) {
    rightAngle = -56 + beat * 12; rightBend = -52 - beat * 13; leftAngle = 12;
  } else if (['flip', 'toss'].includes(verb)) {
    rightAngle = -78 + Math.sin(p * Math.PI) * 28; rightBend = -60;
  } else if (['serve', 'plate', 'transfer'].includes(verb)) {
    leftAngle = 58 * p; rightAngle = -58 * p; leftBend = -28; rightBend = 28;
  } else if (['chop', 'slice'].includes(verb)) {
    rightAngle = -42 + beat * 16; rightBend = -28;
  } else if (['knead', 'roll', 'shape'].includes(verb)) {
    leftAngle = 34 + beat * 5; rightAngle = -34 - beat * 5; leftBend = -35; rightBend = 35;
  }
  const blink = (time % 3.8) > 3.62 ? 0.12 : 1;
  const mouth = Math.max(0.08, Math.min(1, speech * 5));
  return (
    <g transform={`translate(${x} ${y + Math.sin(time * 2.1) * 3}) scale(${scale})`}>
      <ellipse cx="0" cy="66" rx="58" ry="18" fill="rgba(20,53,40,.14)" />
      <Arm side={-1} angle={leftAngle} bend={leftBend} />
      <Arm side={1} angle={rightAngle} bend={rightBend} />
      <path d="M-50,-40 Q0,-65 50,-40 L43,57 Q0,77 -43,57 Z" fill="#fffaf0" stroke="#d9e9df" strokeWidth="4" />
      <path d="M-32,-36 Q0,-48 32,-36 L29,49 Q0,61 -29,49 Z" fill="#67ae8f" />
      <path d="M-22,13 Q0,23 22,13 L22,39 Q0,48 -22,39 Z" fill="#ffe3b8" opacity=".9" />
      <circle cx="-12" cy="-26" r="3.5" fill="#e9a454" /><circle cx="12" cy="-26" r="3.5" fill="#e9a454" />
      <path d="M-18,-42 L0,-25 18,-42" fill="none" stroke="#ff8658" strokeWidth="8" strokeLinecap="round" />
      <ellipse cx="0" cy="-110" rx="67" ry="65" fill="#552c25" />
      <ellipse cx="-62" cy="-99" rx="27" ry="35" fill="#6e3b2f" /><ellipse cx="62" cy="-99" rx="27" ry="35" fill="#6e3b2f" />
      <ellipse cx="0" cy="-104" rx="58" ry="56" fill="#f4b995" />
      <path d="M-55,-122 Q-34,-174 0,-150 Q36,-174 55,-122 Q28,-144 0,-135 Q-28,-144 -55,-122Z" fill="#4b261f" />
      <ellipse cx="-22" cy="-106" rx="12" ry={16 * blink} fill="white" />
      <ellipse cx="22" cy="-106" rx="12" ry={16 * blink} fill="white" />
      <circle cx="-20" cy="-105" r={8 * blink} fill="#31958d" /><circle cx="22" cy="-105" r={8 * blink} fill="#31958d" />
      <circle cx="-19" cy="-105" r={4.5 * blink} fill="#142d2c" /><circle cx="23" cy="-105" r={4.5 * blink} fill="#142d2c" />
      <circle cx="-23" cy="-110" r={2.3 * blink} fill="white" /><circle cx="18" cy="-110" r={2.3 * blink} fill="white" />
      <ellipse cx="-38" cy="-87" rx="11" ry="5" fill="#ec8f88" opacity=".55" /><ellipse cx="38" cy="-87" rx="11" ry="5" fill="#ec8f88" opacity=".55" />
      <ellipse cx="0" cy="-76" rx="14" ry={5 + mouth * 6} fill="#7f3435" />
      <path d="M-48,-163 Q-54,-187 -29,-196 Q-20,-225 4,-207 Q27,-226 38,-198 Q65,-191 51,-163Z" fill="#fffdf4" stroke="#e6eee8" strokeWidth="4" />
      <rect x="-48" y="-170" width="96" height="22" rx="10" fill="#fffdf4" />
    </g>
  );
};

const IngredientParticles = ({x, y, color, p, count = 9}) => (
  <g>
    {Array.from({length: count}, (_, index) => {
      const delay = index / count * 0.45;
      const q = progress((p - delay) / 0.55);
      const offset = ((index * 37) % 64) - 32;
      return <circle key={index} cx={x + offset * (1 - q)} cy={y - 120 + q * 105 + Math.sin(q * Math.PI) * -25} r={7 + index % 3} fill={color} opacity={q > .98 ? 0 : 1} />;
    })}
  </g>
);

const CookingAction = ({x, y, plateX, action, ingredient, p, time, portrait}) => {
  const verb = action.action || 'show';
  const color = ingredient?.color || '#e7ad54';
  const hot = ['cook', 'boil', 'simmer', 'fry', 'saute'].includes(verb);
  const foodX = ['serve', 'plate', 'transfer'].includes(verb) ? mix(p, x, plateX) : x;
  const foodY = y - 18 - (verb === 'flip' ? Math.sin(p * Math.PI) * (portrait ? 115 : 80) : 0);
  return (
    <g>
      <ellipse cx={plateX} cy={y + 34} rx={portrait ? 90 : 118} ry="26" fill="#d8e9df" />
      <ellipse cx={plateX} cy={y + 26} rx={portrait ? 79 : 106} ry="20" fill="#fffdf5" stroke="#72a891" strokeWidth="4" />
      <rect x={x - 112} y={y - 18} width="224" height="30" rx="12" fill="#243d3b" />
      <ellipse cx={x} cy={y - 18} rx="96" ry="31" fill="#1e3332" />
      <ellipse cx={x} cy={y - 25} rx="82" ry="24" fill="#667d79" stroke="#152a29" strokeWidth="6" />
      <ellipse cx={foodX} cy={foodY} rx="64" ry="16" fill={color} transform={`rotate(${verb === 'flip' ? p * 180 : 0} ${foodX} ${foodY})`} />
      {hot && Array.from({length: 4}, (_, index) => <path key={index} d={`M${x - 35 + index * 24},${y - 60} q-18,-28 2,-48 q16,-22 0,-42`} fill="none" stroke="rgba(255,255,255,.75)" strokeWidth="7" strokeLinecap="round" transform={`translate(0 ${Math.sin(time * 2.6 + index) * 7})`} />)}
      {['add', 'sprinkle', 'layer', 'place'].includes(verb) && <IngredientParticles x={x} y={y} color={color} p={p} count={verb === 'layer' ? 16 : 9} />}
      {verb === 'pour' && <g transform={`translate(${x - 32} ${y - 135}) rotate(${mix(p, 0, 58)})`}><rect x="-44" y="-35" width="72" height="70" rx="16" fill="#ffbd72" /><path d="M28,-16 L69,-3 L29,13Z" fill="#ffbd72" /></g>}
      {verb === 'pour' && <path d={`M${x + 15},${y - 95} Q${x + 30},${y - 58} ${x},${y - 37}`} fill="none" stroke="#f6cb58" strokeWidth={p > .2 && p < .9 ? 12 : 0} strokeLinecap="round" />}
      {['stir', 'mix', 'cook', 'boil', 'simmer', 'fry', 'saute'].includes(verb) && <g transform={`rotate(${time * 150} ${x} ${y - 27})`}><line x1={x} y1={y - 30} x2={x + 75} y2={y - 105} stroke="#825c3d" strokeWidth="13" strokeLinecap="round" /><ellipse cx={x} cy={y - 28} rx="24" ry="10" fill="none" stroke="#ffe99b" strokeWidth="6" /></g>}
      {verb === 'spread' && <g transform={`translate(${Math.sin(p * Math.PI * 3) * 55} 0)`}><rect x={x - 9} y={y - 98} width="18" height="70" rx="8" fill="#7a5338" /><rect x={x - 32} y={y - 37} width="64" height="13" rx="6" fill="#b9c8c4" /></g>}
      {['chop', 'slice'].includes(verb) && <g transform={`translate(0 ${Math.abs(Math.sin(time * 7)) * -45}) rotate(-12 ${x} ${y - 70})`}><rect x={x - 8} y={y - 115} width="16" height="65" rx="8" fill="#825c3d" /><path d={`M${x},${y - 55} h76 q10,0 0,12 h-76Z`} fill="#dce8e4" /></g>}
      {['serve', 'plate', 'transfer'].includes(verb) && <path d={`M${x},${y - 5} Q${(x + plateX) / 2},${y - 95} ${plateX},${y + 2}`} fill="none" stroke="#ff8658" strokeWidth="5" strokeDasharray="10 12" opacity={.35} />}
    </g>
  );
};

const Kitchen = ({width, height, plan, lesson, state, time, speech}) => {
  const portrait = height > width;
  const counter = portrait ? height * .66 : height * .67;
  const cookX = portrait ? width * .49 : width * .57;
  const plateX = portrait ? width * .76 : width * .82;
  const mayaX = portrait ? width * .31 : width * .24;
  const mayaY = portrait ? height * .43 : height * .52;
  const mayaScale = portrait ? 1.15 : 1.28;
  const ingredient = (plan.ingredients || []).find(item => item.id === state.action.ingredient) || (plan.ingredients || [])[state.index % Math.max(1, (plan.ingredients || []).length)];
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#f8fbf7"/><stop offset="1" stopColor="#eaf3ee"/></linearGradient>
        <linearGradient id="counter" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#fffdf5"/><stop offset="1" stopColor="#dbe9e3"/></linearGradient>
        <filter id="shadow"><feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#163a2c" floodOpacity=".16"/></filter>
      </defs>
      <rect width={width} height={height} fill="url(#wall)" />
      <g opacity=".6">{Array.from({length: 8},(_,i)=><line key={i} x1="0" x2={width} y1={height*.12+i*48} y2={height*.12+i*48} stroke="#d5e5de" strokeWidth="2"/> )}</g>
      <rect x={width*.05} y={height*.13} width={width*.2} height={height*.27} rx="20" fill="#bfe1e5" stroke="white" strokeWidth="14" />
      <line x1={width*.15} y1={height*.13} x2={width*.15} y2={height*.4} stroke="white" strokeWidth="8"/><line x1={width*.05} y1={height*.265} x2={width*.25} y2={height*.265} stroke="white" strokeWidth="8"/>
      <g fill="#acd7c5" stroke="#7eb39d" strokeWidth="3"><rect x={width*.65} y={height*.14} width={width*.14} height={height*.2} rx="12"/><rect x={width*.81} y={height*.14} width={width*.14} height={height*.2} rx="12"/></g>
      <g fill="#c69b72"><rect x={width*.42} y={height*.19} width={width*.18} height="12" rx="6"/><rect x={width*.42} y={height*.31} width={width*.18} height="12" rx="6"/></g>
      <g fill="#ffcb72"><rect x={width*.45} y={height*.135} width="32" height="55" rx="8"/><rect x={width*.51} y={height*.15} width="27" height="43" rx="7"/></g>
      <rect x="0" y={counter} width={width} height={height-counter} fill="url(#counter)" />
      <rect x="0" y={counter-14} width={width} height="30" fill="#fffef8" />
      <g filter="url(#shadow)"><CookingAction x={cookX} y={counter-5} plateX={plateX} action={state.action} ingredient={ingredient} p={state.p} time={time} portrait={portrait}/></g>
      <Maya x={mayaX} y={mayaY} scale={mayaScale} action={state.action} p={state.p} time={time} speech={speech}/>
      <g transform={`translate(${width*.08} ${counter-56})`}><ellipse cx="0" cy="18" rx="60" ry="18" fill="#d6e8df"/><ellipse cx="0" cy="10" rx="52" ry="14" fill={ingredient?.color || '#f1b85e'}/></g>
    </svg>
  );
};

export const CookingLesson = ({plan, lesson, audioFile}) => {
  const frame = useCurrentFrame();
  const {fps, width, height, durationInFrames} = useVideoConfig();
  const time = frame / fps;
  const state = activeState(plan, lesson, time);
  const speech = lesson.envelope?.[Math.floor(time / .02)] || 0;
  const caption = (lesson.captions || []).find(item => time >= item.start && time < item.end)?.text || '';
  const entrance = spring({frame: Math.max(0, frame - Math.round(state.timeline.start * fps)), fps, config: {damping: 17, stiffness: 145}});
  const opening = interpolate(frame, [0, fps*.2, fps*1.6, fps*2.15], [0, 1, 1, 0], clamp);
  const endStart = Math.max(0, durationInFrames - fps * 1.6);
  const ending = interpolate(frame, [endStart, endStart + fps*.5], [0, .82], clamp);
  return (
    <AbsoluteFill style={{fontFamily: 'Arial, sans-serif', background: '#eef5f0', overflow: 'hidden'}}>
      <Audio src={staticFile(audioFile)} />
      <Kitchen width={width} height={height} plan={plan} lesson={lesson} state={state} time={time} speech={speech}/>
      <div style={{position:'absolute',top:28,left:28,display:'flex',alignItems:'center',gap:14,padding:'12px 18px',borderRadius:18,background:'rgba(255,253,245,.92)',border:'2px solid rgba(26,103,73,.18)',boxShadow:'0 10px 26px rgba(17,56,43,.15)',transform:`translateY(${mix(entrance,-25,0)}px)`,opacity:entrance,color:'#11382b'}}>
        <span style={{display:'grid',placeItems:'center',width:42,height:42,borderRadius:'50%',background:'#19724e',color:'white',fontWeight:900,fontSize:20}}>{state.index+1}</span>
        <div><div style={{fontSize:13,textTransform:'uppercase',letterSpacing:2,color:'#c45e37',fontWeight:900}}>Chef Maya says</div><div style={{fontSize:Math.max(20,Math.min(30,width/35)),fontWeight:900,maxWidth:width*.55,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{stepTitle(state.timeline.title || state.action.key || state.action.action)}</div></div>
      </div>
      {caption && <div style={{position:'absolute',left:'50%',bottom:height>width?'8%':'5%',transform:'translateX(-50%)',maxWidth:'84%',padding:'13px 22px',borderRadius:18,background:'rgba(17,56,43,.92)',border:'2px solid #fff9eb',boxShadow:'0 10px 30px rgba(17,56,43,.25)',color:'white',fontSize:Math.max(23,Math.min(38,width/28)),fontWeight:900,textAlign:'center'}}>{caption}</div>}
      <div style={{position:'absolute',left:0,right:0,bottom:0,height:8,background:'rgba(255,255,255,.6)'}}><div style={{height:'100%',width:`${frame/Math.max(1,durationInFrames-1)*100}%`,background:'linear-gradient(90deg,#19724e,#ff8658)'}}/></div>
      <AbsoluteFill style={{alignItems:'center',justifyContent:'center',background:`rgba(17,56,43,${opening*.76})`,opacity:opening,pointerEvents:'none'}}><div style={{textAlign:'center',color:'white',transform:`scale(${mix(opening,.88,1)})`,padding:40}}><div style={{fontSize:18,letterSpacing:4,textTransform:'uppercase',fontWeight:900,color:'#bdebd4'}}>LifeMotion Cooking Studio</div><div style={{fontSize:Math.max(48,Math.min(80,width/14)),fontWeight:900,marginTop:12}}>{plan.title}</div><div style={{fontSize:24,marginTop:12,color:'#fff0cf'}}>A joyful cooking lesson with Chef Maya</div></div></AbsoluteFill>
      {ending>0&&<AbsoluteFill style={{alignItems:'center',justifyContent:'center',background:`rgba(17,56,43,${ending})`,pointerEvents:'none'}}><div style={{textAlign:'center',color:'white',opacity:ending/.82,transform:`scale(${mix(ending/.82,.82,1)})`}}><div style={{fontSize:70}}>★</div><div style={{fontSize:Math.max(48,Math.min(78,width/15)),fontWeight:900}}>Great cooking!</div><div style={{fontSize:25,marginTop:10,color:'#dff2e8'}}>{plan.title} is ready.</div></div></AbsoluteFill>}
    </AbsoluteFill>
  );
};
