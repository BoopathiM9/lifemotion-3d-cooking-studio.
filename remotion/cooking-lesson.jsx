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
 * Realistic Human Arm & Articulated Hand
 * Anatomical curves, chef sleeve cuff, forearm tapering, palm & curled fingers.
 */
const HumanArm = ({ side, angle, bend, skin = '#f4b995', handPose = 'rest', time = 0 }) => {
  const x = side * 50;

  return (
    <g transform={`translate(${x} -24) rotate(${angle})`}>
      {/* Upper Arm with Chef Sleeve & Fabric Crease */}
      <path
        d={side > 0
          ? "M-14,0 C-18,20 -16,42 -13,56 L13,56 C16,42 18,20 14,0 Z"
          : "M-14,0 C-18,20 -16,42 -13,56 L13,56 C16,42 18,20 14,0 Z"}
        fill="#ffffff"
        stroke="#cbd5e1"
        strokeWidth="2.5"
      />
      <path d="M-11,48 Q0,54 11,48" fill="none" stroke="#e2e8f0" strokeWidth="2.5" />
      {/* Sleeve Cuff */}
      <rect x="-14" y="52" width="28" height="8" rx="3" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />

      {/* Forearm - Tapering Smoothly to Wrist */}
      <g transform={`translate(0 58) rotate(${bend})`}>
        <path
          d={side > 0
            ? "M-10,0 C-12,18 -9,38 -7,50 L7,50 C9,38 12,18 10,0 Z"
            : "M-10,0 C-12,18 -9,38 -7,50 L7,50 C9,38 12,18 10,0 Z"}
          fill={skin}
        />
        {/* Soft highlight on forearm muscle */}
        <path d="M-2,6 C-3,18 -2,32 0,42" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.35" />

        {/* Hand - Anatomical with Articulated Fingers */}
        <g transform="translate(0 50)">
          {handPose === 'wave' && (
            // Cheerful Waving Hand with Secondary Finger Flutter
            <g transform={`rotate(${Math.sin(time * 5.4) * 16})`}>
              {/* Palm */}
              <ellipse cx="0" cy="9" rx="12" ry="11" fill={skin} />
              {/* Thumb */}
              <path d="M-9,3 Q-16,7 -12,15 Q-8,13 -6,8 Z" fill={skin} />
              {/* 4 Articulated Fingers */}
              {[-6, -2, 2, 6].map((fx, i) => {
                const flutter = Math.sin(time * 5.4 + i * 0.45) * 3;
                return (
                  <g key={i} transform={`translate(${fx} 15)`}>
                    <line x1="0" y1="0" x2={flutter} y2="15" stroke={skin} strokeWidth="5.5" strokeLinecap="round" />
                    <circle cx={flutter} cy="14" r="1.4" fill="#ffffff" opacity="0.4" />
                  </g>
                );
              })}
            </g>
          )}

          {handPose === 'stir' && (
            // Human Hand Wrapped Naturally Around Utensil Handle
            <g transform={`rotate(${Math.sin(time * 4.6) * 14})`}>
              <ellipse cx="0" cy="8" rx="12" ry="10" fill="#e89e7c" />
              {/* Wooden Spatula Handle Through Hand */}
              <line x1="-3" y1="-26" x2="3" y2="38" stroke="#8d5b4c" strokeWidth="9" strokeLinecap="round" />
              {/* 4 Curled Fingers Around Handle */}
              {[2, 7, 12, 17].map((fy, i) => (
                <rect key={i} x="-8" y={fy - 3} width="16" height="5.5" rx="2.5" fill={skin} stroke="#e89e7c" strokeWidth="0.8" />
              ))}
              {/* Opposing Thumb Pressing on Handle */}
              <path d="M-8,2 Q-14,6 -10,14 Q-5,12 -4,6 Z" fill={skin} />
            </g>
          )}

          {handPose === 'grip' && (
            // Resting Grip Holding Pot Handle
            <g>
              <ellipse cx="0" cy="8" rx="11" ry="9" fill={skin} />
              <path d={side > 0 ? "M6,4 Q12,7 8,14 Q4,12 3,6 Z" : "M-6,4 Q-12,7 -8,14 Q-4,12 -3,6 Z"} fill={skin} />
              {[-5, -1, 3, 7].map((fx, i) => (
                <ellipse key={i} cx={fx} cy="14" rx="2.8" ry="5" fill={skin} />
              ))}
            </g>
          )}

          {handPose === 'rest' && (
            // Relaxed Human Hand
            <g>
              <ellipse cx="0" cy="8" rx="11" ry="10" fill={skin} />
              <path d={side > 0 ? "M6,2 Q14,6 10,14 Q6,12 4,6 Z" : "M-6,2 Q-14,6 -10,14 Q-6,12 -4,6 Z"} fill={skin} />
              {[-5, -1, 3, 7].map((fx, i) => (
                <line key={i} x1={fx} y1="12" x2={fx * 1.08} y2="22" stroke={skin} strokeWidth="4.5" strokeLinecap="round" />
              ))}
            </g>
          )}
        </g>
      </g>
    </g>
  );
};

