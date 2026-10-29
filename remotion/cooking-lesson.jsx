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

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };
const ease = Easing.inOut(Easing.cubic);
const mix = (value, from, to) => from + (to - from) * value;
const progress = value => interpolate(value, [0, 1], [0, 1], { ...clamp, easing: ease });

function stepTitle(value, isTamil = false) {
  if (!value) return isTamil ? 'சமையல் படி' : 'Cooking Step';
  if (isTamil) return String(value).trim();
  return String(value)
    .replaceAll('_', ' ')
    .replace(/^saute\b/i, 'Sauté')
    .replace(/^\w/, letter => letter.toUpperCase());
}

function activeState(plan, lesson, time) {
  const steps = lesson.steps || [];
  const found = steps.findIndex(step => time >= step.start && time < step.end);
  const index = found >= 0 ? found : Math.max(0, steps.length - 1);
  const timeline = steps[index] || steps.at(-1) || {
    key: 'welcome',
    start: 0,
    speechEnd: 1,
    end: 1,
    text: plan.voice?.startsWith('ta-') ? 'சமைக்கலாம் வாங்க!' : "Let's cook!"
  };
  const action = (plan.actions || []).find(item => item.key === timeline.key) || (plan.actions || [])[index] || {
    action: 'show',
    key: timeline.key,
    text: timeline.text
  };
  const span = Math.max(0.2, (timeline.speechEnd || timeline.end) - timeline.start);
  return { timeline, action, index, p: progress((time - timeline.start) / span) };
}

/**
 * Cartoon Arm with dual-segment inverse kinematics.
 */
const Arm = ({ side, angle, bend, skin = '#f4b995', handX = 0, handY = 0 }) => {
  const x = side * 52;
  return (
    <g transform={`translate(${x} -24) rotate(${angle})`}>
      {/* Upper arm (chef jacket white sleeve) */}
      <line x1="0" y1="0" x2="0" y2="58" stroke="#ffffff" strokeWidth="26" strokeLinecap="round" />
      <circle cx="0" cy="56" r="14" fill="#ffffff" />
      {/* Forearm (skin tone) */}
      <g transform={`translate(0 56) rotate(${bend})`}>
        <line x1="0" y1="0" x2="0" y2="52" stroke={skin} strokeWidth="20" strokeLinecap="round" />
        {/* Hand with fingers */}
        <circle cx="0" cy="54" r="15" fill={skin} />
        <ellipse cx={side > 0 ? 10 : -10} cy="48" rx="6" ry="10" fill={skin} transform={`rotate(${side > 0 ? 25 : -25} ${side > 0 ? 10 : -10} 48)`} />
      </g>
    </g>
  );
};

/**
 * Steve AI Style Chef Maya Character
 * Expressive face, blinking eyes, talking mouth sync, chef hat with stars.
 */
