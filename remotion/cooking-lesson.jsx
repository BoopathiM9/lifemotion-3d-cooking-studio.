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
              <ellipse cx="0" cy="9" rx="12" ry="11" fill={skin} />
              <path d="M-9,3 Q-16,7 -12,15 Q-8,13 -6,8 Z" fill={skin} />
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
            // Human Hand Wrapped Naturally Around Wooden Spatula Handle
            <g transform={`rotate(${Math.sin(time * 4.6) * 10})`}>
              <ellipse cx="0" cy="8" rx="12" ry="10" fill="#e89e7c" />
              {/* Long Wooden Spatula Handle Reaching Directly into Cookware */}
              <line x1="-2" y1="-32" x2="6" y2="76" stroke="#8d5b4c" strokeWidth="12" strokeLinecap="round" />
              {/* Wooden Spatula Angled Paddle Blade */}
              <path d="M-6,68 L18,72 L14,90 L-10,86 Z" fill="#d4a373" stroke="#6f4e37" strokeWidth="2.5" />
              {/* 4 Curled Fingers Around Handle */}
              {[2, 7, 12, 17].map((fy, i) => (
                <rect key={i} x="-9" y={fy - 3} width="18" height="5.5" rx="2.5" fill={skin} stroke="#e89e7c" strokeWidth="0.8" />
              ))}
              {/* Opposing Thumb Pressing on Handle */}
              <path d="M-9,2 Q-15,6 -11,14 Q-5,12 -4,6 Z" fill={skin} />
            </g>
          )}

          {handPose === 'bowl' && (
            // Chef Hand Holding Wooden Ingredient Bowl with Seasoned Chicken
            <g transform="rotate(22)">
              <ellipse cx="0" cy="8" rx="12" ry="10" fill="#e89e7c" />
              {/* Carved Wooden Prep Bowl */}
              <path d="M-26,-10 Q0,-28 26,-10 L22,22 Q0,34 -22,22 Z" fill="#8d5b4c" stroke="#5c3d2e" strokeWidth="3" />
              <ellipse cx="0" cy="-10" rx="26" ry="10" fill="#b45309" stroke="#78350f" strokeWidth="2" />
              {/* Spiced Chicken Drumstick / Pieces inside bowl */}
              <ellipse cx="-4" cy="-10" rx="14" ry="7" fill="#d97706" />
              <ellipse cx="6" cy="-12" rx="11" ry="6" fill="#f59e0b" />
              <line x1="8" y1="-14" x2="22" y2="-18" stroke="#fefae0" strokeWidth="4" strokeLinecap="round" />
              <circle cx="22" cy="-18" r="3" fill="#fefae0" />
              {/* Fingers gripping bowl rim */}
              {[0, 6, 12, 18].map((fy, i) => (
                <rect key={i} x="-18" y={fy - 2} width="14" height="5.5" rx="2" fill={skin} />
              ))}
            </g>
          )}

          {handPose === 'pour' && (
            // Hand holding small tilted seasoning pitcher pouring golden oil
            <g transform="rotate(28)">
              <ellipse cx="0" cy="8" rx="12" ry="10" fill="#e89e7c" />
              <path d="M-18,-6 Q0,-20 18,-6 L14,16 Q0,26 -14,16 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
              <ellipse cx="0" cy="-6" rx="18" ry="7" fill="#fbbf24" />
              {[0, 6, 12].map((fy, i) => (
                <rect key={i} x="-14" y={fy} width="12" height="5" rx="2" fill={skin} />
              ))}
            </g>
          )}

          {handPose === 'coconut' && (
            // Hand with fluttering fingers showering white grated coconut snow
            <g transform={`rotate(${Math.sin(time * 6) * 12})`}>
              <ellipse cx="0" cy="8" rx="12" ry="10" fill="#e89e7c" />
              {/* Coconut flakes fluttering from fingers */}
              {[-6, 0, 6].map((fx, i) => (
                <ellipse key={i} cx={fx} cy={16 + i * 4} rx="4" ry="1.5" fill="#ffffff" stroke="#f1f5f9" strokeWidth="0.5" />
              ))}
              {[-5, -1, 3, 7].map((fx, i) => (
                <ellipse key={i} cx={fx} cy={12} rx="2.5" ry="4.5" fill={skin} />
              ))}
            </g>
          )}

          {handPose === 'spoon' && (
            // Hand holding long serving spoon transferring food to plate
            <g transform="rotate(18)">
              <ellipse cx="0" cy="8" rx="12" ry="10" fill="#e89e7c" />
              <line x1="-2" y1="-28" x2="6" y2="60" stroke="#8d5b4c" strokeWidth="10" strokeLinecap="round" />
              <ellipse cx="8" cy="68" rx="16" ry="10" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />
              {[2, 7, 12, 17].map((fy, i) => (
                <rect key={i} x="-8" y={fy - 3} width="16" height="5.5" rx="2.5" fill={skin} stroke="#e89e7c" strokeWidth="0.8" />
              ))}
            </g>
          )}

          {handPose === 'grip' && (
            // Resting Grip Holding Pot Handle
            <g>
              <ellipse cx="0" cy="8" rx="11" ry="9" fill={skin} />
              <path d={side > 0 ? "M6,4 Q12,7 8,14 Q4,12 3,6 Z" : "M-6,4 Q-12,7 -8,14 Q-4,12 -3,6 Z"} fill={skin} />
              {[-5, -1, 3, 7].map((fx, i) => (
                <ellipse key={i} cx={fx} cy={14} rx="2.8" ry="5" fill={skin} />
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
 * Supports split layering: part="body" (behind counter) and part="arms" (over counter).
 */
const Maya = ({ x, y, scale, action, p, time, speech, cookX, cookY, part = 'all' }) => {
  const verb = action.action || 'show';
  const breath = Math.sin(time * 2.2) * 2.8;

  const isStirring = ['stir', 'mix', 'cook', 'boil', 'simmer', 'fry', 'saute'].includes(verb);
  const isAdding = ['add', 'pour', 'sprinkle', 'layer', 'place'].includes(verb);
  const isPlating = ['serve', 'plate', 'transfer'].includes(verb);
  const stirSpeed = time * 4.6;

  // Organic Human Posture Dynamics
  const bodyLean = isStirring ? Math.sin(stirSpeed) * 2.2 : 0;
  const headBob = isStirring ? Math.sin(stirSpeed) * 2.4 : Math.sin(time * 2.2) * 2;
  const headTilt = isStirring ? 5 + Math.cos(stirSpeed) * 2.2 : (isAdding || isPlating ? 5 : (verb === 'show' ? Math.sin(time * 2.4) * 3 : 0));

  // Natural arm angles: left arm comfortably rests near the pot handle without crossing body!
  let leftAngle = -6, leftBend = 24, leftPose = 'grip';
  let rightAngle = -14, rightBend = -20, rightPose = 'rest';

  const isCoconut = action.key === 'coconut' || verb === 'coconut';
  const isHeat = action.key === 'heat' || verb === 'heat' || action.key === 'crackle';
  const isFlavour = action.key === 'flavour' || verb === 'flavour';
  const isAddChickpeas = action.key === 'add_chickpeas' || verb === 'add_chickpeas';
  const isPrep = action.key === 'prep' || verb === 'prep';
  const isSafe = action.key === 'safe' || verb === 'safe';

  if (action.key === 'welcome' || action.key === 'ending' || verb === 'ending') {
    // Cheerful welcoming / celebration wave at head height
    leftAngle = -72 + Math.sin(time * 5.2) * 14;
    leftBend = -34;
    leftPose = 'wave';
    rightAngle = -12;
    rightBend = -18;
    rightPose = 'rest';
  } else if (isSafe) {
    // Clean hands & safety badge presentation
    leftAngle = -48 + Math.sin(time * 4) * 8;
    leftBend = -26;
    leftPose = 'wave';
    rightAngle = -28;
    rightBend = -22;
    rightPose = 'rest';
  } else if (isPrep) {
    // Gesturing to labelled ingredient bowls on counter
    leftAngle = -32 + Math.sin(time * 3) * 6;
    leftBend = -18;
    leftPose = 'rest';
    rightAngle = mix(p, -12, -48);
    rightBend = mix(p, -18, -32);
    rightPose = 'rest';
  } else if (isHeat) {
    // Pouring oil and crackling mustard seeds
    leftAngle = -6;
    leftBend = 24;
    leftPose = 'grip';
    rightAngle = mix(p, -16, -8);
    rightBend = mix(p, -28, -16);
    rightPose = 'pour';
  } else if (isFlavour) {
    // Adding curry leaves, green chilli, and hing
    leftAngle = -6;
    leftBend = 24;
    leftPose = 'grip';
    rightAngle = mix(p, -18, -10);
    rightBend = mix(p, -26, -14);
    rightPose = 'pour';
  } else if (isAddChickpeas) {
    // Holding prep bowl and tilting cooked chickpeas into pan
    leftAngle = -6;
    leftBend = 24;
    leftPose = 'grip';
    rightAngle = mix(p, -14, -6);
    rightBend = mix(p, -26, -12);
    rightPose = 'bowl';
  } else if (isCoconut) {
    // Showering fresh white grated coconut flakes
    leftAngle = -6;
    leftBend = 22;
    leftPose = 'grip';
    rightAngle = -20 + Math.sin(time * 6) * 6;
    rightBend = -26;
    rightPose = 'coconut';
  } else if (isStirring) {
    // Left hand resting securely on pot handle
    leftAngle = -6 + bodyLean;
    leftBend = 26;
    leftPose = 'grip';
    // Right arm stirring pot smoothly with wooden spatula
    rightAngle = -18 + Math.cos(stirSpeed) * 8;
    rightBend = -22 + Math.sin(stirSpeed) * 7;
    rightPose = 'stir';
  } else if (isAdding) {
    leftAngle = -6;
    leftBend = 24;
    leftPose = 'grip';
    rightAngle = mix(p, -14, -8);
    rightBend = mix(p, -26, -14);
    rightPose = 'bowl';
  } else if (isPlating) {
    leftAngle = -4;
    leftBend = 20;
    leftPose = 'grip';
    rightAngle = mix(p, -20, -56);
    rightBend = mix(p, -22, -42);
    rightPose = 'spoon';
  }

  const blink = (time % 3.6) > 3.42 ? 0.1 : 1;
  const mouth = Math.max(0, Math.min(1, speech * 6));
  const lookDown = isStirring || isAdding || isPlating;
  const gazeX = lookDown ? 2.5 : 0;
  const gazeY = lookDown ? 3.5 : 0;

  const renderBody = part === 'all' || part === 'body';
  const renderArms = part === 'all' || part === 'arms';

  return (
    <g transform={`translate(${x} ${y + breath}) scale(${scale})`}>
      {/* 1. Behind Counter: Torso, Head, Hair, Apron */}
      {renderBody && (
        <g>
          {/* Chef Jacket Body extending down behind counter slab */}
          <g transform={`rotate(${bodyLean})`}>
            <path d="M-52,-42 Q0,-68 52,-42 L52,140 L-52,140 Z" fill="#ffffff" stroke="#e0ece5" strokeWidth="3" />
            {/* Emerald Chef Apron */}
            <path d="M-34,-38 Q0,-50 34,-38 L34,130 L-34,130 Z" fill="#059669" />
            {/* Front Pocket with fine stitching */}
            <path d="M-22,14 Q0,24 22,14 L22,50 Q0,58 -22,50 Z" fill="#047857" />
            <path d="M-20,16 Q0,26 20,16" fill="none" stroke="#6ee7b7" strokeWidth="1" strokeDasharray="3 3" />
            {/* Apron Straps & Dual Golden Chef Buttons */}
            <circle cx="-16" cy="-22" r="4" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
            <circle cx="16" cy="-22" r="4" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
            <circle cx="-16" cy="0" r="3.5" fill="#ffd166" stroke="#d97706" strokeWidth="1" />
            <circle cx="16" cy="0" r="3.5" fill="#ffd166" stroke="#d97706" strokeWidth="1" />
            {/* Elegant Red Chef Neckerchief */}
            <path d="M-22,-44 C-10,-32 -4,-22 0,-18 C4,-22 10,-32 22,-44" fill="#dc2626" />
            <path d="M-3,-18 L0,-10 L3,-18 Z" fill="#b91c1c" />
          </g>

          {/* Head with Natural Nodding, Hair & Expressive Pixar Face */}
          <g transform={`translate(0 ${headBob}) rotate(${headTilt})`}>
            {/* Flowing Back Hair Silhouette */}
            <path d="M-56,-110 C-68,-70 -62,-30 -44,-10 C-20,4 20,4 44,-10 C62,-30 68,-70 56,-110 Z" fill="#3e1f18" />
            {/* High Chef Ponytail / Bun behind hat */}
            <ellipse cx="0" cy="-166" rx="26" ry="22" fill="#4a2820" />
            <path d="M-12,-166 Q0,-154 12,-166" stroke="#dc2626" strokeWidth="5.5" fill="none" strokeLinecap="round" />

            {/* Cute Peach Ears with Golden Pearl Studs */}
            <ellipse cx="-54" cy="-96" rx="8" ry="13" fill="#fed7aa" stroke="#fba779" strokeWidth="1" />
            <ellipse cx="54" cy="-96" rx="8" ry="13" fill="#fed7aa" stroke="#fba779" strokeWidth="1" />
            <circle cx="-54" cy="-92" r="3" fill="#f59e0b" />
            <circle cx="54" cy="-92" r="3" fill="#f59e0b" />

            {/* Soft Peach Face Skin */}
            <ellipse cx="0" cy="-102" rx="55" ry="52" fill="#fed7aa" />
            <path d="M-44,-100 C-40,-62 -18,-54 0,-54 C18,-54 40,-62 44,-100 Z" fill="#fed7aa" />

            {/* Wavy Hair Locks Framing the Face */}
            <path d="M-52,-116 C-62,-80 -58,-48 -46,-28 C-42,-20 -50,-24 -56,-36 C-64,-54 -66,-90 -52,-116 Z" fill="#542319" />
            <path d="M52,-116 C62,-80 58,-48 46,-28 C42,-20 50,-24 56,-36 C64,-54 66,-90 52,-116 Z" fill="#542319" />

            {/* Front Bangs with Soft Wisps */}
            <path d="M-52,-124 C-32,-156 0,-146 16,-136 C28,-128 44,-136 52,-124 C40,-138 20,-142 4,-136 C-16,-130 -36,-136 -52,-124 Z" fill="#341610" />
            <path d="M-36,-138 Q-10,-144 14,-134" stroke="#8d493a" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.6" />

            {/* Expressive Arched Brows */}
            <path d="M-34,-122 Q-22,-130 -10,-122" fill="none" stroke="#451a03" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M10,-122 Q22,-130 34,-122" fill="none" stroke="#451a03" strokeWidth="3.5" strokeLinecap="round" />

            {/* Charming Cartoon Eyes with Double Anime Catchlights */}
            <g>
              {/* Sclera / Whites */}
              <ellipse cx="-22" cy="-106" rx="13" ry={14 * blink} fill="#f8fafc" />
              <ellipse cx="22" cy="-106" rx="13" ry={14 * blink} fill="#f8fafc" />

              {/* Radiant Emerald Irises */}
              <ellipse cx={-22 + gazeX} cy={-105 + gazeY} rx={8.5 * blink} ry={8.5 * blink} fill="#059669" />
              <ellipse cx={22 + gazeX} cy={-105 + gazeY} rx={8.5 * blink} ry={8.5 * blink} fill="#059669" />
              <circle cx={-22 + gazeX} cy={-104 + gazeY} r={5 * blink} fill="#10b981" />
              <circle cx={22 + gazeX} cy={-104 + gazeY} r={5 * blink} fill="#10b981" />

              {/* Pupils */}
              <circle cx={-22 + gazeX} cy={-105 + gazeY} r={4 * blink} fill="#0f172a" />
              <circle cx={22 + gazeX} cy={-105 + gazeY} r={4 * blink} fill="#0f172a" />

              {/* Catchlights */}
              <circle cx={-24 + gazeX} cy={-108 + gazeY} r={3 * blink} fill="#ffffff" />
              <circle cx={20 + gazeX} cy={-108 + gazeY} r={3 * blink} fill="#ffffff" />
              <circle cx={-19 + gazeX} cy={-102 + gazeY} r={1.5 * blink} fill="#ffffff" />
              <circle cx={25 + gazeX} cy={-102 + gazeY} r={1.5 * blink} fill="#ffffff" />

              {/* Lush Dark Upper Eyelashes */}
              <path d="M-36,-110 Q-23,-124 -9,-112" fill="none" stroke="#1e1b4b" strokeWidth="4" strokeLinecap="round" />
              <path d="M9,-112 Q23,-124 36,-110" fill="none" stroke="#1e1b4b" strokeWidth="4" strokeLinecap="round" />
            </g>

            {/* Cute Button Nose */}
            <path d="M-3,-92 Q0,-87 3,-92" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" opacity="0.65" />
            <ellipse cx="0" cy="-90" rx="2" ry="1.2" fill="#fbcfe8" opacity="0.5" />

            {/* Rosy Blush Cheeks with Sparkle Freckles */}
            <ellipse cx="-34" cy="-86" rx="14" ry="7" fill="#fb7185" opacity="0.45" />
            <ellipse cx="34" cy="-86" rx="14" ry="7" fill="#fb7185" opacity="0.45" />
            <circle cx="-32" cy="-86" r="1.2" fill="#ffffff" opacity="0.8" />
            <circle cx="36" cy="-86" r="1.2" fill="#ffffff" opacity="0.8" />

            {/* Joyful Animated Smiling Mouth */}
            {mouth < 0.12 ? (
              <g>
                <path d="M-12,-73 Q0,-65 12,-73" fill="none" stroke="#be123c" strokeWidth="3.5" strokeLinecap="round" />
                <path d="M-13,-74 Q-14,-71 -11,-72" fill="none" stroke="#be123c" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M13,-74 Q14,-71 11,-72" fill="none" stroke="#be123c" strokeWidth="2.5" strokeLinecap="round" />
              </g>
            ) : (
              <g>
                <path d={`M-13,-75 Q0,-75 13,-75 Q13,${-61 + mouth * 14} 0,${-61 + mouth * 14} Q-13,${-61 + mouth * 14} -13,-75 Z`} fill="#991b1b" />
                <path d="M-10,-75 Q0,-74 10,-75 L9,-70 Q0,-69 -9,-70 Z" fill="#ffffff" />
                <ellipse cx="0" cy={-65 + mouth * 8} rx="7" ry={4 + mouth * 3} fill="#fb7185" />
              </g>
            )}

            {/* Tall French Chef's Hat (Toque Blanche) with Gold Star Crest */}
            <g transform="translate(0 -162)">
              <path d="M-52,-6 C-64,-34 -48,-66 -22,-60 C-14,-86 14,-86 22,-60 C48,-66 64,-34 52,-6 Z" fill="#ffffff" stroke="#e2e8f0" strokeWidth="3.5" />
              {/* Soft hat fabric pleats */}
              <path d="M-18,-60 Q-16,-30 -14,-6" fill="none" stroke="#f1f5f9" strokeWidth="2" />
              <path d="M0,-64 Q0,-32 0,-6" fill="none" stroke="#f1f5f9" strokeWidth="2" />
              <path d="M18,-60 Q16,-30 14,-6" fill="none" stroke="#f1f5f9" strokeWidth="2" />
              {/* Hat base band with golden star crest */}
              <rect x="-48" y="-14" width="96" height="20" rx="9" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
              <circle cx="0" cy="-4" r="7.5" fill="#f59e0b" />
              <polygon points="0,-9 2.2,-5.5 6.5,-5.5 3,-2.8 4.2,1.5 0,-1.2 -4.2,1.5 -3,-2.8 -6.5,-5.5 -2.2,-5.5" fill="#ffffff" />
            </g>
          </g>
        </g>
      )}

      {/* 2. Reaching Over Counter: Human Arms & Utensils */}
      {renderArms && (
        <g>
          <HumanArm side={-1} angle={leftAngle} bend={leftBend} handPose={leftPose} time={time} />
          <HumanArm side={1} angle={rightAngle} bend={rightBend} handPose={rightPose} time={time} />
        </g>
      )}
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
 * 3D Cartoon Cooked Chickpea (Chana)
 * Distinct plump golden-tan legume with characteristic cleft, hilum notch, and oil gloss.
 */
const Chickpea = ({ x, y, r = 8.5, angle = 0, opacity = 1 }) => (
  <g transform={`translate(${x} ${y}) rotate(${angle})`} opacity={opacity}>
    <ellipse cx="1" cy={r * 0.8} rx={r * 0.9} ry={r * 0.45} fill="rgba(15, 23, 42, 0.28)" />
    {/* Base chickpea with hilum notch */}
    <path
      d={`M0,${-r} C${r * 0.95},${-r * 0.9} ${r},${r * 0.4} ${r * 0.5},${r * 0.9} C${r * 0.2},${r} 0,${r * 0.85} ${-r * 0.5},${r * 0.9} C${-r},${r * 0.4} ${-r * 0.95},${-r * 0.9} 0,${-r} Z`}
      fill="#d97706"
      stroke="#92400e"
      strokeWidth="1.2"
    />
    {/* Golden cooked tender body */}
    <path
      d={`M0,${-r * 0.85} C${r * 0.75},${-r * 0.75} ${r * 0.8},${r * 0.3} ${r * 0.35},${r * 0.7} C0,${r * 0.7} ${-r * 0.35},${r * 0.7} ${-r * 0.8},${r * 0.3} ${-r * 0.75},${-r * 0.75} 0,${-r * 0.85} Z`}
      fill="#f59e0b"
    />
    {/* Chickpea natural cleft / seam */}
    <path d={`M0,${-r * 0.6} Q${r * 0.2},0 0,${r * 0.5}`} fill="none" stroke="#b45309" strokeWidth="1.2" strokeLinecap="round" opacity="0.65" />
    {/* Glossy oil sheen / highlight */}
    <ellipse cx={-r * 0.28} cy={-r * 0.32} rx={r * 0.38} ry={r * 0.22} fill="#fef08a" opacity="0.85" />
    <circle cx={-r * 0.35} cy={-r * 0.38} r={r * 0.12} fill="#ffffff" />
  </g>
);

/**
 * Realistic Glossy Green Curry Leaf
 */
const CurryLeaf = ({ x, y, angle = 0, scale = 1 }) => (
  <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`}>
    <path d="M-12,0 C-8,-6 4,-8 14,0 C4,8 -8,6 -12,0 Z" fill="#15803d" stroke="#14532d" strokeWidth="1" />
    <path d="M-10,0 C-6,-4 2,-5 11,0 C2,5 -6,4 -10,0 Z" fill="#22c55e" />
    <line x1="-12" y1="0" x2="14" y2="0" stroke="#14532d" strokeWidth="1" />
  </g>
);

/**
 * Shredded Fresh White Coconut Flake
 */
const CoconutFlake = ({ x, y, angle = 0, scale = 1, opacity = 1 }) => (
  <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`} opacity={opacity}>
    <path d="M-5,-1.5 Q0,-3 5,-1 Q0,2 -5,-1.5 Z" fill="#ffffff" stroke="#e2e8f0" strokeWidth="0.5" />
    <path d="M-3,-0.5 Q0,-1.5 3,-0.5" stroke="#f1f5f9" strokeWidth="0.8" fill="none" />
  </g>
);

/**
 * Sliced Fresh Green Chilli Ring
 */
const GreenChilliRing = ({ x, y, scale = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <ellipse cx="0" cy="0" rx="6" ry="4.5" fill="#16a34a" stroke="#14532d" strokeWidth="1.2" />
    <ellipse cx="0" cy="0" rx="3.5" ry="2.5" fill="#22c55e" />
    <circle cx="0.5" cy="0" r="1.2" fill="#fef08a" />
  </g>
);

/**
 * Authentic 3D Cartoon Roasted Chicken Drumstick
 * Beautiful golden-brown glazed meat, ivory bone handle, char marks, and fresh herb flecks.
 */
const ChickenDrumstick = ({ x, y, angle = 0, scale = 1, sizzle = false }) => (
  <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`}>
    {/* Soft ambient drop shadow */}
    <ellipse cx="6" cy="18" rx="26" ry="11" fill="rgba(15, 23, 42, 0.28)" />

    {/* 1. Bone Joint & Handle */}
    <circle cx="28" cy="9" r="7.5" fill="#fefae0" stroke="#cbd5e1" strokeWidth="1.5" />
    <circle cx="34" cy="19" r="7.5" fill="#fefae0" stroke="#cbd5e1" strokeWidth="1.5" />
    <path d="M12,9 L30,13 L28,17 L10,13 Z" fill="#fefae0" stroke="#e2e8f0" strokeWidth="1" />

    {/* 2. Plump Roasted Chicken Drumstick Meat Bulb */}
    <path
      d="M12,4 C14,14 6,24 -4,22 C-18,20 -34,10 -34,-4 C-34,-18 -18,-24 -2,-20 C10,-16 12,-6 12,4 Z"
      fill="#b45309"
      stroke="#78350f"
      strokeWidth="2.5"
    />
    <path
      d="M8,2 C10,10 4,18 -4,16 C-14,14 -28,6 -28,-4 C-28,-14 -14,-18 -2,-15 C6,-12 8,-4 8,2 Z"
      fill="#d97706"
    />
    {/* Golden caramelized skin shine */}
    <ellipse cx="-12" cy="-4" rx="14" ry="9" fill="#f59e0b" />
    <ellipse cx="-14" cy="-5" rx="9" ry="4" fill="#fef08a" opacity="0.8" />

    {/* 3. Tandoori / Biryani Roasted Sear Marks & Spice Flecks */}
    <path d="M-22,-8 Q-16,-4 -12,-8" fill="none" stroke="#78350f" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M-16,4 Q-10,8 -6,3" fill="none" stroke="#78350f" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="-6" cy="-12" r="1.5" fill="#451a03" />
    <circle cx="-18" cy="2" r="1.8" fill="#451a03" />
    <circle cx="-2" cy="-2" r="1.5" fill="#451a03" />
    <circle cx="-24" cy="-2" r="1.5" fill="#451a03" />

    {/* Fresh Green Herb Flecks (Coriander / Mint) */}
    <rect x="-10" y="-1" width="3.5" height="2" rx="0.8" fill="#16a34a" transform="rotate(25 -10 -1)" />
    <rect x="-18" y="-6" width="3.5" height="2" rx="0.8" fill="#22c55e" transform="rotate(-35 -18 -6)" />
    <rect x="-4" y="6" width="3.5" height="2" rx="0.8" fill="#15803d" transform="rotate(12 -4 6)" />

    {/* Sizzle Steam / Heat Glisten */}
    {sizzle && (
      <ellipse cx="-12" cy="-4" rx="16" ry="10" fill="none" stroke="#fffbeb" strokeWidth="2" opacity="0.6" />
    )}
  </g>
);

/**
 * Succulent Roasted Spiced Chicken Tikka / Boti Chunk
 */
const ChickenTikka = ({ x, y, scale = 1, angle = 0 }) => (
  <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`}>
    <ellipse cx="2" cy="4" rx="13" ry="9" fill="rgba(15, 23, 42, 0.25)" />
    <path
      d="M-12,-8 Q-4,-14 8,-10 Q16,-4 14,8 Q4,16 -8,12 Q-16,6 -12,-8 Z"
      fill="#c2410c"
      stroke="#7c2d12"
      strokeWidth="2"
    />
    <path
      d="M-8,-5 Q-2,-10 6,-7 Q11,-2 9,6 Q2,12 -6,9 Q-11,4 -8,-5 Z"
      fill="#ea580c"
    />
    <ellipse cx="-1" cy="0" rx="6" ry="4" fill="#fb923c" />
    <line x1="-6" y1="-2" x2="4" y2="-4" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
    <circle cx="-2" cy="4" r="1.4" fill="#451a03" />
    <circle cx="3" cy="-1" r="1.2" fill="#16a34a" />
  </g>
);

/**
 * Crunchy Diced Orange Carrots and Sweet Green Peas
 */
const VegetableMix = ({ x, y, scale = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <rect x="-8" y="-6" width="7" height="6" rx="1.5" fill="#f97316" stroke="#c2410c" strokeWidth="0.8" transform="rotate(15)" />
    <rect x="4" y="-2" width="6" height="6" rx="1.5" fill="#ea580c" stroke="#9a3412" strokeWidth="0.8" transform="rotate(-20)" />
    <circle cx="-2" cy="5" r="4.2" fill="#22c55e" stroke="#15803d" strokeWidth="0.8" />
    <circle cx="-3" cy="4" r="1.2" fill="#86efac" />
    <circle cx="8" cy="6" r="3.6" fill="#16a34a" stroke="#14532d" strokeWidth="0.8" />
    <circle cx="7" cy="5" r="1" fill="#86efac" />
  </g>
);

/**
 * Crispy Purple/Golden Sliced Onion Rings
 */
const SlicedOnionRing = ({ x, y, scale = 1, angle = 0 }) => (
  <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`}>
    <ellipse cx="0" cy="0" rx="14" ry="7" fill="none" stroke="#be185d" strokeWidth="3.2" />
    <ellipse cx="0" cy="0" rx="11" ry="5.2" fill="none" stroke="#f472b6" strokeWidth="1.8" />
    <ellipse cx="0" cy="0" rx="8" ry="3.6" fill="none" stroke="#fdf2f8" strokeWidth="1.2" />
  </g>
);

/**
 * Juicy Fresh Tomato Wedge with Seeds
 */
const TomatoWedge = ({ x, y, scale = 1, angle = 0 }) => (
  <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`}>
    <path d="M-10,4 Q0,-12 10,4 Q0,10 -10,4 Z" fill="#dc2626" stroke="#991b1b" strokeWidth="1.5" />
    <path d="M-7,3 Q0,-8 7,3 Q0,7 -7,3 Z" fill="#ef4444" />
    <circle cx="-2" cy="1" r="1.2" fill="#fef08a" />
    <circle cx="3" cy="2" r="1.2" fill="#fef08a" />
    <path d="M0,-12 L-2,-15 M0,-12 L2,-15" stroke="#15803d" strokeWidth="1.5" strokeLinecap="round" />
  </g>
);

/**
 * Washing Bowl for Rinsing Rice & Produce
 */
const WashBowl = ({ x, y, p = 1 }) => (
  <g transform={`translate(${x} ${y})`}>
    <ellipse cx="0" cy="20" rx="52" ry="16" fill="rgba(2, 132, 199, 0.2)" />
    <path d="M-44,14 Q-40,46 0,46 Q40,46 44,14 Z" fill="#e0f2fe" stroke="#0284c7" strokeWidth="3" />
    <ellipse cx="0" cy="16" rx="40" ry="11" fill="#38bdf8" opacity="0.65" />
    <ellipse cx="0" cy="16" rx="28" ry="7" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity={0.6 + Math.sin(p * 8) * 0.3} />
    <circle cx="-14" cy="14" r="3" fill="#ffffff" opacity={0.8} />
    <circle cx="12" cy="18" r="2.5" fill="#ffffff" opacity={0.8} />
  </g>
);

/**
 * Chef Cutting Board for Chopping Action
 */
const CuttingBoard = ({ x, y }) => (
  <g transform={`translate(${x} ${y})`}>
    <rect x="-55" y="0" width="110" height="34" rx="6" fill="#b45309" stroke="#78350f" strokeWidth="3" />
    <rect x="-51" y="4" width="102" height="26" rx="4" fill="#d97706" />
    <path d="M-36,-10 L16,-7 L12,4 L-36,2 Z" fill="#cbd5e1" stroke="#64748b" strokeWidth="1.5" />
    <rect x="16" y="-5" width="22" height="7" rx="2" fill="#451a03" />
  </g>
);

/**
 * Heavy Pot Lid for Covering & Dum Cooking
 */
const PotLid = ({ x, y, rx = 100, ry = 28, liftY = 0 }) => (
  <g transform={`translate(${x} ${y - liftY})`}>
    <ellipse cx="0" cy="12" rx={rx} ry={ry} fill="#78350f" stroke="#451a03" strokeWidth="3" />
    <ellipse cx="0" cy="8" rx={rx - 6} ry={ry - 5} fill="#9a3412" stroke="#ca8a04" strokeWidth="2" />
    <rect x="-6" y="-6" width="12" height="14" rx="3" fill="#ca8a04" stroke="#78350f" strokeWidth="1.5" />
    <circle cx="0" cy="-6" r="7" fill="#eab308" stroke="#ca8a04" strokeWidth="2" />
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
  const isCooking = ['cook', 'boil', 'simmer', 'fry', 'saute', 'mix', 'stir', 'steam', 'marinate', 'wash', 'chop', 'layer', 'cover'].includes(verb);

  // Identify Recipe Archetype
  const rawDish = ((plan?.recipe || '') + ' ' + (plan?.title || '')).toLowerCase();
  const isBiryani = /biryani|biriyani|dum|rice|pulao|pulav/.test(rawDish);
  const isVegBiryani = isBiryani && /veg|vegetable/.test(rawDish);
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
            {/* Mound of fragrant saffron basmati biryani on royal platter */}
            <path d={`M${plateX - 58},${y + 22} Q${plateX},${y - 14} ${plateX + 58},${y + 22} Z`} fill="#f59e0b" />
            <path d={`M${plateX - 42},${y + 20} Q${plateX},${y - 8} ${plateX + 42},${y + 20} Z`} fill="#fffbeb" />

            {isVegBiryani ? (
              <g>
                <VegetableMix x={plateX - 10} y={y + 10} scale={1.3} />
                <VegetableMix x={plateX + 25} y={y + 14} scale={1.1} />
                <SlicedOnionRing x={plateX - 28} y={y + 12} scale={1.0} angle={-15} />
              </g>
            ) : (
              <g>
                <ChickenDrumstick x={plateX + 4} y={y + 8} angle={-14} scale={1.12} />
                <ChickenTikka x={plateX - 26} y={y + 14} scale={1.05} angle={12} />
              </g>
            )}

            {/* Red onion rings & lemon wedge garnish */}
            <ellipse cx={plateX - 38} cy={y + 20} rx="12" ry="6" fill="none" stroke="#be185d" strokeWidth="3" />
            <ellipse cx={plateX - 36} cy={y + 21} rx="9" ry="4" fill="none" stroke="#f472b6" strokeWidth="1.5" />
            <path d={`M${plateX + 38},${y + 16} L${plateX + 56},${y + 14} L${plateX + 48},${y + 26} Z`} fill="#fde047" stroke="#ca8a04" strokeWidth="1.5" />
            <path d={`M${plateX - 10},${y + 4} Q${plateX},${y - 4} ${plateX + 8},${y + 4}`} fill="#16a34a" />
          </g>
        ) : isSundal ? (
          // Fresh Green Banana Leaf Platter with Heaping Dry Chana Sundal
          <g>
            {/* Banana Leaf Base */}
            <path
              d={`M${plateX - 95},${y + 26} C${plateX - 55},${y + 6} ${plateX + 55},${y + 6} ${plateX + 95},${y + 26} C${plateX + 55},${y + 46} ${plateX - 55},${y + 46} Z`}
              fill="#15803d"
              stroke="#14532d"
              strokeWidth="3"
            />
            <path
              d={`M${plateX - 90},${y + 26} C${plateX - 50},${y + 9} ${plateX + 50},${y + 9} ${plateX + 90},${y + 26} C${plateX + 50},${y + 43} ${plateX - 50},${y + 43} Z`}
              fill="#22c55e"
            />
            {/* Banana leaf mid-rib */}
            <line x1={plateX - 85} y1={y + 26} x2={plateX + 85} y2={y + 26} stroke="#16a34a" strokeWidth="2.5" />

            {/* Dry Chana Sundal: Heaping pile of individual cooked chickpeas */}
            {[
              [-45, 24], [-30, 20], [-15, 18], [0, 16], [15, 18], [30, 20], [45, 24],
              [-38, 28], [-22, 24], [-6, 22], [10, 22], [26, 25], [40, 28],
              [-28, 14], [-12, 12], [4, 12], [20, 14],
              [-18, 8], [-2, 6], [14, 8]
            ].map(([cx, cy], i) => (
              <Chickpea key={i} x={plateX + cx} y={y + cy} r={7.5} angle={(i * 37) % 360} />
            ))}

            {/* Crackled Black Mustard Seeds & Urad Dal on platter */}
            {[-32, -14, 2, 18, 34, -20, 12].map((mx, i) => (
              <circle key={i} cx={plateX + mx} cy={y + 16 + (i % 3) * 5} r="1.8" fill="#0f172a" />
            ))}

            {/* Fresh Curry Leaves & Green Chilli Rings on Platter */}
            <CurryLeaf x={plateX - 18} y={y + 14} angle={-25} scale={0.85} />
            <CurryLeaf x={plateX + 22} y={y + 16} angle={35} scale={0.8} />
            <GreenChilliRing x={plateX + 4} y={y + 20} scale={0.8} />

            {/* Snowy Blanket of Freshly Grated White Coconut */}
            {[
              [-36, 18], [-20, 14], [-6, 10], [8, 12], [24, 16], [38, 22],
              [-28, 24], [-12, 20], [2, 18], [18, 22], [-42, 26], [30, 26]
            ].map(([cx, cy], i) => (
              <CoconutFlake key={i} x={plateX + cx} y={y + cy} angle={(i * 45) % 180} scale={1.1} />
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
        {/* Stove Flame indicator: active during heat/flavour/mix/cook, turned OFF during 'coconut' & 'serve' */}
        {(() => {
          const stoveIsOff = ['welcome', 'safe', 'prep', 'coconut', 'serve', 'ending'].includes(action.key || action.action);
          const stoveFlameActive = !stoveIsOff && isCooking;
          return (
            <g>
              <ellipse cx="0" cy="4" rx={rimRx - 15} ry="16" fill="none" stroke="#ff5722" strokeWidth="5" opacity={stoveFlameActive ? 0.85 + pulse * 0.15 : 0.15} />
              <ellipse cx="0" cy="4" rx={rimRx - 38} ry="10" fill="none" stroke="#ffb703" strokeWidth="4" opacity={stoveFlameActive ? 0.9 : 0.2} />
              {stoveFlameActive && Array.from({ length: 9 }, (_, i) => {
                const angle = (i / 9) * Math.PI * 2;
                const fx = Math.cos(angle) * (rimRx - 26);
                const fy = Math.sin(angle) * 12 + 4;
                return <circle key={i} cx={fx} cy={fy} r={4 + pulse} fill="#00b4d8" opacity="0.85" />;
              })}
            </g>
          );
        })()}
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

          {/* Rich Fluffy Basmati Rice Bed (Golden Saffron & Pearl White) */}
          <ellipse cx={foodX} cy={foodY + 4} rx={rimRx - 20} ry={rimRy - 8} fill="#fef08a" stroke="#ca8a04" strokeWidth="1.5" />
          <ellipse cx={foodX} cy={foodY + 4} rx={rimRx - 26} ry={rimRy - 11} fill="#fffbeb" />

          {/* Individual Slender Basmati Rice Grains */}
          {[-50, -32, -15, 8, 28, 48, -40, -22, -2, 18, 38, -10, 12, 30].map((gx, i) => (
            <ellipse
              key={i}
              cx={foodX + gx}
              cy={foodY + 2 + (i % 3) * 4}
              rx="7.5"
              ry="2.4"
              fill={i % 2 === 0 ? "#f59e0b" : "#ffffff"}
              stroke="#fbbf24"
              strokeWidth="0.5"
              transform={`rotate(${(i * 38) % 90} ${foodX + gx} ${foodY + 2})`}
            />
          ))}

          {/* Crispy Caramelized Fried Onions (Birista) */}
          {[-42, -20, 6, 26, -30, 16, 40].map((ox, i) => (
            <path
              key={i}
              d={`M${foodX + ox},${foodY + 4 + (i % 3) * 3} Q${foodX + ox + 6},${foodY - 2} ${foodX + ox + 14},${foodY + 5}`}
              fill="none"
              stroke="#78350f"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          ))}

          {isVegBiryani ? (
            <g>
              <VegetableMix x={foodX - 24} y={foodY} scale={1.2} />
              <VegetableMix x={foodX + 22} y={foodY + 4} scale={1.15} />
              <VegetableMix x={foodX} y={foodY + 8} scale={1.1} />
              <SlicedOnionRing x={foodX - 14} y={foodY - 6} scale={1.0} angle={20} />
              <SlicedOnionRing x={foodX + 28} y={foodY + 2} scale={0.9} angle={-30} />
            </g>
          ) : (
            <g>
              <ChickenDrumstick x={foodX - 28} y={foodY} angle={-22} scale={1.05} sizzle={isCooking} />
              <ChickenDrumstick x={foodX + 32} y={foodY + 2} angle={158} scale={0.92} sizzle={isCooking} />
              <ChickenTikka x={foodX - 8} y={foodY - 8} scale={1.05} angle={15} />
              <ChickenTikka x={foodX + 6} y={foodY + 8} scale={1.12} angle={-15} />
              <ChickenTikka x={foodX - 44} y={foodY + 6} scale={0.95} angle={35} />
            </g>
          )}
          {/* Dum Steam Cooking Pot Lid */}
          {(verb === 'cover' || action.key === 'cover' || action.key === 'cover_dum') && (
            <PotLid x={x} y={y - 28} rx={rimRx + 4} ry={rimRy + 4} liftY={mix(1 - p, 45, 0)} />
          )}

          {/* Whole Aromatic Spices */}
          {/* Cinnamon Quill Stick */}
          <rect x={foodX - 16} y={foodY - 14} width="28" height="5" rx="2" fill="#78350f" stroke="#451a03" strokeWidth="1" transform="rotate(-18)" />
          {/* Star Anise Flower */}
          <g transform={`translate(${foodX + 2} ${foodY - 14}) scale(0.85)`}>
            {[0, 45, 90, 135].map(a => (
              <ellipse key={a} cx="0" cy="0" rx="2.5" ry="8" fill="#713f12" transform={`rotate(${a})`} />
            ))}
            <circle cx="0" cy="0" r="3" fill="#451a03" />
          </g>

          {/* Fresh Green Mint & Coriander Leaves */}
          <path d={`M${foodX - 14},${foodY - 4} Q${foodX - 6},${foodY - 14} ${foodX + 2},${foodY - 4} Q${foodX - 6},${foodY + 2} ${foodX - 14},${foodY - 4}`} fill="#16a34a" />
          <path d={`M${foodX + 16},${foodY + 6} Q${foodX + 24},${foodY - 2} ${foodX + 32},${foodY + 6} Q${foodX + 24},${foodY + 12} ${foodX + 16},${foodY + 6}`} fill="#22c55e" />
        </g>
      ) : isSundal ? (
        // Traditional South Indian Iron Kadhai with Heavy Base & Twin Brass Loop Handles
        <g>
          {/* Kadhai Brass Loop Handles */}
          <circle cx={x - rimRx - 14} cy={y} r="14" fill="none" stroke="#ca8a04" strokeWidth="6" />
          <circle cx={x - rimRx - 14} cy={y} r="14" fill="none" stroke="#fde047" strokeWidth="2" />
          <circle cx={x + rimRx + 14} cy={y} r="14" fill="none" stroke="#ca8a04" strokeWidth="6" />
          <circle cx={x + rimRx + 14} cy={y} r="14" fill="none" stroke="#fde047" strokeWidth="2" />
          {/* Rivet studs */}
          <circle cx={x - rimRx - 2} cy={y} r="3.5" fill="#ca8a04" stroke="#78350f" strokeWidth="1" />
          <circle cx={x + rimRx + 2} cy={y} r="3.5" fill="#ca8a04" stroke="#78350f" strokeWidth="1" />

          {/* Deep Cast Iron Kadhai Bowl */}
          <path d={`M${x - rimRx},${y - 10} Q${x - rimRx},${y + 48} ${x},${y + 48} Q${x + rimRx},${y + 48} ${x + rimRx},${y - 10} Z`} fill="#1e293b" stroke="#0f172a" strokeWidth="4" />
          <ellipse cx={x} cy={y - 10} rx={rimRx} ry={rimRy} fill="#334155" stroke="#1e293b" strokeWidth="3" />
          {/* Dry seasoned cast-iron interior (no orange soup!) */}
          <ellipse cx={x} cy={y - 13} rx={rimRx - 14} ry={rimRy - 8} fill="#0f172a" />
          {/* Subtle warm oil glisten droplets on pan surface */}
          <ellipse cx={x - 20} cy={y - 12} rx="24" ry="7" fill="#facc15" opacity="0.25" />
          <ellipse cx={x + 24} cy={y - 10} rx="18" ry="5" fill="#facc15" opacity="0.2" />

          {/* 1. SCENE 4: HEAT THE OIL & CRACKLE MUSTARD SEEDS & URAD DAL */}
          {['heat', 'crackle', 'flavour', 'add_chickpeas', 'mix', 'stir', 'cook', 'coconut', 'serve'].includes(action.key || action.action) && (
            <g>
              {/* Toasted Urad Dal Split Lentils (Ivory-white & golden toasted) */}
              {[[-30, -14], [-14, -8], [4, -12], [22, -9], [38, -13], [-8, -6], [16, -7]].map(([ux, uy], i) => (
                <ellipse key={i} cx={foodX + ux} cy={foodY + uy} rx="3.5" ry="1.8" fill={i % 2 === 0 ? "#fefae0" : "#fde047"} stroke="#b45309" strokeWidth="0.8" transform={`rotate(${(i * 35) % 90} ${foodX + ux} ${foodY + uy})`} />
              ))}
              {/* Crackling Black Mustard Seeds */}
              {[[-40, -12], [-24, -16], [-10, -10], [6, -14], [20, -10], [32, -15], [44, -11], [-18, -4], [0, -6], [14, -4], [28, -6]].map(([mx, my], i) => (
                <g key={i}>
                  <circle cx={foodX + mx} cy={foodY + my} r="2" fill="#0f172a" stroke="#1e293b" strokeWidth="0.5" />
                  {/* Popping crackle sparkles when heating */}
                  {action.key === 'heat' && (
                    <circle cx={foodX + mx} cy={foodY + my - 6} r={1.5} fill="#ffd166" opacity={pulse * 0.5 + 0.5} />
                  )}
                </g>
              ))}
            </g>
          )}

          {/* 2. SCENE 5: ADD FLAVOUR - FRESH GREEN CURRY LEAVES, GREEN CHILLI & HING */}
          {['flavour', 'add_chickpeas', 'mix', 'stir', 'cook', 'coconut', 'serve'].includes(action.key || action.action) && (
            <g>
              <CurryLeaf x={foodX - 35} y={foodY - 10} angle={-30} scale={1.05} />
              <CurryLeaf x={foodX - 10} y={foodY - 14} angle={15} scale={1.1} />
              <CurryLeaf x={foodX + 18} y={foodY - 11} angle={-20} scale={1.0} />
              <CurryLeaf x={foodX + 42} y={foodY - 13} angle={40} scale={0.95} />
              <CurryLeaf x={foodX - 6} y={foodY - 4} angle={-10} scale={1.05} />
              <CurryLeaf x={foodX + 26} y={foodY - 5} angle={25} scale={0.9} />
              {/* Green Chilli Rings */}
              <GreenChilliRing x={foodX - 22} y={foodY - 6} scale={0.95} />
              <GreenChilliRing x={foodX + 8} y={foodY - 8} scale={1.0} />
              <GreenChilliRing x={foodX + 34} y={foodY - 4} scale={0.9} />
              {/* Asafoetida (Hing) golden seasoning glow */}
              {action.key === 'flavour' && (
                <ellipse cx={foodX} cy={foodY - 8} rx="40" ry="14" fill="#fbbf24" opacity={0.3 * (1 - p)} />
              )}
            </g>
          )}

          {/* 3. SCENES 6 & 7: ADD COOKED CHICKPEAS & MIX EVERYTHING */}
          {['add_chickpeas', 'mix', 'stir', 'cook', 'coconut', 'serve'].includes(action.key || action.action) && (
            <g>
              {/* Cascade animation during add_chickpeas */}
              {action.key === 'add_chickpeas' && (
                <g>
                  {/* Falling Chickpeas from Bowl */}
                  {Array.from({ length: 8 }, (_, i) => {
                    const dropY = mix(p, foodY - 80 + i * 8, foodY + 4);
                    const dropX = foodX - 30 + i * 8 + Math.sin(i * 1.5) * 12;
                    return (
                      <Chickpea key={i} x={dropX} y={dropY} r={8.5} angle={(i * 45) % 360} opacity={p > 0.1 ? 1 : 0} />
                    );
                  })}
                  {/* Sea salt crystal sprinkles */}
                  {Array.from({ length: 9 }, (_, i) => (
                    <circle key={i} cx={foodX - 20 + i * 5} cy={mix(p, foodY - 60, foodY)} r="1.5" fill="#ffffff" />
                  ))}
                </g>
              )}

              {/* HEAPING MOUND OF INDIVIDUAL 3D COOKED CHICKPEAS (NO GRAVY!) */}
              {[
                // Bottom row
                [-48, 8], [-34, 10], [-20, 11], [-6, 12], [8, 12], [22, 11], [36, 10], [50, 8],
                // Middle row
                [-42, 2], [-28, 4], [-14, 5], [0, 6], [14, 5], [28, 4], [42, 2],
                // Upper row
                [-36, -4], [-22, -2], [-8, 0], [6, 0], [20, -2], [34, -4],
                // Top layer crest
                [-28, -10], [-14, -8], [0, -7], [14, -8], [28, -10],
                // Tossed accents
                [-18, -14], [2, -13], [18, -14], [-8, -18], [8, -18]
              ].map(([cx, cy], i) => {
                // When mixing, chickpeas gently tumble and roll
                const tossX = (action.key === 'mix' || verb === 'mix') ? Math.sin(time * 4.6 + i) * 3 : 0;
                const tossY = (action.key === 'mix' || verb === 'mix') ? Math.cos(time * 4.6 + i) * 2 : 0;
                return (
                  <Chickpea
                    key={i}
                    x={foodX + cx + tossX}
                    y={foodY + cy + tossY}
                    r={8.5}
                    angle={((i * 41) + (action.key === 'mix' ? time * 20 : 0)) % 360}
                  />
                );
              })}

              {/* Chickpea layer seasonings: Mustard seeds, curry leaves and chilli rings settled among chickpeas */}
              {[[-24, 2], [10, 4], [-6, -6], [22, -4], [-32, 6], [28, 6]].map(([mx, my], i) => (
                <circle key={i} cx={foodX + mx} cy={foodY + my} r="2.2" fill="#0f172a" stroke="#1e293b" strokeWidth="0.5" />
              ))}
              <CurryLeaf x={foodX - 16} y={foodY + 2} angle={20} scale={0.9} />
              <CurryLeaf x={foodX + 14} y={foodY - 2} angle={-35} scale={0.85} />
              <GreenChilliRing x={foodX - 4} y={foodY + 4} scale={0.85} />
            </g>
          )}

          {/* 4. SCENE 8: ADD COCONUT - FRESHLY GRATED WHITE COCONUT SNOW SHOWER */}
          {['coconut', 'serve'].includes(action.key || action.action) && (
            <g>
              {/* Fluttering Coconut Snow Shower during coconut scene */}
              {action.key === 'coconut' && Array.from({ length: 16 }, (_, i) => {
                const flakeY = mix(p, foodY - 80 + (i % 4) * 15, foodY - 10 + (i % 3) * 6);
                const flakeX = foodX - 40 + i * 5 + Math.sin(time * 5 + i) * 8;
                return (
                  <CoconutFlake key={i} x={flakeX} y={flakeY} angle={(i * 35) % 180} scale={1.2} opacity={p > 0.1 ? 0.9 : 0} />
                );
              })}

              {/* Fluffy White Coconut Snow Settled Elegantly Across the Golden Chickpeas */}
              {[
                [-42, 6], [-28, 2], [-14, 3], [0, 4], [14, 3], [28, 2], [42, 6],
                [-35, -2], [-20, -4], [-5, -3], [10, -3], [25, -4], [38, -2],
                [-28, -8], [-12, -7], [4, -6], [20, -7], [-18, -12], [0, -11], [16, -12],
                [-8, -16], [8, -16]
              ].map(([cx, cy], i) => (
                <CoconutFlake key={i} x={foodX + cx} y={foodY + cy} angle={(i * 37) % 180} scale={1.15} />
              ))}
            </g>
          )}
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
      {/* (0) Washing Action with Water Bowl */}
      {verb === 'wash' && (
        <WashBowl x={x} y={y - 25} p={p} />
      )}

      {/* (00) Chopping Action with Chef Knife & Board */}
      {['chop', 'slice'].includes(verb) && (
        <CuttingBoard x={x} y={y - 15} />
      )}
      {/* (a) Smooth Elliptical Orbital Stirring with Spatula */}
      {isCooking && (
        <g transform={`translate(${stirOrbitX} ${stirOrbitY})`}>
          {/* Sizzle circular sauce trail inside cookware */}
          <ellipse cx={x} cy={y - 20} rx="38" ry="13" fill="none" stroke="#fff3b0" strokeWidth="4.5" opacity={0.75 + pulse * 0.15} />
        </g>
      )}

      {/* (b) Pouring Stream into Cookware */}
      {verb === 'pour' && (
        <g>
          <path d={`M${x - 22},${y - 95} Q${x - 8},${y - 55} ${x},${y - 24}`} fill="none" stroke="#ffb703" strokeWidth={p > 0.15 && p < 0.92 ? 12 : 0} strokeLinecap="round" />
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

  // Realistic Proportional Layout Anchors
  const counter = portrait ? height * 0.68 : height * 0.70;
  const cookX = portrait ? width * 0.50 : width * 0.52;
  const plateX = portrait ? width * 0.82 : width * 0.84;
  const bowlX = portrait ? width * 0.16 : width * 0.18;
  // Position Maya right at the cookware station: her hands directly grip handles and stir the pot
  const mayaX = portrait ? cookX - 90 : cookX - 110;
  const mayaY = counter - (portrait ? 88 : 95);
  const mayaScale = portrait ? 1.25 : 1.35;

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

      {/* 1. Colorful Kitchen Back Wall & Ceramic Subway Tiles */}
      <rect width={width} height={height} fill="url(#wallBg)" />
      <g opacity="0.3" stroke="#86efac" strokeWidth="2">
        {Array.from({ length: 11 }, (_, i) => (
          <line key={i} x1="0" y1={height * 0.05 + i * 48} x2={width} y2={height * 0.05 + i * 48} />
        ))}
      </g>

      {/* 2. Sunny Garden Window with Smiling Sun & Flower Planter */}
      <g transform={`translate(${width * 0.50} ${height * 0.13})`}>
        <rect x="-95" y="-65" width="190" height="130" rx="16" fill="#7dd3fc" stroke="#0284c7" strokeWidth="5.5" />
        {/* Smiling Sun */}
        <circle cx="48" cy="-24" r="26" fill="#fde047" stroke="#f59e0b" strokeWidth="2" />
        <circle cx="42" cy="-26" r="2" fill="#78350f" />
        <circle cx="54" cy="-26" r="2" fill="#78350f" />
        <path d="M44,-18 Q48,-14 52,-18" stroke="#78350f" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        {/* Fluffy Cloud */}
        <ellipse cx="-40" cy="-22" rx="26" ry="14" fill="#ffffff" opacity="0.9" />
        <ellipse cx="-26" cy="-30" rx="18" ry="12" fill="#ffffff" opacity="0.9" />
        {/* Green garden tree outside */}
        <ellipse cx="-35" cy="22" rx="38" ry="28" fill="#86efac" />
        <ellipse cx="-45" cy="12" rx="24" ry="22" fill="#4ade80" />
        {/* Window Bars */}
        <line x1="0" y1="-65" x2="0" y2="65" stroke="#0284c7" strokeWidth="4.5" />
        <line x1="-95" y1="0" x2="95" y2="0" stroke="#0284c7" strokeWidth="4.5" />
        {/* Planter Box with Red Flowers */}
        <rect x="-92" y="48" width="184" height="22" rx="4" fill="#b45309" stroke="#78350f" strokeWidth="2" />
        {[-68, -34, 0, 34, 68].map((fx, i) => (
          <circle key={i} cx={fx} cy={44} r={6} fill="#ef4444" stroke="#b91c1c" strokeWidth="1" />
        ))}
      </g>

      {/* 3. Floating Kitchen Oak Shelves with Colorful Spice Jars & Utensil Hooks */}
      <g transform={`translate(${width * 0.16} ${height * 0.16})`}>
        <rect x="-90" y="26" width="180" height="12" rx="3" fill="#a16207" stroke="#78350f" strokeWidth="1.5" />
        <rect x="-85" y="38" width="12" height="18" fill="#78350f" />
        <rect x="73" y="38" width="12" height="18" fill="#78350f" />
        {/* Spice Jar 1: Turmeric */}
        <g transform="translate(-65 6)">
          <rect x="-14" y="0" width="28" height="26" rx="4" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.5" />
          <rect x="-10" y="-5" width="20" height="6" rx="2" fill="#b45309" />
          <rect x="-10" y="8" width="20" height="10" rx="2" fill="#ffffff" opacity="0.85" />
          <line x1="-7" y1="13" x2="7" y2="13" stroke="#ca8a04" strokeWidth="2" />
        </g>
        {/* Spice Jar 2: Salt */}
        <g transform="translate(-20 8)">
          <rect x="-13" y="0" width="26" height="24" rx="4" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
          <rect x="-9" y="-5" width="18" height="6" rx="2" fill="#d97706" />
          <circle cx="0" cy="12" r="4" fill="#38bdf8" />
        </g>
        {/* Spice Jar 3: Mustard & Cumin */}
        <g transform="translate(25 4)">
          <rect x="-14" y="0" width="28" height="28" rx="4" fill="#334155" stroke="#1e293b" strokeWidth="1.5" />
          <rect x="-10" y="-5" width="20" height="6" rx="2" fill="#b45309" />
          <rect x="-10" y="9" width="20" height="10" rx="2" fill="#ffffff" opacity="0.85" />
        </g>
        {/* Spice Jar 4: Asafoetida (Hing) */}
        <g transform="translate(68 8)">
          <rect x="-11" y="0" width="22" height="24" rx="4" fill="#fed7aa" stroke="#ea580c" strokeWidth="1.5" />
          <rect x="-8" y="-5" width="16" height="6" rx="2" fill="#7c2d12" />
        </g>
        {/* Hanging Utensils */}
        <line x1="-80" y1="56" x2="80" y2="56" stroke="#94a3b8" strokeWidth="3" />
        <g transform="translate(-40 68)">
          <line x1="0" y1="-12" x2="0" y2="16" stroke="#64748b" strokeWidth="2.5" />
          <ellipse cx="0" cy="22" rx="6" ry="10" fill="none" stroke="#64748b" strokeWidth="2" />
        </g>
        <g transform="translate(10 68)">
          <line x1="0" y1="-12" x2="0" y2="20" stroke="#8d5b4c" strokeWidth="3" />
          <ellipse cx="0" cy="24" rx="8" ry="6" fill="#8d5b4c" />
        </g>
      </g>

      {/* 3. Human Chef Maya - Body, Apron, and Head (Standing Naturally Behind Counter) */}
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
        part="body"
      />

      {/* 4. Kitchen Countertop Surface (Cleanly occludes Maya's waist/legs like an authentic island counter) */}
      <g>
        <rect x="0" y={counter} width={width} height={height - counter} fill="#64748b" />
        <rect x="0" y={counter} width={width} height="40" fill="url(#counterSurface)" />
        <rect x="0" y={counter + 40} width={width} height="12" fill="url(#counterLip)" />
      </g>

      {/* 5. SCENE 3: FOUR LABELLED INGREDIENT BOWLS DISPLAYED ACROSS COUNTER */}
      {state.action.key === 'prep' ? (
        <g>
          {/* Bowl 1: Cooked Chickpeas */}
          <g transform={`translate(${width * 0.16} ${counter + 8})`}>
            <path d="M-55,4 Q-55,36 0,36 Q55,36 55,4 Z" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="3.5" />
            <ellipse cx="0" cy="4" rx="55" ry="15" fill="#60a5fa" />
            {/* Heaping Chickpeas in bowl */}
            {[-32, -18, -4, 10, 24, -22, -8, 8, 20, -12, 4].map((cx, i) => (
              <Chickpea key={i} x={cx} y={-4 + (i % 3) * 3} r={7} angle={(i * 35) % 360} />
            ))}
            {/* Cute wooden label */}
            <rect x="-50" y="38" width="100" height="22" rx="6" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.5" />
            <text x="0" y="53" textAnchor="middle" fill="#78350f" fontSize="12" fontWeight="900" fontFamily="sans-serif">CHICKPEAS</text>
          </g>

          {/* Bowl 2: Grated Coconut */}
          <g transform={`translate(${width * 0.36} ${counter + 8})`}>
            <path d="M-50,4 Q-50,34 0,34 Q50,34 50,4 Z" fill="#10b981" stroke="#059669" strokeWidth="3.5" />
            <ellipse cx="0" cy="4" rx="50" ry="14" fill="#34d399" />
            <ellipse cx="0" cy="-2" rx="44" ry="11" fill="#ffffff" />
            {[-30, -15, 0, 15, 30, -20, 10].map((cx, i) => (
              <CoconutFlake key={i} x={cx} y={-4 + (i % 2) * 3} scale={1.2} />
            ))}
            <rect x="-48" y="38" width="96" height="22" rx="6" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.5" />
            <text x="0" y="53" textAnchor="middle" fill="#78350f" fontSize="12" fontWeight="900" fontFamily="sans-serif">COCONUT</text>
          </g>

          {/* Bowl 3: Mustard & Urad Dal */}
          <g transform={`translate(${width * 0.64} ${counter + 8})`}>
            <path d="M-45,4 Q-45,32 0,32 Q45,32 45,4 Z" fill="#f59e0b" stroke="#d97706" strokeWidth="3.5" />
            <ellipse cx="0" cy="4" rx="45" ry="13" fill="#fbbf24" />
            <ellipse cx="0" cy="-2" rx="38" ry="10" fill="#1e293b" />
            {[-20, -5, 10, -10, 5].map((cx, i) => (
              <circle key={i} cx={cx} cy={-2} r="2" fill="#0f172a" />
            ))}
            {[-15, 0, 15].map((ux, i) => (
              <ellipse key={i} cx={ux} cy={-3} rx="3" ry="1.5" fill="#fefae0" />
            ))}
            <rect x="-46" y="38" width="92" height="22" rx="6" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.5" />
            <text x="0" y="53" textAnchor="middle" fill="#78350f" fontSize="12" fontWeight="900" fontFamily="sans-serif">MUSTARD & DAL</text>
          </g>

          {/* Bowl 4: Curry Leaves & Hing */}
          <g transform={`translate(${width * 0.84} ${counter + 8})`}>
            <path d="M-45,4 Q-45,32 0,32 Q45,32 45,4 Z" fill="#8b5cf6" stroke="#7c3aed" strokeWidth="3.5" />
            <ellipse cx="0" cy="4" rx="45" ry="13" fill="#a78bfa" />
            <ellipse cx="0" cy="-2" rx="38" ry="10" fill="#fed7aa" />
            <CurryLeaf x={-12} y={-4} angle={-25} scale={0.9} />
            <CurryLeaf x={12} y={-4} angle={25} scale={0.9} />
            <rect x="-46" y="38" width="92" height="22" rx="6" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.5" />
            <text x="0" y="53" textAnchor="middle" fill="#78350f" fontSize="12" fontWeight="900" fontFamily="sans-serif">CURRY LEAVES</text>
          </g>
        </g>
      ) : (
        /* Regular Single Prep Bowl on Counter */
        <g transform={`translate(${bowlX} ${counter + 8})`}>
          <path d="M-60,4 Q-60,38 0,38 Q60,38 60,4 Z" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="4" />
          <ellipse cx="0" cy="4" rx="60" ry="16" fill="#60a5fa" stroke="#1d4ed8" strokeWidth="3" />
          <ellipse cx="0" cy="-2" rx="52" ry="13" fill="#ea580c" />
          {/* Fresh Chickpeas resting in prep bowl */}
          {[-25, -10, 5, 20, -18, 0, 16].map((cx, i) => (
            <Chickpea key={i} x={cx} y={-4 + (i % 2) * 3} r={7.5} angle={(i * 35) % 360} />
          ))}
        </g>
      )}

      {/* 6. SCENE 2: KITCHEN SAFETY BADGE OVERLAY */}
      {state.action.key === 'safe' && (
        <g transform={`translate(${width * 0.72} ${height * 0.38})`}>
          {/* Glowing Green Safety Shield */}
          <path d="M0,-80 L65,-45 C65,25 35,75 0,95 C-35,75 -65,25 -65,-45 Z" fill="#10b981" stroke="#059669" strokeWidth="6" filter="url(#softShadow)" />
          <path d="M0,-72 L55,-40 C55,20 30,65 0,82 C-30,65 -55,20 -55,-40 Z" fill="#34d399" />
          {/* Soapy Bubbly Hands & Water icon */}
          <circle cx="-16" cy="-14" r="14" fill="#ffffff" />
          <circle cx="-10" cy="-24" r="7" fill="#67e8f9" />
          <circle cx="-24" cy="-22" r="5" fill="#67e8f9" />
          {/* Stove & Grown-up Warning Icon */}
          <path d="M12,4 L28,4 L20,-16 Z" fill="#ef4444" stroke="#b91c1c" strokeWidth="2" />
          <text x="0" y="38" textAnchor="middle" fill="#064e3b" fontSize="13" fontWeight="900" fontFamily="sans-serif">SAFETY FIRST!</text>
          <text x="0" y="55" textAnchor="middle" fill="#065f46" fontSize="11" fontWeight="800" fontFamily="sans-serif">WASH HANDS</text>
        </g>
      )}

      {/* 6. Authentic Cooking Action & Distinct Cookware (Stove, Pot, Food, Plate) */}
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

      {/* 7. Chef Maya's Articulated Arms & Utensils (Reaching Over Counter to Grip Handles & Stir Cookware) */}
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
        part="arms"
      />
    </svg>
  );
};

/**
 * Smart Subtitle Synchronization & Natural Phrasing
 * - Splits long sentences into clean, timed phrases proportional to speaking duration
 * - Enforces maximum 2 lines per subtitle view
 * - Synchronizes with active speech timing across the step duration
 */
function getActiveSubtitle(captions, time) {
  if (!captions || !Array.isArray(captions) || captions.length === 0) return '';
  const current = captions.find(item => time >= item.start && time < item.end);
  if (!current || !current.text) return '';

  const fullText = String(current.text).trim();
  if (!fullText) return '';

  // Short sentences (<= 48 characters) fit comfortably in 1 line
  if (fullText.length <= 48) {
    return fullText;
  }

  const duration = Math.max(0.4, current.end - current.start);
  const elapsed = time - current.start;

  // Split on punctuation (, . ! ? ;) if both halves are substantive
  const punctMatch = fullText.match(/^(.{14,}[,;!?.])\s+(.{14,})$/);
  let part1 = '';
  let part2 = '';

  if (punctMatch) {
    part1 = punctMatch[1].trim();
    part2 = punctMatch[2].trim();
  } else {
    // Split near the midpoint at a natural word boundary
    const mid = Math.floor(fullText.length / 2);
    let splitIdx = fullText.lastIndexOf(' ', mid);
    if (splitIdx === -1 || splitIdx < 14) {
      splitIdx = fullText.indexOf(' ', mid);
    }
    if (splitIdx > 12 && splitIdx < fullText.length - 12) {
      part1 = fullText.slice(0, splitIdx).trim();
      part2 = fullText.slice(splitIdx + 1).trim();
    } else {
      return fullText;
    }
  }

  // Weight duration by character length of each chunk
  const ratio = Math.max(0.32, Math.min(0.68, part1.length / (part1.length + part2.length)));
  const splitTimestamp = duration * ratio;

  return elapsed < splitTimestamp ? part1 : part2;
}

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
  const subtitle = getActiveSubtitle(lesson.captions, time);

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

      {/* 3. Professional Bottom Safe Area Subtitles */}
      {subtitle && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: height > width ? 38 : 22,
            transform: 'translateX(-50%)',
            maxWidth: height > width ? '84%' : '72%',
            width: 'max-content',
            padding: '7px 18px',
            borderRadius: 10,
            background: 'rgba(12, 18, 28, 0.78)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
            color: '#ffffff',
            fontSize: height > width
              ? Math.max(16, Math.min(22, Math.round(width * 0.026)))
              : Math.max(16, Math.min(20, Math.round(width * 0.0155))),
            fontWeight: 600,
            textAlign: 'center',
            lineHeight: 1.35,
            letterSpacing: '0.2px',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.8), 0 2px 4px rgba(0, 0, 0, 0.5)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            pointerEvents: 'none',
            zIndex: 10
          }}
        >
          {subtitle}
        </div>
      )}

      {/* 4. Bottom Video Progress Line */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 6, background: 'rgba(0, 0, 0, 0.25)' }}>
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