/**
 * Human Pixar-Style Chef Maya Character
 * Expressive face, blinking eyes, talking mouth sync, dynamic human posture.
 */
const Maya = ({ x, y, scale, action, p, time, speech }) => {
  const verb = action.action || 'show';
  const beat = Math.sin(time * 5.4);
  const breath = Math.sin(time * 2.2) * 2.8;

  const isStirring = ['stir', 'mix', 'cook', 'boil', 'simmer', 'fry', 'saute'].includes(verb);
  const stirSpeed = time * 4.6;

  // Organic Human Posture Dynamics
  const bodyLean = isStirring ? Math.sin(stirSpeed) * 2.2 : 0;
  const headBob = isStirring ? Math.sin(stirSpeed) * 2.4 : Math.sin(time * 2.2) * 2;
  const headTilt = isStirring ? 6 + Math.cos(stirSpeed) * 2.5 : (verb === 'show' ? Math.sin(time * 2.4) * 4 : 0);

  let leftAngle = 24, leftBend = 28, leftPose = 'grip';
  let rightAngle = -26, rightBend = 25, rightPose = 'rest';

  if (action.key === 'welcome' || verb === 'show') {
    // Cheerful greeting wave
    leftAngle = -68 + Math.sin(time * 5.2) * 14;
    leftBend = -38;
    leftPose = 'wave';
    rightAngle = 18;
    rightBend = 24;
    rightPose = 'rest';
  } else if (isStirring) {
    // Left hand holding pot handle with human grip
    leftAngle = 38 + bodyLean;
    leftBend = 34;
    leftPose = 'grip';
    // Right arm actively stirring in smooth elliptical orbit
    rightAngle = -46 + Math.cos(stirSpeed) * 16;
    rightBend = -40 + Math.sin(stirSpeed) * 14;
    rightPose = 'stir';
  } else if (['add', 'pour', 'sprinkle', 'layer', 'place'].includes(verb)) {
    leftAngle = 36;
    leftBend = 28;
    leftPose = 'grip';
    rightAngle = mix(p, -22, -68);
    rightBend = mix(p, 12, -50);
    rightPose = 'rest';
  } else if (['serve', 'plate', 'transfer'].includes(verb)) {
    leftAngle = 20;
    leftBend = 22;
    leftPose = 'rest';
    rightAngle = mix(p, -48, 38);
    rightBend = mix(p, -38, 28);
    rightPose = 'stir';
  }

  const blink = (time % 3.6) > 3.42 ? 0.1 : 1;
  const mouth = Math.max(0.1, Math.min(1, speech * 6));

  return (
    <g transform={`translate(${x} ${y + breath}) scale(${scale})`}>
      {/* Ground drop shadow */}
      <ellipse cx="0" cy="74" rx="66" ry="18" fill="rgba(14, 40, 30, 0.18)" />

      {/* Human Arms with Contoured Sleeve and Curved Fingers */}
      <HumanArm side={-1} angle={leftAngle} bend={leftBend} handPose={leftPose} time={time} />
      <HumanArm side={1} angle={rightAngle} bend={rightBend} handPose={rightPose} time={time} />

      {/* Chef Jacket Body with Subtle Organic Torso Lean */}
      <g transform={`rotate(${bodyLean})`}>
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
      </g>

      {/* Head with Natural Nodding & Eye Gazing Toward Food */}
      <g transform={`translate(0 ${headBob}) rotate(${headTilt})`}>
        {/* Hair Base */}
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

        {/* Big Cartoon Eyes - Gazing at Cookware When Cooking */}
        <g transform={isStirring ? "translate(0 3)" : ""}>
          {/* Eye whites */}
          <ellipse cx="-23" cy="-110" rx="13" ry={17 * blink} fill="#ffffff" stroke="#2d3748" strokeWidth="2" />
          <ellipse cx="23" cy="-110" rx="13" ry={17 * blink} fill="#ffffff" stroke="#2d3748" strokeWidth="2" />
          {/* Irises - Bright Emerald Green */}
          <circle cx={isStirring ? -21 : -20} cy={isStirring ? -107 : -109} r={9 * blink} fill="#2f855a" />
          <circle cx={isStirring ? 25 : 26} cy={isStirring ? -107 : -109} r={9 * blink} fill="#2f855a" />
          {/* Pupils */}
          <circle cx={isStirring ? -20 : -19} cy={isStirring ? -107 : -109} r={5 * blink} fill="#1a202c" />
          <circle cx={isStirring ? 26 : 27} cy={isStirring ? -107 : -109} r={5 * blink} fill="#1a202c" />
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
          <circle cx="0" cy="-2" r="7" fill="#ffd166" />
          <path d="M0,-6 L1.8,-1.5 L6.5,-1.5 L2.7,1.2 L4.2,5.8 L0,3 L-4.2,5.8 L-2.7,1.2 L-6.5,-1.5 L-1.8,-1.5 Z" fill="#e76f51" />
        </g>
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
 * Distinctive Dish Visual Engine
 * Renders authentic cookware & real food textures based on recipe:
 * - Biryani Handi (Clay/Brass pot with basmati rice, tender pieces, mint)
 * - Sundal Kadai (Golden chickpeas, mustard crackle, snow coconut shower)
 * - Masala Dosa (Flat tawa, thin crispy crepe, potato masala)
 * - Smoothie / Beverage (Blender pitcher with swirl vortex, tall glass)
 * - Noodles / Pasta (Wok with wavy noodle ribbons, ramen bowl)
 * - Pancakes (Skillet with fluffy pancake stack, melting butter)
 */
const CookingAction = ({ plan, x, y, plateX, action, ingredient, p, time, portrait, isTamil }) => {
  const verb = action.action || 'show';
  const color = ingredient?.color || '#f39c12';
  const isCooking = ['cook', 'boil', 'simmer', 'fry', 'saute', 'mix', 'stir'].includes(verb);

  // Identify Recipe Archetype
  const rawDish = ((plan?.recipe || '') + ' ' + (plan?.title || '')).toLowerCase();
  const isBiryani = /biryani|biriyani|dum|rice|pulao|pulav/.test(rawDish);
  const isSundal = /sundal|sandel|chickpea|chana|kondakadalai/.test(rawDish);
  const isNoodles = /noodle|pasta|spaghetti|macaroni|chowmein|maggi/.test(rawDish);
  const isBeverage = /smoothie|shake|juice|lassi|drink|tea|coffee/.test(rawDish);
  const isPancake = /pancake|waffle/.test(rawDish);
  const isDosa = !isBiryani && !isSundal && !isNoodles && !isBeverage && !isPancake && /dosa|dosai/.test(rawDish);

  // Cookware Dimensions
  const panW = portrait ? 210 : 260;
  const panH = portrait ? 60 : 72;
  const rimRx = panW / 2;
  const rimRy = panH / 2;

  // Food position inside pan or transferring to plate
  const foodX = ['serve', 'plate', 'transfer'].includes(verb) ? mix(p, x, plateX) : x;
  const foodY = y - 22 - (verb === 'flip' ? Math.sin(p * Math.PI) * (portrait ? 120 : 90) : 0);
  const pulse = Math.sin(time * 6);
  const stirOrbitX = Math.cos(time * 4.6) * 32;
  const stirOrbitY = Math.sin(time * 4.6) * 12;

  return (
    <g>
      {/* 1. Authentic Serving Plate on Right Side of Counter */}
      <g>
        <ellipse cx={plateX} cy={y + 36} rx={portrait ? 94 : 125} ry="30" fill="rgba(15, 38, 30, 0.15)" />

        {isBiryani ? (
          // Royal Indian Brass/Silver Thali for Biryani
          <g>
            <ellipse cx={plateX} cy={y + 26} rx={portrait ? 90 : 122} ry="26" fill="#fef08a" stroke="#ca8a04" strokeWidth="4" />
            <ellipse cx={plateX} cy={y + 24} rx={portrait ? 76 : 106} ry="20" fill="#fffbeb" stroke="#eab308" strokeWidth="1.5" />
            {/* Mound of fluffy basmati biryani with fried onions & mint on plate */}
            <path d={`M${plateX - 55},${y + 22} Q${plateX},${y - 12} ${plateX + 55},${y + 22} Z`} fill="#f59e0b" />
            <circle cx={plateX - 18} cy={y + 12} r="9" fill="#d69a68" />
            <circle cx={plateX + 22} cy={y + 15} r="8" fill="#b57c3d" />
            {/* Red onion rings & lemon wedge garnish */}
            <ellipse cx={plateX - 35} cy={y + 22} rx="12" ry="6" fill="none" stroke="#be185d" strokeWidth="3" />
            <path d={`M${plateX + 38},${y + 18} L${plateX + 54},${y + 16} L${plateX + 46},${y + 26} Z`} fill="#fde047" stroke="#ca8a04" strokeWidth="1.5" />
          </g>
        ) : isSundal ? (
          // Fresh Green Banana Leaf Platter for Sundal
          <g>
            <path
              d={`M${plateX - 85},${y + 26} C${plateX - 50},${y + 10} ${plateX + 50},${y + 10} ${plateX + 85},${y + 26} C${plateX + 50},${y + 42} ${plateX - 50},${y + 42} Z`}
              fill="#22c55e"
              stroke="#15803d"
              strokeWidth="3"
            />
            {/* Banana leaf mid-rib */}
            <line x1={plateX - 80} y1={y + 26} x2={plateX + 80} y2={y + 26} stroke="#16a34a" strokeWidth="2.5" />
            {/* Golden Sundal Chickpeas mound on leaf */}
            <path d={`M${plateX - 45},${y + 24} Q${plateX},${y + 2} ${plateX + 45},${y + 24} Z`} fill="#f59e0b" />
            {/* White grated coconut snow on sundal */}
            {[-25, -10, 5, 20, 0].map((cx, i) => (
              <circle key={i} cx={plateX + cx} cy={y + 14 + (i % 2) * 4} r="3" fill="#ffffff" />
            ))}
          </g>
        ) : isBeverage ? (
          // Tall Frosted Smoothie Glass with Striped Straw
          <g transform={`translate(${plateX} ${y + 8})`}>
            {/* Glass shadow */}
            <ellipse cx="0" cy="24" rx="28" ry="8" fill="rgba(0,0,0,0.15)" />
            {/* Tall Glass Body */}
            <path d="M-22,-52 L-16,22 Q0,26 16,22 L22,-52 Z" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="2" opacity="0.85" />
            {/* Smoothie Liquid inside glass */}
            <path d="M-19,-40 L-15,18 Q0,22 15,18 L19,-40 Z" fill="#fbbf24" />
            {/* Striped Paper Straw */}
            <line x1="4" y1="-78" x2="0" y2="10" stroke="#f43f5e" strokeWidth="6" strokeLinecap="round" />
            <line x1="4" y1="-78" x2="0" y2="10" stroke="#ffffff" strokeWidth="6" strokeDasharray="6 6" strokeLinecap="round" />
            {/* Lime slice on rim */}
            <circle cx="-18" cy="-52" r="10" fill="#a3e635" stroke="#65a30d" strokeWidth="2" />
          </g>
        ) : isNoodles ? (
          // Asian Ceramic Ramen Bowl with Chopsticks
          <g transform={`translate(${plateX} ${y + 18})`}>
            <ellipse cx="0" cy="18" rx="42" ry="12" fill="#e2e8f0" stroke="#0284c7" strokeWidth="3" />
            <path d="M-42,16 Q-40,48 0,48 Q40,48 42,16 Z" fill="#f8fafc" stroke="#0284c7" strokeWidth="3" />
            {/* Wavy noodles inside bowl */}
            <path d="M-30,14 Q-15,6 0,14 Q15,6 30,14" fill="none" stroke="#f59e0b" strokeWidth="4" />
            {/* Chopsticks resting on rim */}
            <line x1="-36" y1="-12" x2="40" y2="14" stroke="#854d0e" strokeWidth="3.5" />
            <line x1="-34" y1="-16" x2="42" y2="10" stroke="#854d0e" strokeWidth="3.5" />
          </g>
        ) : (
          // Classic Ceramic Dinner Plate
          <g>
            <ellipse cx={plateX} cy={y + 26} rx={portrait ? 86 : 116} ry="24" fill="#ffffff" stroke="#2a9d8f" strokeWidth="5" />
            <ellipse cx={plateX} cy={y + 24} rx={portrait ? 72 : 98} ry="18" fill="#fdfbf7" stroke="#e76f51" strokeWidth="2" strokeDasharray="6 4" />
          </g>
        )}
      </g>

      {/* 2. Stove / Cooktop Unit Under Pan */}
      <g transform={`translate(${x} ${y + 8})`}>
        <rect x={-rimRx - 28} y={-10} width={(rimRx + 28) * 2} height="36" rx="14" fill="#1f2937" stroke="#374151" strokeWidth="3" />
        <ellipse cx="0" cy="4" rx={rimRx - 15} ry="16" fill="none" stroke="#ff5722" strokeWidth="5" opacity={isCooking ? 0.85 + pulse * 0.15 : 0.25} />
        <ellipse cx="0" cy="4" rx={rimRx - 38} ry="10" fill="none" stroke="#ffb703" strokeWidth="4" opacity={isCooking ? 0.9 : 0.3} />
        {isCooking && Array.from({ length: 9 }, (_, i) => {
          const angle = (i / 9) * Math.PI * 2;
          const fx = Math.cos(angle) * (rimRx - 26);
          const fy = Math.sin(angle) * 12 + 4;
          return <circle key={i} cx={fx} cy={fy} r={4 + pulse} fill="#00b4d8" opacity="0.8" />;
        })}
      </g>

      {/* 3. Distinct Cookware & Real Food Rendering */}
      {isBiryani ? (
        // Deep Royal Biryani Handi (Clay / Brass Dum Pot)
        <g>
          {/* Handi Brass Loop Handles */}
          <path d={`M${x - rimRx - 10},${y - 10} Q${x - rimRx - 35},${y + 10} ${x - rimRx - 5},${y + 30}`} fill="none" stroke="#ca8a04" strokeWidth="7" strokeLinecap="round" />
          <path d={`M${x + rimRx + 10},${y - 10} Q${x + rimRx + 35},${y + 10} ${x + rimRx + 5},${y + 30}`} fill="none" stroke="#ca8a04" strokeWidth="7" strokeLinecap="round" />
          {/* Handi Belly (Bulbous Clay/Copper Pot) */}
          <path d={`M${x - rimRx},${y - 10} C${x - rimRx - 25},${y + 40} ${x - 40},${y + 60} ${x},${y + 60} C${x + 40},${y + 60} ${x + rimRx + 25},${y + 40} ${x + rimRx},${y - 10} Z`} fill="#9a3412" stroke="#7c2d12" strokeWidth="4" />
          {/* Pot Golden Rim */}
          <ellipse cx={x} cy={y - 10} rx={rimRx} ry={rimRy} fill="#ca8a04" stroke="#a16207" strokeWidth="3" />
          <ellipse cx={x} cy={y - 13} rx={rimRx - 14} ry={rimRy - 8} fill="#78350f" />

          {/* Steaming Fluffy Basmati Rice Grains & Roasted Chicken Inside Handi */}
          <ellipse cx={foodX} cy={foodY + 4} rx={rimRx - 24} ry={rimRy - 10} fill="#fef3c7" />
          {/* Rice Grains (Golden Saffron & Ivory) */}
          {[-45, -25, -5, 15, 35, -35, -15, 5, 25, 45].map((gx, i) => (
            <ellipse key={i} cx={foodX + gx} cy={foodY + 2 + (i % 3) * 3} rx="6" ry="2.2" fill={i % 2 === 0 ? "#f59e0b" : "#ffffff"} transform={`rotate(${(i * 35) % 90} ${foodX + gx} ${foodY + 2})`} />
          ))}
          {/* Succulent Chicken / Veg Pieces */}
          <circle cx={foodX - 28} cy={foodY} r="11" fill="#d69a68" stroke="#92400e" strokeWidth="1.5" />
          <circle cx={foodX + 22} cy={foodY - 2} r="10" fill="#b57c3d" stroke="#78350f" strokeWidth="1.5" />
          <circle cx={foodX} cy={foodY + 6} r="9" fill="#d69a68" stroke="#92400e" strokeWidth="1.5" />
          {/* Fresh Green Mint Leaves */}
          <path d={`M${foodX - 12},${foodY - 6} Q${foodX - 4},${foodY - 14} ${foodX + 4},${foodY - 6} Q${foodX - 4},${foodY} ${foodX - 12},${foodY - 6}`} fill="#16a34a" />
          <path d={`M${foodX + 16},${foodY + 4} Q${foodX + 24},${foodY - 4} ${foodX + 32},${foodY + 4} Q${foodX + 24},${foodY + 10} ${foodX + 16},${foodY + 4}`} fill="#16a34a" />
        </g>
      ) : isSundal ? (
        // Traditional South Indian Iron Kadhai with Twin Loop Handles
        <g>
          {/* Kadhai Handles */}
          <circle cx={x - rimRx - 14} cy={y} r="12" fill="none" stroke="#ca8a04" strokeWidth="5" />
          <circle cx={x + rimRx + 14} cy={y} r="12" fill="none" stroke="#ca8a04" strokeWidth="5" />
          {/* Deep Cast Iron Kadhai Bowl */}
          <path d={`M${x - rimRx},${y - 10} Q${x - rimRx},${y + 48} ${x},${y + 48} Q${x + rimRx},${y + 48} ${x + rimRx},${y - 10} Z`} fill="#1e293b" stroke="#0f172a" strokeWidth="4" />
          <ellipse cx={x} cy={y - 10} rx={rimRx} ry={rimRy} fill="#334155" stroke="#1e293b" strokeWidth="3" />
          <ellipse cx={x} cy={y - 13} rx={rimRx - 14} ry={rimRy - 8} fill="#0f172a" />

          {/* Golden Boiled Chickpeas (Chana) with 3D Spheres Inside Kadhai */}
          <ellipse cx={foodX} cy={foodY + 4} rx={rimRx - 24} ry={rimRy - 10} fill="#d97706" />
          {[-50, -32, -14, 4, 22, 40, -40, -22, -4, 14, 32, -10, 8].map((cx, i) => (
            <g key={i} transform={`translate(${foodX + cx} ${foodY + (i % 3) * 4})`}>
              <circle cx="0" cy="0" r="7.5" fill="#f59e0b" stroke="#b45309" strokeWidth="1" />
              <circle cx="-2" cy="-2.5" r="2.5" fill="#fde68a" opacity="0.8" />
            </g>
          ))}
          {/* Black Mustard Seeds & Curry Leaves */}
          {[-38, -18, 2, 28, -8, 18].map((mx, i) => (
            <circle key={i} cx={foodX + mx} cy={foodY - 2 + (i % 2) * 6} r="2" fill="#0f172a" />
          ))}
          <path d={`M${foodX - 20},${foodY + 2} Q${foodX - 10},${foodY - 6} ${foodX},${foodY + 2}`} fill="#15803d" stroke="#166534" strokeWidth="3" />
          {/* Fresh Grated Coconut Snow Shower */}
          {[-42, -28, -12, 6, 24, 38, -20, 0, 16].map((sx, i) => (
            <rect key={i} x={foodX + sx} y={foodY - 2 + (i % 3) * 4} width="5" height="2.5" rx="1" fill="#ffffff" />
          ))}
        </g>
      ) : isBeverage ? (
        // Transparent Glass Blender Pitcher on Motor Base
        <g transform={`translate(${x} ${y - 30})`}>
          {/* Blender Motor Base */}
          <rect x="-48" y="44" width="96" height="34" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="3" />
          <circle cx="0" cy="60" r="8" fill="#ef4444" />
          {/* Glass Pitcher */}
          <path d="M-40,-50 L-32,44 L32,44 L40,-50 Z" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="3" opacity="0.85" />
          {/* Pitcher Handle */}
          <path d="M38,-35 Q64,-5 34,25" fill="none" stroke="#38bdf8" strokeWidth="6" strokeLinecap="round" />
          {/* Swirling Smoothie Vortex */}
          <path d={`M-30,-20 Q0,${-10 + pulse * 8} 30,-20 L26,40 L-26,40 Z`} fill={color} />
          {/* Blending Vortex Spiral */}
          <ellipse cx="0" cy={-16 + pulse * 4} rx="24" ry="7" fill="none" stroke="#ffffff" strokeWidth="3" opacity="0.7" />
        </g>
      ) : isNoodles ? (
        // Deep Asian Stir-Fry Wok
        <g>
          <line x1={x - rimRx} y1={y - 8} x2={x - rimRx - 80} y2={y - 20} stroke="#854d0e" strokeWidth="14" strokeLinecap="round" />
          <path d={`M${x - rimRx},${y - 12} Q${x - rimRx},${y + 44} ${x},${y + 44} Q${x + rimRx},${y + 44} ${x + rimRx},${y - 12} Z`} fill="#334155" stroke="#1e293b" strokeWidth="4" />
          <ellipse cx={x} cy={y - 12} rx={rimRx} ry={rimRy} fill="#1e293b" stroke="#475569" strokeWidth="3" />
          {/* Wavy Noodles with Veggie Matchsticks */}
          <ellipse cx={foodX} cy={foodY + 2} rx={rimRx - 24} ry={rimRy - 10} fill="#fef08a" />
          <path d={`M${foodX - 45},${foodY} Q${foodX - 20},${foodY - 10} ${foodX},${foodY + 4} Q${foodX + 20},${foodY + 12} ${foodX + 45},${foodY}`} fill="none" stroke="#eab308" strokeWidth="5" />
          <path d={`M${foodX - 40},${foodY + 6} Q${foodX - 15},${foodY + 14} ${foodX + 10},${foodY} Q${foodX + 30},${foodY - 8} ${foodX + 42},${foodY + 8}`} fill="none" stroke="#ca8a04" strokeWidth="4.5" />
          <line x1={foodX - 25} y1={foodY - 2} x2={foodX - 8} y2={foodY + 6} stroke="#f97316" strokeWidth="3.5" />
          <line x1={foodX + 12} y1={foodY - 4} x2={foodX + 28} y2={foodY + 4} stroke="#22c55e" strokeWidth="3.5" />
        </g>
      ) : (
        // Flat Cast-Iron Pan / Tawa (for Dosa, Pancakes, Sauté)
        <g>
          <path d={`M${x - rimRx + 10},${y - 12} L${x - rimRx - 85},${y - 8} L${x - rimRx - 85},${y + 4} L${x - rimRx + 10},${y + 8} Z`} fill="#2d3748" stroke="#1a202c" strokeWidth="2" />
          <rect x={x - rimRx - 80} y={y - 12} width="55" height="18" rx="7" fill="#4a5568" />
          <path d={`M${x - rimRx},${y - 15} Q${x - rimRx},${y + 36} ${x},${y + 36} Q${x + rimRx},${y + 36} ${x + rimRx},${y - 15} Z`} fill="#374151" stroke="#1f2937" strokeWidth="4" />
          <ellipse cx={x} cy={y - 15} rx={rimRx} ry={rimRy} fill="#1f2937" stroke="#4b5563" strokeWidth="3" />
          <ellipse cx={x} cy={y - 18} rx={rimRx - 14} ry={rimRy - 8} fill="#27272a" stroke="#52525b" strokeWidth="2" />

          {/* Dosa Crepe with Spiral Ladle Swirls */}
          <ellipse cx={foodX} cy={foodY} rx={rimRx - 28} ry={rimRy - 12} fill={color} transform={`rotate(${verb === 'flip' ? p * 180 : 0} ${foodX} ${foodY})`} />
          <ellipse cx={foodX} cy={foodY} rx={rimRx - 44} ry={rimRy - 18} fill="none" stroke="#d97706" strokeWidth="2" opacity="0.6" />
          <ellipse cx={foodX} cy={foodY} rx={rimRx - 60} ry={rimRy - 22} fill="none" stroke="#d97706" strokeWidth="2" opacity="0.4" />
          {/* Potato Masala filling in center */}
          <circle cx={foodX} cy={foodY} r="16" fill="#eab308" stroke="#ca8a04" strokeWidth="1.5" />
        </g>
      )}

      {/* 4. Active Utensils & Kinematics */}
      {/* (a) Smooth Elliptical Orbital Stirring with Spatula */}
      {isCooking && (
        <g transform={`translate(${stirOrbitX} ${stirOrbitY})`}>
          {/* Wooden Spatula Handle connecting smoothly to Maya's hand */}
          <line x1={x - 70} y1={y - 130} x2={x + 12} y2={y - 20} stroke="#8d5b4c" strokeWidth="15" strokeLinecap="round" />
          {/* Spatula Blade Head */}
          <path d={`M${x - 6},${y - 38} L${x + 28},${y - 18} L${x + 20},${y - 4} L${x - 14},${y - 24} Z`} fill="#d4a373" stroke="#6f4e37" strokeWidth="3" />
          {/* Sizzle circular sauce trail */}
          <ellipse cx={x} cy={y - 20} rx="40" ry="14" fill="none" stroke="#fff3b0" strokeWidth="4.5" opacity="0.75" />
        </g>
      )}

      {/* (b) Pouring Jug with Streaming Sauce */}
      {verb === 'pour' && (
        <g>
          <g transform={`translate(${x - 42} ${y - 150}) rotate(${mix(p, 5, 52)})`}>
            <rect x="-42" y="-36" width="76" height="72" rx="16" fill="#ffb703" stroke="#fb8500" strokeWidth="4" />
            <path d="M30,-18 L74,-4 L30,12 Z" fill="#ffb703" stroke="#fb8500" strokeWidth="3" />
            <path d="M-40,-20 Q-68,0 -40,20" fill="none" stroke="#fb8500" strokeWidth="8" strokeLinecap="round" />
          </g>
          <path d={`M${x + 12},${y - 110} Q${x + 25},${y - 65} ${x},${y - 28}`} fill="none" stroke="#ffb703" strokeWidth={p > 0.15 && p < 0.92 ? 14 : 0} strokeLinecap="round" />
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

      {/* (e) Plating Spoon & Trajectory */}
      {['serve', 'plate', 'transfer'].includes(verb) && (
        <g>
          <path d={`M${x},${y - 20} Q${(x + plateX) / 2},${y - 120} ${plateX},${y + 10}`} fill="none" stroke="#e76f51" strokeWidth="4" strokeDasharray="8 8" opacity="0.5" />
          <g transform={`translate(${foodX} ${foodY - 20})`}>
            <line x1="-35" y1="-50" x2="0" y2="15" stroke="#8d5b4c" strokeWidth="14" strokeLinecap="round" />
            <ellipse cx="0" cy="18" rx="22" ry="12" fill="#e9ecef" stroke="#adb5bd" strokeWidth="3" />
          </g>
        </g>
      )}

      {/* 5. Steve AI Style Puffy Steam Clouds (Wafting Upwards) */}
      {isCooking && Array.from({ length: 4 }, (_, index) => {
        const steamDelay = index * 0.8;
        const steamProgress = ((time + steamDelay) % 2.4) / 2.4;
        const sx = x - 45 + index * 30 + Math.sin(time * 2.5 + index) * 15;
        const sy = y - 45 - steamProgress * 95;
        const sSize = 14 + steamProgress * 18;
        const sOpacity = Math.sin(steamProgress * Math.PI) * 0.75;
        return (
          <g key={index} opacity={sOpacity}>
            <circle cx={sx} cy={sy} r={sSize} fill="#ffffff" />
            <circle cx={sx - sSize * 0.6} cy={sy + 2} r={sSize * 0.7} fill="#ffffff" />
            <circle cx={sx + sSize * 0.6} cy={sy + 2} r={sSize * 0.7} fill="#ffffff" />
          </g>
        );
      })}

      {/* 6. Cartoon Sparkle Stars */}
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
        <linearGradient id="wallBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0fdf4" />
          <stop offset="100%" stopColor="#dcfce7" />
        </linearGradient>

        <linearGradient id="counterSurface" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="10%" stopColor="#fdfbf7" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>

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

      {/* 2. Cozy Kitchen Window Looking Out to Sunny Garden */}
      <g transform={`translate(${width * 0.52} ${height * 0.12})`}>
        <rect x="-85" y="-60" width="170" height="120" rx="14" fill="#bae6fd" stroke="#0284c7" strokeWidth="6" />
        <ellipse cx="40" cy="-20" rx="28" ry="28" fill="#fde047" />
        <rect x="-82" y="32" width="164" height="26" fill="#86efac" />
        <line x1="0" y1="-60" x2="0" y2="60" stroke="#0284c7" strokeWidth="5" />
        <line x1="-85" y1="0" x2="85" y2="0" stroke="#0284c7" strokeWidth="5" />
      </g>

      {/* 3. Kitchen Countertop Surface */}
      <g>
        <rect x="0" y={counter} width={width} height={height - counter} fill="#64748b" />
        <rect x="0" y={counter} width={width} height="40" fill="url(#counterSurface)" />
        <rect x="0" y={counter + 40} width={width} height="12" fill="url(#counterLip)" />
      </g>

      {/* 4. Cheerful Ingredient Bowl on Counter */}
      <g transform={`translate(${width * 0.14} ${counter + 8})`}>
        <path d="M-60,4 Q-60,38 0,38 Q60,38 60,4 Z" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="4" />
        <ellipse cx="0" cy="4" rx="60" ry="16" fill="#60a5fa" stroke="#1d4ed8" strokeWidth="3" />
        <ellipse cx="0" cy="-2" rx="52" ry="13" fill={ingredient?.color || '#f59e0b'} />
      </g>

      {/* 5. Authentic Cooking Action & Distinct Cookware */}
      <g filter="url(#softShadow)">
        <CookingAction
          plan={plan}
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

      {/* 6. Human Chef Maya with Natural Arm and Posture */}
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