const Maya = ({ x, y, scale, action, p, time, speech, cookX, cookY }) => {
  const verb = action.action || 'show';
  const beat = Math.sin(time * 5.4);
  const breath = Math.sin(time * 2.2) * 3;

  // Kinematic angles for arms
  let leftAngle = 25, rightAngle = -22, leftBend = -15, rightBend = 20;

  if (action.key === 'welcome' || verb === 'show') {
    // Cheerful greeting wave
    leftAngle = -68 + beat * 12;
    leftBend = -45;
    rightAngle = 15;
    rightBend = 25;
  } else if (['stir', 'mix', 'cook', 'boil', 'simmer', 'fry', 'saute'].includes(verb)) {
    // Left hand holding pan handle, right hand actively stirring inside pan
    leftAngle = 42;
    leftBend = 35;
    rightAngle = -48 + Math.cos(time * 6) * 14;
    rightBend = -42 + Math.sin(time * 6) * 12;
  } else if (['add', 'pour', 'sprinkle', 'layer', 'place'].includes(verb)) {
    // Holding ingredient bowl / jug tilted over pan
    leftAngle = 38;
    leftBend = 30;
    rightAngle = -62 * p - 10;
    rightBend = -48 * p;
  } else if (['flip', 'toss'].includes(verb)) {
    // Sliding spatula under and flipping upwards
    leftAngle = 40;
    leftBend = 32;
    rightAngle = -65 + Math.sin(p * Math.PI) * 32;
    rightBend = -55;
  } else if (['serve', 'plate', 'transfer'].includes(verb)) {
    // Transferring with spoon from pan to plate
    leftAngle = 30;
    leftBend = 20;
    rightAngle = mix(p, -45, 45);
    rightBend = mix(p, -35, 30);
  } else {
    leftAngle = 22 + beat * 4;
    rightAngle = -22 - beat * 4;
  }

  const blink = (time % 3.6) > 3.42 ? 0.1 : 1;
  const mouth = Math.max(0.1, Math.min(1, speech * 6));

  return (
    <g transform={`translate(${x} ${y + breath}) scale(${scale})`}>
      {/* Ground drop shadow */}
      <ellipse cx="0" cy="74" rx="66" ry="18" fill="rgba(14, 40, 30, 0.18)" />

      {/* Arms behind and in front */}
      <Arm side={-1} angle={leftAngle} bend={leftBend} />
      <Arm side={1} angle={rightAngle} bend={rightBend} />

      {/* Chef Jacket Body */}
      <path d="M-52,-42 Q0,-68 52,-42 L46,62 Q0,82 -46,62 Z" fill="#ffffff" stroke="#e0ece5" strokeWidth="3" />
      {/* Apron - Cheerful Mint / Emerald */}
      <path d="M-34,-38 Q0,-50 34,-38 L30,54 Q0,66 -30,54 Z" fill="#38a169" />
      {/* Pocket */}
      <path d="M-22,14 Q0,24 22,14 L22,42 Q0,50 -22,42 Z" fill="#2f855a" />
      {/* Apron Straps & Buttons */}
      <circle cx="-13" cy="-24" r="4" fill="#ffd166" />
      <circle cx="13" cy="-24" r="4" fill="#ffd166" />
      {/* Red Chef Neckerchief */}
      <path d="M-20,-44 L0,-24 20,-44" fill="none" stroke="#e63946" strokeWidth="9" strokeLinecap="round" />

      {/* Head & Hair Base */}
      <ellipse cx="0" cy="-114" rx="70" ry="68" fill="#4a2820" />
      {/* Cute Pigtails / Buns */}
      <ellipse cx="-66" cy="-102" rx="28" ry="36" fill="#5c3228" />
      <ellipse cx="66" cy="-102" rx="28" ry="36" fill="#5c3228" />
      <circle cx="-62" cy="-98" r="8" fill="#e63946" />
      <circle cx="62" cy="-98" r="8" fill="#e63946" />

      {/* Face Skin */}
      <ellipse cx="0" cy="-108" rx="60" ry="58" fill="#f4b995" />

      {/* Front Hair Bangs */}
      <path d="M-58,-126 Q-36,-178 0,-154 Q36,-178 58,-126 Q30,-148 0,-138 Q-30,-148 -58,-126Z" fill="#3e1f18" />

      {/* Big Cartoon Eyes */}
      <g>
        {/* Eye whites */}
        <ellipse cx="-23" cy="-110" rx="13" ry={17 * blink} fill="#ffffff" stroke="#2d3748" strokeWidth="2" />
        <ellipse cx="23" cy="-110" rx="13" ry={17 * blink} fill="#ffffff" stroke="#2d3748" strokeWidth="2" />
        {/* Irises - Bright Emerald Green */}
        <circle cx="-21" cy="-109" r={9 * blink} fill="#2f855a" />
        <circle cx="25" cy="-109" r={9 * blink} fill="#2f855a" />
        {/* Pupils */}
        <circle cx="-20" cy="-109" r={5 * blink} fill="#1a202c" />
        <circle cx="26" cy="-109" r={5 * blink} fill="#1a202c" />
        {/* Shiny Eye Highlights */}
        <circle cx="-24" cy="-114" r={3 * blink} fill="#ffffff" />
        <circle cx="22" cy="-114" r={3 * blink} fill="#ffffff" />
        <circle cx="-18" cy="-105" r={1.6 * blink} fill="#ffffff" />
        <circle cx="28" cy="-105" r={1.6 * blink} fill="#ffffff" />
      </g>

      {/* Cute Eyebrows */}
      <path d="M-34,-130 Q-23,-136 -12,-130" fill="none" stroke="#3e1f18" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M12,-130 Q23,-136 34,-130" fill="none" stroke="#3e1f18" strokeWidth="3.5" strokeLinecap="round" />

      {/* Rosy Blush Cheeks */}
      <ellipse cx="-40" cy="-90" rx="12" ry="6" fill="#ff758f" opacity="0.65" />
      <ellipse cx="40" cy="-90" rx="12" ry="6" fill="#ff758f" opacity="0.65" />

      {/* Cute Smile / Talking Mouth */}
      <ellipse cx="0" cy="-78" rx={12} ry={4 + mouth * 8} fill="#9b2226" />
      {mouth > 0.3 && <path d="M-8,-79 Q0,-74 8,-79" stroke="#ffffff" strokeWidth="3" fill="none" />}

      {/* Puffy Chef Hat */}
      <g transform="translate(0 -168)">
        <path d="M-52,-6 Q-58,-34 -30,-44 Q-22,-74 5,-54 Q30,-75 42,-46 Q70,-38 55,-6Z" fill="#ffffff" stroke="#e2e8f0" strokeWidth="4" />
        <rect x="-52" y="-14" width="104" height="24" rx="11" fill="#ffffff" stroke="#cbd5e0" strokeWidth="2" />
        {/* Chef Star Badge on Hat */}
        <circle cx="0" cy="-2" r="7" fill="#ffd166" />
        <path d="M0,-6 L1.8,-1.5 L6.5,-1.5 L2.7,1.2 L4.2,5.8 L0,3 L-4.2,5.8 L-2.7,1.2 L-6.5,-1.5 L-1.8,-1.5 Z" fill="#e76f51" />
      </g>
    </g>
  );
};

