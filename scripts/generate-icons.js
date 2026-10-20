import fs from 'fs';
import sharp from 'sharp';

// 512x512 SVG for Spend App Icon
// Features:
// - Deep obsidian/black squircle background with subtle glow & high-end border
// - Vibrant Emerald "S" monogram with precision curves and subtle gradient
const appIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#18181B" />
      <stop offset="50%" stop-color="#0E0E10" />
      <stop offset="100%" stop-color="#070708" />
    </linearGradient>

    <!-- Emerald Glow in Center -->
    <radialGradient id="centerGlow" cx="50%" cy="45%" r="55%">
      <stop offset="0%" stop-color="#10B981" stop-opacity="0.22" />
      <stop offset="50%" stop-color="#059669" stop-opacity="0.06" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>

    <!-- Emerald "S" Monogram Gradient -->
    <linearGradient id="emeraldGrad" x1="20%" y1="0%" x2="80%" y2="100%">
      <stop offset="0%" stop-color="#6EE7B7" />
      <stop offset="35%" stop-color="#34D399" />
      <stop offset="70%" stop-color="#10B981" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>

    <!-- Border Glow Gradient -->
    <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34D399" stop-opacity="0.5" />
      <stop offset="40%" stop-color="#27272A" stop-opacity="0.8" />
      <stop offset="100%" stop-color="#18181B" stop-opacity="0.9" />
    </linearGradient>

    <!-- Subtle Drop Shadow for the "S" -->
    <filter id="emeraldShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="14" flood-color="#059669" flood-opacity="0.38" />
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000000" flood-opacity="0.6" />
    </filter>
  </defs>

  <!-- Outer Squircle Badge -->
  <rect x="24" y="24" width="464" height="464" rx="116" fill="url(#bgGrad)" stroke="url(#borderGrad)" stroke-width="6" />

  <!-- Inner Ambient Glow Layer -->
  <rect x="27" y="27" width="458" height="458" rx="113" fill="url(#centerGlow)" />

  <!-- Subtle Top Highlight Rim -->
  <path d="M 140 27 Q 256 36 372 27" stroke="#6EE7B7" stroke-width="2" stroke-linecap="round" stroke-opacity="0.3" fill="none" />

  <!-- Bold Geometric "S" Monogram -->
  <g filter="url(#emeraldShadow)">
    <path d="
      M 345 186
      C 345 142, 310 118, 256 118
      C 196 118, 160 148, 160 196
      C 160 270, 345 238, 345 322
      C 345 368, 308 394, 256 394
      C 190 394, 150 358, 150 310
      L 204 310
      C 204 335, 226 352, 256 352
      C 285 352, 299 337, 299 319
      C 299 253, 114 278, 114 196
      C 114 125, 175 76, 256 76
      C 334 76, 391 120, 391 186
      Z
    " fill="url(#emeraldGrad)" />

    <!-- Center Accent Dot / Spark for Financial Clarity -->
    <circle cx="340" cy="148" r="9" fill="#A7F3D0" />
    <circle cx="152" cy="358" r="9" fill="#34D399" />
  </g>
</svg>`;

// Maskable version: fill the whole square canvas with safe zone margins
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="maskableBg" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#141416" />
      <stop offset="60%" stop-color="#0A0A0C" />
      <stop offset="100%" stop-color="#050506" />
    </radialGradient>
    <radialGradient id="mCenterGlow" cx="50%" cy="50%" r="45%">
      <stop offset="0%" stop-color="#10B981" stop-opacity="0.25" />
      <stop offset="60%" stop-color="#059669" stop-opacity="0.05" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="mEmeraldGrad" x1="20%" y1="0%" x2="80%" y2="100%">
      <stop offset="0%" stop-color="#6EE7B7" />
      <stop offset="35%" stop-color="#34D399" />
      <stop offset="70%" stop-color="#10B981" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
    <filter id="mEmeraldShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="12" flood-color="#059669" flood-opacity="0.4" />
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000000" flood-opacity="0.7" />
    </filter>
  </defs>

  <!-- Full background for Android maskable safe-zone -->
  <rect width="512" height="512" fill="url(#maskableBg)" />
  <rect width="512" height="512" fill="url(#mCenterGlow)" />

  <!-- Inner Squircle Outline within Safe Zone -->
  <rect x="64" y="64" width="384" height="384" rx="96" fill="#111113" stroke="#262626" stroke-width="4" />

  <!-- Scaled "S" within Safe Zone (80% circle is r=204.8 from center 256,256) -->
  <g transform="translate(41, 41) scale(0.84)" filter="url(#mEmeraldShadow)">
    <path d="
      M 345 186
      C 345 142, 310 118, 256 118
      C 196 118, 160 148, 160 196
      C 160 270, 345 238, 345 322
      C 345 368, 308 394, 256 394
      C 190 394, 150 358, 150 310
      L 204 310
      C 204 335, 226 352, 256 352
      C 285 352, 299 337, 299 319
      C 299 253, 114 278, 114 196
      C 114 125, 175 76, 256 76
      C 334 76, 391 120, 391 186
      Z
    " fill="url(#mEmeraldGrad)" />

    <circle cx="340" cy="148" r="9" fill="#A7F3D0" />
    <circle cx="152" cy="358" r="9" fill="#34D399" />
  </g>
</svg>`;

async function run() {
  console.log('Writing public/favicon.svg...');
  fs.writeFileSync('public/favicon.svg', appIconSvg);

  console.log('Generating PNGs with sharp...');
  // 512x512 standard icon
  await sharp(Buffer.from(appIconSvg))
    .resize(512, 512)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile('public/icons/icon-512.png');

  // 192x192 standard icon
  await sharp(Buffer.from(appIconSvg))
    .resize(192, 192)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile('public/icons/icon-192.png');

  // 512x512 maskable icon
  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile('public/icons/icon-maskable-512.png');

  // Also apple-touch-icon 180x180
  await sharp(Buffer.from(appIconSvg))
    .resize(180, 180)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile('public/apple-touch-icon.png');

  console.log('All icons generated successfully!');
}

run().catch(console.error);
