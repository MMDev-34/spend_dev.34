import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const sourceImgPath = 'src/assets/images/spend_app_icon_1792336413753.jpg';

async function generateAll() {
  console.log('Reading source image:', sourceImgPath);
  const sourceBuffer = fs.readFileSync(sourceImgPath);

  // 1. High-res master logo in public
  await sharp(sourceBuffer)
    .resize(1024, 1024, { fit: 'cover' })
    .png({ quality: 100, compressionLevel: 8 })
    .toFile('public/logo.png');
  console.log('Created public/logo.png (1024x1024)');

  // 2. icon-512.png
  await sharp(sourceBuffer)
    .resize(512, 512, { fit: 'cover' })
    .png({ quality: 100, compressionLevel: 8 })
    .toFile('public/icons/icon-512.png');
  console.log('Created public/icons/icon-512.png (512x512)');

  // 3. icon-192.png
  await sharp(sourceBuffer)
    .resize(192, 192, { fit: 'cover' })
    .png({ quality: 100, compressionLevel: 8 })
    .toFile('public/icons/icon-192.png');
  console.log('Created public/icons/icon-192.png (192x192)');

  // 4. maskable-512.png (Scale slightly to fit 80% safe zone and blend with blurred background)
  const blurredBg = await sharp(sourceBuffer)
    .resize(512, 512)
    .blur(15)
    .modulate({ brightness: 0.9 })
    .toBuffer();

  const fgResized = await sharp(sourceBuffer)
    .resize(440, 440, { fit: 'contain' })
    .toBuffer();

  await sharp(blurredBg)
    .composite([{ input: fgResized, gravity: 'center' }])
    .png({ quality: 100, compressionLevel: 8 })
    .toFile('public/icons/icon-maskable-512.png');
  console.log('Created public/icons/icon-maskable-512.png (512x512 with safe-zone)');

  // 5. apple-touch-icon.png (180x180)
  await sharp(sourceBuffer)
    .resize(180, 180, { fit: 'cover' })
    .png({ quality: 100, compressionLevel: 8 })
    .toFile('public/apple-touch-icon.png');
  console.log('Created public/apple-touch-icon.png (180x180)');

  // 6. favicon.png (64x64 and 32x32)
  await sharp(sourceBuffer)
    .resize(64, 64, { fit: 'cover' })
    .png({ quality: 100 })
    .toFile('public/favicon.png');
  console.log('Created public/favicon.png (64x64)');

  // 7. Embed in favicon.svg as high-res base64 data URI so SVG favicon also renders the exact image
  const base64Png = (await sharp(sourceBuffer).resize(256, 256).png().toBuffer()).toString('base64');
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <image href="data:image/png;base64,${base64Png}" x="0" y="0" width="256" height="256" preserveAspectRatio="xMidYMid slice" />
</svg>`;
  fs.writeFileSync('public/favicon.svg', svgContent);
  console.log('Updated public/favicon.svg with embedded raster data');

  console.log('All app icons generated successfully from the exact logo image!');
}

generateAll().catch(console.error);