/**
 * Animated Particle Sprinkles for spices and ingredients
 */
const IngredientParticles = ({ x, y, color, p, count = 12 }) => (
  <g>
    {Array.from({ length: count }, (_, index) => {
      const delay = (index / count) * 0.4;
      const q = progress((p - delay) / 0.6);
      const angle = (index * 47) % 360;
      const spreadX = Math.sin(angle) * (20 + (index % 4) * 15);
      return (
        <circle
          key={index}
          cx={x + spreadX * (1 - q * 0.3)}
          cy={y - 110 + q * 95 + Math.sin(q * Math.PI) * -18}
          r={6 + (index % 3)}
          fill={color}
          opacity={q > 0.96 ? 0 : 0.9}
        />
      );
    })}
  </g>
);

/**
 * Cooking Action with Stove, Pan, Flames, Steam, Sparkles, and Utensils
 */
const CookingAction = ({ x, y, plateX, action, ingredient, p, time, portrait, isTamil }) => {
  const verb = action.action || 'show';
  const color = ingredient?.color || '#f39c12';
  const isCooking = ['cook', 'boil', 'simmer', 'fry', 'saute', 'mix', 'stir'].includes(verb);

  // Pan Dimensions
  const panW = portrait ? 210 : 260;
  const panH = portrait ? 60 : 72;
  const rimRx = panW / 2;
  const rimRy = panH / 2;

  // Food position inside pan or transferring to plate
  const foodX = ['serve', 'plate', 'transfer'].includes(verb) ? mix(p, x, plateX) : x;
  const foodY = y - 22 - (verb === 'flip' ? Math.sin(p * Math.PI) * (portrait ? 120 : 90) : 0);

  // Sparkles & Steam timing
  const pulse = Math.sin(time * 6);

  return (
    <g>
      {/* 1. Serving Plate (Right side of counter) */}
      <ellipse cx={plateX} cy={y + 36} rx={portrait ? 94 : 125} ry="30" fill="rgba(15, 38, 30, 0.15)" />
      <ellipse cx={plateX} cy={y + 26} rx={portrait ? 86 : 116} ry="24" fill="#ffffff" stroke="#2a9d8f" strokeWidth="5" />
      <ellipse cx={plateX} cy={y + 24} rx={portrait ? 72 : 98} ry="18" fill="#fdfbf7" stroke="#e76f51" strokeWidth="2" strokeDasharray="6 4" />

      {/* 2. Stove / Cooktop Unit Under Pan */}
      <g transform={`translate(${x} ${y + 8})`}>
        {/* Induction Cooktop base plate */}
        <rect x={-rimRx - 28} y={-10} width={(rimRx + 28) * 2} height="36" rx="14" fill="#1f2937" stroke="#374151" strokeWidth="3" />
        {/* Glowing Heating Ring / Gas Flame */}
        <ellipse cx="0" cy="4" rx={rimRx - 15} ry="16" fill="none" stroke="#ff5722" strokeWidth="5" opacity={isCooking ? 0.85 + pulse * 0.15 : 0.25} />
        <ellipse cx="0" cy="4" rx={rimRx - 38} ry="10" fill="none" stroke="#ffb703" strokeWidth="4" opacity={isCooking ? 0.9 : 0.3} />
        {isCooking && Array.from({ length: 9 }, (_, i) => {
          const angle = (i / 9) * Math.PI * 2;
          const fx = Math.cos(angle) * (rimRx - 26);
          const fy = Math.sin(angle) * 12 + 4;
          return <circle key={i} cx={fx} cy={fy} r={4 + pulse} fill="#00b4d8" opacity="0.8" />;
        })}
      </g>

      {/* 3. The Cooking Pan / Pot */}
      <g>
        {/* Left Pan Handle (extending toward Maya) */}
        <path d={`M${x - rimRx + 10},${y - 12} L${x - rimRx - 85},${y - 8} L${x - rimRx - 85},${y + 4} L${x - rimRx + 10},${y + 8} Z`} fill="#2d3748" stroke="#1a202c" strokeWidth="2" />
        <rect x={x - rimRx - 80} y={y - 12} width="55" height="18" rx="7" fill="#4a5568" />

        {/* Pan Outer Metallic Body */}
        <path d={`M${x - rimRx},${y - 15} Q${x - rimRx},${y + 36} ${x},${y + 36} Q${x + rimRx},${y + 36} ${x + rimRx},${y - 15} Z`} fill="#374151" stroke="#1f2937" strokeWidth="4" />

        {/* Pan Rim (Outer Dark Lip) */}
        <ellipse cx={x} cy={y - 15} rx={rimRx} ry={rimRy} fill="#1f2937" stroke="#4b5563" strokeWidth="3" />
        {/* Pan Interior Surface (Deep Metallic Cavity) */}
        <ellipse cx={x} cy={y - 18} rx={rimRx - 14} ry={rimRy - 8} fill="#27272a" stroke="#52525b" strokeWidth="2" />

        {/* Food Inside Pan */}
        <ellipse
          cx={foodX}
          cy={foodY}
          rx={rimRx - 28}
          ry={rimRy - 12}
          fill={color}
          transform={`rotate(${verb === 'flip' ? p * 180 : 0} ${foodX} ${foodY})`}
        />
        {/* Food texture highlight dots */}
        <circle cx={foodX - 25} cy={foodY - 4} r="5" fill="#ffffff" opacity="0.45" />
        <circle cx={foodX + 30} cy={foodY + 2} r="6" fill="#ffffff" opacity="0.35" />
        <circle cx={foodX + 5} cy={foodY - 6} r="4" fill="#ffffff" opacity="0.5" />
      </g>

      {/* 4. Active Utensil & Cooking Kinematics */}
      {/* (a) Stirring Spatula / Wooden Spoon in Maya's hand */}
      {['stir', 'mix', 'cook', 'boil', 'simmer', 'fry', 'saute'].includes(verb) && (
        <g transform={`translate(${Math.cos(time * 6) * 35} ${Math.sin(time * 6) * 12})`}>
          {/* Spatula Wooden Handle extending from Maya's hand into the pan */}
          <line x1={x - 85} y1={y - 140} x2={x + 10} y2={y - 25} stroke="#8d5b4c" strokeWidth="16" strokeLinecap="round" />
          {/* Spatula Blade Head */}
          <path d={`M${x - 8},${y - 45} L${x + 28},${y - 22} L${x + 18},${y - 6} L${x - 18},${y - 30} Z`} fill="#d4a373" stroke="#6f4e37" strokeWidth="3" />
          {/* Sizzle circular sauce trail */}
          <ellipse cx={x} cy={y - 22} rx="42" ry="15" fill="none" stroke="#fff3b0" strokeWidth="5" opacity="0.75" />
        </g>
      )}

      {/* (b) Pouring Jug with Streaming Sauce */}
      {verb === 'pour' && (
        <g>
          {/* Measuring Jug Tilted Over Pan */}
          <g transform={`translate(${x - 42} ${y - 150}) rotate(${mix(p, 5, 52)})`}>
            <rect x="-42" y="-36" width="76" height="72" rx="16" fill="#ffb703" stroke="#fb8500" strokeWidth="4" />
            <path d="M30,-18 L74,-4 L30,12 Z" fill="#ffb703" stroke="#fb8500" strokeWidth="3" />
            {/* Jug handle */}
            <path d="M-40,-20 Q-68,0 -40,20" fill="none" stroke="#fb8500" strokeWidth="8" strokeLinecap="round" />
          </g>
          {/* Flowing liquid stream */}
          <path
            d={`M${x + 12},${y - 110} Q${x + 25},${y - 65} ${x},${y - 28}`}
            fill="none"
            stroke="#ffb703"
            strokeWidth={p > 0.15 && p < 0.92 ? 14 : 0}
            strokeLinecap="round"
          />
          {/* Splash ripples in pan */}
          {p > 0.25 && p < 0.95 && (
            <ellipse cx={x} cy={y - 24} rx="26" ry="10" fill="none" stroke="#fff3b0" strokeWidth="4" opacity={pulse * 0.5 + 0.5} />
          )}
        </g>
      )}

      {/* (c) Particle Sprinkling */}
      {['add', 'sprinkle', 'layer', 'place'].includes(verb) && (
        <IngredientParticles x={x} y={y} color={color} p={p} count={verb === 'layer' ? 18 : 12} />
      )}

      {/* (d) Spatula Flipping Food */}
      {verb === 'flip' && (
        <g transform={`translate(${x - 45} ${y - 80 - Math.sin(p * Math.PI) * 45}) rotate(${mix(p, -15, 30)})`}>
          <line x1="-35" y1="-65" x2="35" y2="40" stroke="#8d5b4c" strokeWidth="15" strokeLinecap="round" />
          <rect x="25" y="25" width="48" height="24" rx="6" fill="#adb5bd" stroke="#6c757d" strokeWidth="2" />
        </g>
      )}

      {/* (e) Spreading motion */}
      {verb === 'spread' && (
        <g transform={`translate(${Math.sin(p * Math.PI * 4) * 60} 0)`}>
          <line x1={x - 20} y1={y - 120} x2={x} y2={y - 25} stroke="#8d5b4c" strokeWidth="14" strokeLinecap="round" />
          <ellipse cx={x} cy={y - 22} rx="38" ry="12" fill="#d4a373" opacity="0.8" />
        </g>
      )}

      {/* (f) Plating Spoon & Trajectory */}
      {['serve', 'plate', 'transfer'].includes(verb) && (
        <g>
          {/* Arc path */}
          <path d={`M${x},${y - 20} Q${(x + plateX) / 2},${y - 120} ${plateX},${y + 10}`} fill="none" stroke="#e76f51" strokeWidth="4" strokeDasharray="8 8" opacity="0.5" />
          {/* Serving Spoon moving with food */}
          <g transform={`translate(${foodX} ${foodY - 20})`}>
            <line x1="-35" y1="-50" x2="0" y2="15" stroke="#8d5b4c" strokeWidth="14" strokeLinecap="round" />
            <ellipse cx="0" cy="18" rx="22" ry="12" fill="#e9ecef" stroke="#adb5bd" strokeWidth="3" />
          </g>
        </g>
      )}

      {/* 5. Steve AI Style Steam Clouds (Wafting Upwards) */}
      {isCooking && Array.from({ length: 4 }, (_, index) => {
        const steamDelay = index * 0.8;
        const steamProgress = ((time + steamDelay) % 2.4) / 2.4;
        const sx = x - 45 + index * 30 + Math.sin(time * 2.5 + index) * 15;
        const sy = y - 45 - steamProgress * 95;
        const sSize = 14 + steamProgress * 18;
        const sOpacity = Math.sin(steamProgress * Math.PI) * 0.75;
        return (
          <g key={index} opacity={sOpacity}>
            {/* Puffy cartoon cloud */}
            <circle cx={sx} cy={sy} r={sSize} fill="#ffffff" />
            <circle cx={sx - sSize * 0.6} cy={sy + 2} r={sSize * 0.7} fill="#ffffff" />
            <circle cx={sx + sSize * 0.6} cy={sy + 2} r={sSize * 0.7} fill="#ffffff" />
          </g>
        );
      })}

      {/* 6. Cartoon Sparkle Stars (Steve AI Kids' Flair) */}
      {isCooking && Array.from({ length: 3 }, (_, index) => {
        const sparkTime = (time * 2 + index * 1.5) % 3;
        const sparkX = x - 75 + index * 75 + Math.cos(time * 3 + index) * 20;
        const sparkY = y - 80 - Math.sin(time * 2 + index) * 35;
        const scale = Math.sin((sparkTime / 3) * Math.PI) * 1.2;
        return (
          <g key={index} transform={`translate(${sparkX} ${sparkY}) scale(${Math.max(0, scale)})`}>
            <path d="M0,-12 L3,-3 L12,0 L3,3 L0,12 L-3,3 L-12,0 L-3,-3 Z" fill="#ffd166" />
          </g>
        );
      })}
    </g>
  );
};

