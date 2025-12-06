#!/usr/bin/env node

/**
 * PWA Asset Generator for GoalRitual
 * 
 * This script generates all required PWA icons and splash screens
 * from a source image (public/apple-icon.png).
 * 
 * Usage: node scripts/generate-pwa-assets.mjs
 * 
 * Requirements: sharp (npm install sharp --save-dev)
 */

import sharp from 'sharp';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// Icon sizes for PWA
const iconSizes = [32, 72, 96, 128, 144, 152, 180, 192, 384, 512];

// Apple splash screen sizes (portrait only for simplicity)
const splashScreens = [
  { name: 'apple-splash-2048-2732', width: 2048, height: 2732 },   // 12.9" iPad Pro
  { name: 'apple-splash-1668-2388', width: 1668, height: 2388 },   // 11" iPad Pro
  { name: 'apple-splash-1536-2048', width: 1536, height: 2048 },   // 9.7" iPad
  { name: 'apple-splash-1290-2796', width: 1290, height: 2796 },   // iPhone 14 Pro Max
  { name: 'apple-splash-1179-2556', width: 1179, height: 2556 },   // iPhone 14 Pro
  { name: 'apple-splash-1170-2532', width: 1170, height: 2532 },   // iPhone 12/13
  { name: 'apple-splash-1125-2436', width: 1125, height: 2436 },   // iPhone X/XS/11 Pro
  { name: 'apple-splash-1242-2688', width: 1242, height: 2688 },   // iPhone XS Max/11 Pro Max
  { name: 'apple-splash-828-1792', width: 828, height: 1792 },     // iPhone XR/11
  { name: 'apple-splash-1242-2208', width: 1242, height: 2208 },   // iPhone 6+/7+/8+
  { name: 'apple-splash-750-1334', width: 750, height: 1334 },     // iPhone 6/7/8
  { name: 'apple-splash-640-1136', width: 640, height: 1136 },     // iPhone 5
];

async function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

async function generateIcons() {
  const sourceIcon = join(projectRoot, 'public', 'apple-icon.png');
  const iconsDir = join(projectRoot, 'public', 'icons');
  
  await ensureDir(iconsDir);
  
  console.log('📱 Generating PWA icons...');
  
  for (const size of iconSizes) {
    const filename = size === 180 ? `apple-icon-${size}x${size}.png` : `icon-${size}x${size}.png`;
    const outputPath = join(iconsDir, filename);
    
    await sharp(sourceIcon)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 1 }
      })
      .png()
      .toFile(outputPath);
    
    console.log(`  ✓ ${filename}`);
  }
  
  // Generate maskable icon with padding (icon takes up 80% of canvas)
  const maskableSize = 512;
  const iconSize = Math.floor(maskableSize * 0.8);
  const padding = Math.floor((maskableSize - iconSize) / 2);
  
  await sharp(sourceIcon)
    .resize(iconSize, iconSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 0, g: 0, b: 0, alpha: 1 }
    })
    .png()
    .toFile(join(iconsDir, 'maskable-icon-512x512.png'));
  
  console.log('  ✓ maskable-icon-512x512.png');
}

async function generateSplashScreens() {
  const sourceIcon = join(projectRoot, 'public', 'apple-icon.png');
  const splashDir = join(projectRoot, 'public', 'splash');
  
  await ensureDir(splashDir);
  
  console.log('\n🖼️  Generating splash screens...');
  
  for (const screen of splashScreens) {
    const { name, width, height } = screen;
    const outputPath = join(splashDir, `${name}.png`);
    
    // Icon should be about 25% of the smallest dimension
    const iconSize = Math.floor(Math.min(width, height) * 0.25);
    
    // Create base splash with solid color
    const base = sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 }
      }
    });
    
    // Resize the icon
    const resizedIcon = await sharp(sourceIcon)
      .resize(iconSize, iconSize, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toBuffer();
    
    // Calculate center position
    const left = Math.floor((width - iconSize) / 2);
    const top = Math.floor((height - iconSize) / 2);
    
    // Composite the icon on the base
    await base
      .composite([{
        input: resizedIcon,
        left,
        top
      }])
      .png()
      .toFile(outputPath);
    
    console.log(`  ✓ ${name}.png`);
  }
}

async function generateOGImage() {
  const sourceIcon = join(projectRoot, 'public', 'apple-icon.png');
  const outputPath = join(projectRoot, 'public', 'og-image.png');
  
  console.log('\n🎨 Generating OG image...');
  
  const width = 1200;
  const height = 630;
  const iconSize = 200;
  
  // Create base with gradient-like effect (solid black for now)
  const base = sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 }
    }
  });
  
  // Resize the icon
  const resizedIcon = await sharp(sourceIcon)
    .resize(iconSize, iconSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toBuffer();
  
  // Position icon slightly above center
  const left = Math.floor((width - iconSize) / 2);
  const top = Math.floor((height - iconSize) / 2) - 40;
  
  await base
    .composite([{
      input: resizedIcon,
      left,
      top
    }])
    .png()
    .toFile(outputPath);
  
  console.log('  ✓ og-image.png');
}

async function generateFavicon() {
  const sourceIcon = join(projectRoot, 'public', 'apple-icon.png');
  const outputPath = join(projectRoot, 'public', 'favicon.ico');
  
  console.log('\n⭐ Generating favicon...');
  
  // Generate a 32x32 PNG first, then we'd convert to ICO
  // Sharp doesn't support ICO natively, so we'll create a 32x32 PNG
  // Most browsers accept PNG favicons nowadays
  await sharp(sourceIcon)
    .resize(32, 32, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 1 }
    })
    .png()
    .toFile(join(projectRoot, 'public', 'favicon.png'));
  
  console.log('  ✓ favicon.png (use as favicon.ico or update link)');
}

async function main() {
  console.log('🚀 GoalRitual PWA Asset Generator\n');
  console.log('================================\n');
  
  try {
    await generateIcons();
    await generateSplashScreens();
    await generateOGImage();
    await generateFavicon();
    
    console.log('\n================================');
    console.log('✅ All PWA assets generated successfully!');
    console.log('\nNext steps:');
    console.log('1. Verify the generated images in public/icons and public/splash');
    console.log('2. Run "pnpm build" to generate the service worker');
    console.log('3. Deploy to Netlify');
  } catch (error) {
    console.error('❌ Error generating assets:', error);
    process.exit(1);
  }
}

main();

