#!/usr/bin/env node

/**
 * Generate PWA icon matching the navigation design
 * Creates a Target icon in a rounded square with primary purple background
 * 
 * Usage: node scripts/generate-nav-icon.mjs
 */

import sharp from 'sharp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// Primary color from globals.css: oklch(0.45 0.15 280) - purple
// Convert OKLCH to RGB for sharp
// oklch(0.45 0.15 280) ≈ rgb(107, 70, 140) - purple
const PRIMARY_COLOR = { r: 107, g: 70, b: 140 };

// Target icon SVG path (from lucide-react)
const TARGET_ICON_SVG = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <!-- Rounded square background -->
  <rect width="512" height="512" rx="96" fill="rgb(107, 70, 140)"/>
  
  <!-- Target icon (centered, white) -->
  <g transform="translate(256, 256)">
    <!-- Outer circle -->
    <circle cx="0" cy="0" r="180" fill="none" stroke="white" stroke-width="24" opacity="0.3"/>
    <circle cx="0" cy="0" r="140" fill="none" stroke="white" stroke-width="20" opacity="0.5"/>
    <circle cx="0" cy="0" r="100" fill="none" stroke="white" stroke-width="16" opacity="0.7"/>
    <!-- Center dot -->
    <circle cx="0" cy="0" r="20" fill="white"/>
  </g>
</svg>
`;

async function generateNavIcon() {
  console.log('🎨 Generating navigation-matching PWA icon...');
  
  const outputPath = join(projectRoot, 'public', 'apple-icon.png');
  
  // Convert SVG to PNG
  const svgBuffer = Buffer.from(TARGET_ICON_SVG);
  
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(outputPath);
  
  console.log('  ✓ apple-icon.png generated');
  console.log('\n💡 Now run: pnpm generate-pwa-assets');
  console.log('   This will generate all PWA icons from the new apple-icon.png');
}

generateNavIcon().catch(console.error);