/**
 * Steve AI Inspired Cheerful Cartoon Kitchen Background
 */
const Kitchen = ({ width, height, plan, lesson, state, time, speech }) => {
  const portrait = height > width;
  const isTamil = plan.voice?.startsWith('ta-');

  const counter = portrait ? height * 0.68 : height * 0.70;
  const cookX = portrait ? width * 0.52 : width * 0.60;
  const plateX = portrait ? width * 0.80 : width * 0.86;
  const mayaX = portrait ? width * 0.28 : width * 0.32;
  const mayaY = portrait ? height * 0.44 : height * 0.52;
  const mayaScale = portrait ? 1.25 : 1.42;

  const ingredient =
    (plan.ingredients || []).find(item => item.id === state.action.ingredient) ||
    (plan.ingredients || [])[state.index % Math.max(1, (plan.ingredients || []).length)];

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid slice">
      <defs>
        {/* Pastel Mint Wall Gradient */}
        <linearGradient id="wallBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0fdf4" />
          <stop offset="100%" stopColor="#dcfce7" />
        </linearGradient>

        {/* Polished Oak Countertop Gradient */}
        <linearGradient id="counterSurface" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="10%" stopColor="#fdfbf7" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>

        {/* Counter Edge Shadow */}
        <linearGradient id="counterLip" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>

        <filter id="softShadow" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="12" stdDeviation="12" floodColor="#0f261e" floodOpacity="0.22" />
        </filter>
      </defs>

      {/* 1. Back Wall */}
      <rect width={width} height={height} fill="url(#wallBg)" />

      {/* Subway Tile Lines */}
      <g opacity="0.35" stroke="#86efac" strokeWidth="2">
        {Array.from({ length: 9 }, (_, i) => (
          <line key={i} x1="0" y1={height * 0.08 + i * 55} x2={width} y2={height * 0.08 + i * 55} />
        ))}
      </g>

      {/* 2. Cheerful Sunlit Window */}
      <g transform={`translate(${width * 0.08} ${height * 0.12})`}>
        {/* Window Sky & Sun */}
        <rect x="0" y="0" width={width * 0.18} height={height * 0.32} rx="24" fill="#bae6fd" stroke="#ffffff" strokeWidth="14" />
        <circle cx={width * 0.14} cy={height * 0.08} r="32" fill="#fde047" opacity="0.85" />
        {/* Cartoon Sky Clouds */}
        <ellipse cx={width * 0.06} cy={height * 0.16} rx="28" ry="14" fill="#ffffff" opacity="0.9" />
        <ellipse cx={width * 0.12} cy={height * 0.22} rx="36" ry="16" fill="#ffffff" opacity="0.9" />
        {/* Window Frame Panes */}
        <line x1={width * 0.09} y1="0" x2={width * 0.09} y2={height * 0.32} stroke="#ffffff" strokeWidth="8" />
        <line x1="0" y1={height * 0.16} x2={width * 0.18} y2={height * 0.16} stroke="#ffffff" strokeWidth="8" />
      </g>

      {/* 3. Wooden Wall Shelf with Colorful Spice Jars & Clock */}
      <g transform={`translate(${width * 0.52} ${height * 0.15})`}>
        {/* Wooden Shelf Plank */}
        <rect x="0" y="55" width={width * 0.38} height="16" rx="8" fill="#a16207" stroke="#78350f" strokeWidth="3" />
        {/* Brackets */}
        <polygon points={`20,71 20,95 32,71`} fill="#78350f" />
        <polygon points={`${width * 0.38 - 32},71 ${width * 0.38 - 32},95 ${width * 0.38 - 20},71`} fill="#78350f" />

        {/* Labeled Colorful Spice Jars */}
        <rect x="35" y="10" width="32" height="45" rx="8" fill="#f59e0b" stroke="#d97706" strokeWidth="3" />
        <rect x="75" y="18" width="30" height="37" rx="8" fill="#ef4444" stroke="#dc2626" strokeWidth="3" />
        <rect x="115" y="8" width="34" height="47" rx="8" fill="#10b981" stroke="#059669" strokeWidth="3" />
        <rect x="158" y="14" width="30" height="41" rx="8" fill="#8b5cf6" stroke="#7c3aed" strokeWidth="3" />
        {/* Jar Lids */}
        <rect x="31" y="6" width="40" height="8" rx="4" fill="#78350f" />
        <rect x="71" y="14" width="38" height="8" rx="4" fill="#78350f" />
        <rect x="111" y="4" width="42" height="8" rx="4" fill="#78350f" />
        <rect x="154" y="10" width="38" height="8" rx="4" fill="#78350f" />

        {/* Cute Wall Clock */}
        <circle cx={width * 0.32} cy="18" r="28" fill="#ffffff" stroke="#e11d48" strokeWidth="6" />
        <line x1={width * 0.32} y1="18" x2={width * 0.32} y2="4" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
        <line x1={width * 0.32} y1="18" x2={width * 0.32 + 12} y2="18" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* 4. Kitchen Countertop */}
      <rect x="0" y={counter} width={width} height={height - counter} fill="url(#counterSurface)" />
      {/* Front Lip bevel */}
      <rect x="0" y={counter} width={width} height="16" fill="url(#counterLip)" />

      {/* 5. Ingredients Prep Bowl on Counter (Left) */}
      <g transform={`translate(${width * 0.10} ${counter - 48})`}>
        {/* Prep Bowl Shadow */}
        <ellipse cx="0" cy="28" rx="68" ry="18" fill="rgba(15, 38, 30, 0.16)" />
        {/* Ceramic Mixing Bowl */}
        <path d="M-60,4 Q-60,38 0,38 Q60,38 60,4 Z" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="4" />
        {/* Rim & Food inside bowl */}
        <ellipse cx="0" cy="4" rx="60" ry="16" fill="#60a5fa" stroke="#1d4ed8" strokeWidth="3" />
        <ellipse cx="0" cy="-2" rx="52" ry="13" fill={ingredient?.color || '#f59e0b'} />
      </g>

      {/* 6. Cooking Action (Stove, Cookware, Utensils, Steam, Sizzle) */}
      <g filter="url(#softShadow)">
        <CookingAction
          x={cookX}
          y={counter - 8}
          plateX={plateX}
          action={state.action}
          ingredient={ingredient}
          p={state.p}
          time={time}
          portrait={portrait}
          isTamil={isTamil}
        />
      </g>

      {/* 7. Chef Maya (Actively positioned right beside the stove) */}
      <Maya
        x={mayaX}
        y={mayaY}
        scale={mayaScale}
        action={state.action}
        p={state.p}
        time={time}
        speech={speech}
        cookX={cookX}
        cookY={counter - 8}
      />
    </svg>
  );
};

