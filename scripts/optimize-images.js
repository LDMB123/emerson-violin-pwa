import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Skip optimization in development mode
if (process.env.NODE_ENV !== 'production') {
  console.log('⏭️  Skipping image optimization in development mode');
  process.exit(0);
}

const ASSETS_DIR = path.join(projectRoot, 'public/assets');
const ARCHIVE_DIR = path.join(projectRoot, '_archived/original-assets/images');
const WEBP_QUALITY = 85; // Balance between quality and size

async function optimizeImages() {
  console.log('🖼️  Starting image optimization...\n');

  try {
    // Ensure archive directory exists
    await fs.mkdir(ARCHIVE_DIR, { recursive: true });

    // Get all PNG files
    const files = await fs.readdir(ASSETS_DIR);
    const pngFiles = files.filter(f => f.endsWith('.png'));

    if (pngFiles.length === 0) {
      console.log('✅ No PNG files found to optimize');
      return;
    }

    console.log(`Found ${pngFiles.length} PNG files to convert\n`);

    let totalOriginalSize = 0;
    let totalWebPSize = 0;

    // Process each PNG file
    for (const file of pngFiles) {
      const pngPath = path.join(ASSETS_DIR, file);
      const webpFile = file.replace('.png', '.webp');
      const webpPath = path.join(ASSETS_DIR, webpFile);
      const archivePath = path.join(ARCHIVE_DIR, file);

      // Get original file size
      const originalStats = await fs.stat(pngPath);
      const originalSize = originalStats.size;

      // Convert to WebP
      await sharp(pngPath)
        .webp({ quality: WEBP_QUALITY })
        .toFile(webpPath);

      // Get WebP file size
      const webpStats = await fs.stat(webpPath);
      const webpSize = webpStats.size;

      // Calculate reduction
      const reduction = ((originalSize - webpSize) / originalSize * 100).toFixed(1);

      // Archive original
      await fs.copyFile(pngPath, archivePath);
      await fs.unlink(pngPath);

      // Update totals
      totalOriginalSize += originalSize;
      totalWebPSize += webpSize;

      // Log progress
      console.log(`✓ ${file}`);
      console.log(`  ${formatBytes(originalSize)} → ${formatBytes(webpSize)} (${reduction}% reduction)`);
      console.log(`  Archived to: ${path.relative(projectRoot, archivePath)}\n`);
    }

    // Summary
    const totalReduction = ((totalOriginalSize - totalWebPSize) / totalOriginalSize * 100).toFixed(1);
    console.log('─'.repeat(50));
    console.log('📊 Summary:');
    console.log(`   Files processed: ${pngFiles.length}`);
    console.log(`   Original size: ${formatBytes(totalOriginalSize)}`);
    console.log(`   WebP size: ${formatBytes(totalWebPSize)}`);
    console.log(`   Total reduction: ${totalReduction}%`);
    console.log('─'.repeat(50));
    console.log('✅ Image optimization complete!\n');

  } catch (error) {
    console.error('❌ Image optimization failed:', error);
    process.exit(1);
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

optimizeImages();
