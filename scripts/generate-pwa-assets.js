#!/usr/bin/env node
/**
 * PWA Asset Generator for GoalRitual
 * 
 * This script generates all required PWA icons and splash screens.
 * 
 * Prerequisites:
 *   pnpm add -D sharp
 * 
 * Usage:
 *   node scripts/generate-pwa-assets.js
 * 
 * Input: public/apple-icon.png (your source icon, should be at least 512x512)
 * Output: public/icons/ and public/splash/ directories
 */

const fs = require('fs');
const path = require('path');

async function generateAssets() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch (e) {
    console.error('❌ Sharp is not installed. Run: pnpm add -D sharp');
    console.log('\nAlternatively, generate icons manually using:');
    console.log('- https://realfavicongenerator.net/');
    console.log('- https://www.pwabuilder.com/imageGenerator');
    process.exit(1);
  }

  const sourceIcon = path.join(__dirname, '../public/apple-icon.png');
  const iconsDir = path.join(__dirname, '../public/icons');
  const splashDir = path.join(__dirname, '../public/splash');

  // Create directories
  if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });
  if (!fs.existsSync(splashDir)) fs.mkdirSync(splashDir, { recursive: true });

  // Icon sizes needed for PWA
  const iconSizes = [32, 72, 96, 128, 144, 152, 180, 192, 384, 512];
  
  // Splash screen configurations (iOS)
  const splashScreens = [
    { width: 2048, height: 2732, name: 'apple-splash-2048-2732.png' },
    { width: 1668, height: 2388, name: 'apple-splash-1668-2388.png' },
    { width: 1536, height: 2048, name: 'apple-splash-1536-2048.png' },
    { width: 1290, height: 2796, name: 'apple-splash-1290-2796.png' },
    { width: 1179, height: 2556, name: 'apple-splash-1179-2556.png' },
    { width: 1170, height: 2532, name: 'apple-splash-1170-2532.png' },
    { width: 1125, height: 2436, name: 'apple-splash-1125-2436.png' },
    { width: 1242, height: 2688, name: 'apple-splash-1242-2688.png' },
    { width: 828, height: 1792, name: 'apple-splash-828-1792.png' },
    { width: 750, height: 1334, name: 'apple-splash-750-1334.png' },
    { width: 640, height: 1136, name: 'apple-splash-640-1136.png' },
  ];

  console.log('🎨 Generating PWA assets for GoalRitual...\n');

  // Check if source exists
  if (!fs.existsSync(sourceIcon)) {
    console.error(`❌ Source icon not found: ${sourceIcon}`);
    process.exit(1);
  }

  // Generate icons
  console.log('📱 Generating app icons...');
  for (const size of iconSizes) {
    const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
    await sharp(sourceIcon)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } })
      .png()
      .toFile(outputPath);
    console.log(`   ✓ icon-${size}x${size}.png`);
  }

  // Generate Apple icon specifically
  const appleIconPath = path.join(iconsDir, 'apple-icon-180x180.png');
  await sharp(sourceIcon)
    .resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } })
    .png()
    .toFile(appleIconPath);
  console.log('   ✓ apple-icon-180x180.png');

  // Generate maskable icon (with padding)
  const maskableIconPath = path.join(iconsDir, 'maskable-icon-512x512.png');
  const iconBuffer = await sharp(sourceIcon)
    .resize(400, 400, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 }
    }
  })
    .composite([{ input: iconBuffer, gravity: 'center' }])
    .png()
    .toFile(maskableIconPath);
  console.log('   ✓ maskable-icon-512x512.png');

  // Generate splash screens
  console.log('\n🖼️  Generating splash screens...');
  for (const splash of splashScreens) {
    const outputPath = path.join(splashDir, splash.name);
    
    // Calculate icon size (about 20% of the smallest dimension)
    const iconSize = Math.floor(Math.min(splash.width, splash.height) * 0.2);
    
    const resizedIcon = await sharp(sourceIcon)
      .resize(iconSize, iconSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();
    
    await sharp({
      create: {
        width: splash.width,
        height: splash.height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 }
      }
    })
      .composite([{ input: resizedIcon, gravity: 'center' }])
      .png()
      .toFile(outputPath);
    
    console.log(`   ✓ ${splash.name}`);
  }

  // Generate OG image
  console.log('\n🌐 Generating Open Graph image...');
  const ogImagePath = path.join(__dirname, '../public/og-image.png');
  const ogIconSize = 200;
  
  const ogIcon = await sharp(sourceIcon)
    .resize(ogIconSize, ogIconSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  
  await sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 4,
      background: { r: 10, g: 10, b: 30, alpha: 1 }
    }
  })
    .composite([{ input: ogIcon, gravity: 'center' }])
    .png()
    .toFile(ogImagePath);
  console.log('   ✓ og-image.png');

  console.log('\n✅ All PWA assets generated successfully!');
  console.log('\nGenerated files:');
  console.log(`   - ${iconSizes.length + 2} icons in /public/icons/`);
  console.log(`   - ${splashScreens.length} splash screens in /public/splash/`);
  console.log('   - 1 OG image in /public/og-image.png');
}

generateAssets().catch(console.error);