/**
 * Main Remotion Cooking Lesson Composition
 */
export const CookingLesson = ({ plan, lesson, audioFile }) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const time = frame / fps;
  const isTamil = plan.voice?.startsWith('ta-');

  const state = activeState(plan, lesson, time);
  const speech = lesson.envelope?.[Math.floor(time / 0.02)] || 0;
  const caption = (lesson.captions || []).find(item => time >= item.start && time < item.end)?.text || '';

  const entrance = spring({
    frame: Math.max(0, frame - Math.round(state.timeline.start * fps)),
    fps,
    config: { damping: 16, stiffness: 140 }
  });

  const opening = interpolate(frame, [0, fps * 0.3, fps * 2.2, fps * 2.8], [0, 1, 1, 0], clamp);
  const endStart = Math.max(0, durationInFrames - fps * 2.2);
  const ending = interpolate(frame, [endStart, endStart + fps * 0.6], [0, 0.88], clamp);

  const displayTitle = isTamil ? (plan.title || 'சுவையான சமையல்') : (plan.title || 'Cooking Lesson');
  const stepLabel = isTamil
    ? `படி ${state.index + 1}: ${stepTitle(state.timeline.title || state.action.key, true)}`
    : `Step ${state.index + 1}: ${stepTitle(state.timeline.title || state.action.key, false)}`;

  return (
    <AbsoluteFill
      style={{
        fontFamily: "'Plus Jakarta Sans', 'Nirmala UI', 'Latha', 'Segoe UI', system-ui, sans-serif",
        background: '#eaf4ee',
        overflow: 'hidden'
      }}
    >
      {/* Voice Audio Narration */}
      {audioFile ? (
        audioFile.startsWith('http') || audioFile.startsWith('data:') ? (
          <Audio src={audioFile} />
        ) : (
          <Audio src={staticFile(audioFile)} />
        )
      ) : null}

      {/* 1. Cartoon Kitchen Scene */}
      <Kitchen width={width} height={height} plan={plan} lesson={lesson} state={state} time={time} speech={speech} />

      {/* 2. Steve AI Style Step Badge (Top Left Pill) */}
      <div
        style={{
          position: 'absolute',
          top: 32,
          left: 32,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '14px 22px',
          borderRadius: 30,
          background: 'rgba(255, 255, 255, 0.94)',
          border: '2px solid rgba(16, 185, 129, 0.3)',
          boxShadow: '0 12px 32px rgba(15, 38, 30, 0.16)',
          transform: `translateY(${mix(entrance, -30, 0)}px)`,
          opacity: entrance,
          color: '#0f261e'
        }}
      >
        <span
          style={{
            display: 'grid',
            placeItems: 'center',
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: '#ffffff',
            fontWeight: 900,
            fontSize: 22,
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)'
          }}
        >
          {state.index + 1}
        </span>
        <div>
          <div style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 2, color: '#e76f51', fontWeight: 900 }}>
            {isTamil ? 'செஃப் மாயா' : 'Chef Maya'}
          </div>
          <div
            style={{
              fontSize: Math.max(20, Math.min(32, width / 34)),
              fontWeight: 900,
              maxWidth: width * 0.55,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {stepLabel}
          </div>
        </div>
      </div>

      {/* 3. Steve AI Style Subtitle Pill Bar (Bottom Center) */}
      {caption && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: height > width ? '9%' : '6%',
            transform: 'translateX(-50%)',
            maxWidth: '86%',
            padding: '15px 28px',
            borderRadius: 24,
            background: 'rgba(15, 38, 30, 0.92)',
            border: '2px solid #ffd166',
            boxShadow: '0 14px 36px rgba(0, 0, 0, 0.35)',
            color: '#ffffff',
            fontSize: Math.max(24, Math.min(38, width / 28)),
            fontWeight: 800,
            textAlign: 'center',
            lineHeight: 1.35
          }}
        >
          {caption}
        </div>
      )}

      {/* 4. Bottom Video Progress Line */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 10, background: 'rgba(255, 255, 255, 0.5)' }}>
        <div
          style={{
            height: '100%',
            width: `${(frame / Math.max(1, durationInFrames - 1)) * 100}%`,
            background: 'linear-gradient(90deg, #10b981, #f59e0b, #e76f51)'
          }}
        />
      </div>

      {/* 5. Steve AI Cheerful Opening Splash */}
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          background: `rgba(15, 38, 30, ${opening * 0.82})`,
          opacity: opening,
          pointerEvents: 'none'
        }}
      >
        <div style={{ textAlign: 'center', color: 'white', transform: `scale(${mix(opening, 0.88, 1)})`, padding: 40 }}>
          <div style={{ fontSize: 20, letterSpacing: 4, textTransform: 'uppercase', fontWeight: 900, color: '#a7f3d0' }}>
            {isTamil ? 'லைஃப்மோஷன் ஸ்டுடியோ' : 'LifeMotion Cooking Studio'}
          </div>
          <div style={{ fontSize: Math.max(48, Math.min(84, width / 14)), fontWeight: 900, marginTop: 14 }}>
            {displayTitle}
          </div>
          <div style={{ fontSize: 26, marginTop: 14, color: '#ffd166', fontWeight: 700 }}>
            {isTamil ? 'செஃப் மாயாவுடன் மகிழ்ச்சியான சமையல் பாடம்' : 'A joyful cooking lesson with Chef Maya'}
          </div>
        </div>
      </AbsoluteFill>

      {/* 6. Steve AI Celebration Ending Splash */}
      {ending > 0 && (
        <AbsoluteFill
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            background: `rgba(15, 38, 30, ${ending})`,
            pointerEvents: 'none'
          }}
        >
          <div style={{ textAlign: 'center', color: 'white', opacity: ending / 0.88, transform: `scale(${mix(ending / 0.88, 0.84, 1)})` }}>
            <div style={{ fontSize: 80, color: '#ffd166' }}>★ ✨ ★</div>
            <div style={{ fontSize: Math.max(48, Math.min(80, width / 15)), fontWeight: 900, marginTop: 10 }}>
              {isTamil ? 'அருமையான சமையல்!' : 'Great cooking!'}
            </div>
            <div style={{ fontSize: 28, marginTop: 12, color: '#a7f3d0' }}>
              {isTamil ? `${displayTitle} சுடச்சுட தயார்!` : `${displayTitle} is ready to serve.`}
            </div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
