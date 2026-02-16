import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Skip optimization in development mode
if (process.env.NODE_ENV !== 'production') {
  console.log('⏭️  Skipping audio optimization in development mode');
  process.exit(0);
}

const AUDIO_DIR = path.join(projectRoot, 'public/assets/audio');
const ARCHIVE_DIR = path.join(projectRoot, '_archived/original-assets/audio');

// Audio quality settings
const OPUS_BITRATE = '96k';  // Good quality for speech/music
const MP3_BITRATE = '128k';  // Standard quality fallback

async function optimizeAudio() {
  console.log('🎵 Starting audio optimization...\n');

  try {
    // Ensure archive directory exists
    await fs.mkdir(ARCHIVE_DIR, { recursive: true });

    // Get all WAV files
    const files = await fs.readdir(AUDIO_DIR);
    const wavFiles = files.filter(f => f.endsWith('.wav'));

    if (wavFiles.length === 0) {
      console.log('✅ No WAV files found to optimize');
      return;
    }

    console.log(`Found ${wavFiles.length} WAV files to convert\n`);

    let totalOriginalSize = 0;
    let totalOpusSize = 0;
    let totalMP3Size = 0;

    // Process each WAV file
    for (const file of wavFiles) {
      const wavPath = path.join(AUDIO_DIR, file);
      const baseName = file.replace('.wav', '');
      const opusFile = `${baseName}.opus`;
      const mp3File = `${baseName}.mp3`;
      const opusPath = path.join(AUDIO_DIR, opusFile);
      const mp3Path = path.join(AUDIO_DIR, mp3File);
      const archivePath = path.join(ARCHIVE_DIR, file);

      // Get original file size
      const originalStats = await fs.stat(wavPath);
      const originalSize = originalStats.size;

      console.log(`Converting ${file}...`);

      // Convert to Opus
      await new Promise((resolve, reject) => {
        ffmpeg(wavPath)
          .audioCodec('libopus')
          .audioBitrate(OPUS_BITRATE)
          .format('opus')
          .on('end', resolve)
          .on('error', reject)
          .save(opusPath);
      });

      // Convert to MP3
      await new Promise((resolve, reject) => {
        ffmpeg(wavPath)
          .audioCodec('libmp3lame')
          .audioBitrate(MP3_BITRATE)
          .format('mp3')
          .on('end', resolve)
          .on('error', reject)
          .save(mp3Path);
      });

      // Get output file sizes
      const opusStats = await fs.stat(opusPath);
      const mp3Stats = await fs.stat(mp3Path);
      const opusSize = opusStats.size;
      const mp3Size = mp3Stats.size;

      // Calculate reductions
      const opusReduction = ((originalSize - opusSize) / originalSize * 100).toFixed(1);
      const mp3Reduction = ((originalSize - mp3Size) / originalSize * 100).toFixed(1);

      // Archive original
      await fs.copyFile(wavPath, archivePath);
      await fs.unlink(wavPath);

      // Update totals
      totalOriginalSize += originalSize;
      totalOpusSize += opusSize;
      totalMP3Size += mp3Size;

      // Log progress
      console.log(`✓ ${file}`);
      console.log(`  Original: ${formatBytes(originalSize)}`);
      console.log(`  Opus: ${formatBytes(opusSize)} (${opusReduction}% reduction)`);
      console.log(`  MP3: ${formatBytes(mp3Size)} (${mp3Reduction}% reduction)`);
      console.log(`  Archived to: ${path.relative(projectRoot, archivePath)}\n`);
    }

    // Summary
    const totalOpusReduction = ((totalOriginalSize - totalOpusSize) / totalOriginalSize * 100).toFixed(1);
    const totalMP3Reduction = ((totalOriginalSize - totalMP3Size) / totalOriginalSize * 100).toFixed(1);
    console.log('─'.repeat(50));
    console.log('📊 Summary:');
    console.log(`   Files processed: ${wavFiles.length}`);
    console.log(`   Original size: ${formatBytes(totalOriginalSize)}`);
    console.log(`   Opus total: ${formatBytes(totalOpusSize)} (${totalOpusReduction}% reduction)`);
    console.log(`   MP3 total: ${formatBytes(totalMP3Size)} (${totalMP3Reduction}% reduction)`);
    console.log('─'.repeat(50));
    console.log('✅ Audio optimization complete!\n');

  } catch (error) {
    console.error('❌ Audio optimization failed:', error);
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

optimizeAudio();
