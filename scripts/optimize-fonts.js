#!/usr/bin/env node
/**
 * Font Subsetting Script
 *
 * Subsets variable fonts to Basic Latin + music notation:
 * - U+0020-007E: Basic Latin (space through tilde)
 * - U+2669-266C: Music notation (♩♪♫♬)
 *
 * Uses pyftsubset (requires: pip install fonttools)
 * Archives originals to _archived/original-assets/fonts/
 *
 * Savings depend on the source fonts and retained Unicode ranges.
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, copyFileSync, statSync } from 'fs';
import { resolve, join, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FONTS_DIR = resolve(__dirname, '../src/assets/fonts');
const ARCHIVE_DIR = resolve(__dirname, '../_archived/original-assets/fonts');
const FONTS = ['fraunces-vf.woff2', 'nunito-vf.woff2'];

// Unicode ranges to keep
const UNICODE_RANGE = 'U+0020-007E,U+2669-266C';

function checkPyftsubset() {
    const paths = [
        'pyftsubset',
        process.env.HOME + '/.local/bin/pyftsubset',
        '/usr/local/bin/pyftsubset'
    ];

    for (const path of paths) {
        try {
            // pyftsubset doesn't support --version, but --help returns exit code 0
            execSync(`${path} --help`, { stdio: 'ignore' });
            return path;
        } catch {
            continue;
        }
    }
    return null;
}

function getFileSize(path) {
    const stats = statSync(path);
    return (stats.size / 1024).toFixed(1);
}

function archiveOriginal(fontPath) {
    if (!existsSync(ARCHIVE_DIR)) {
        mkdirSync(ARCHIVE_DIR, { recursive: true });
        console.log(`📁 Created archive directory: ${ARCHIVE_DIR}`);
    }

    const archivePath = join(ARCHIVE_DIR, basename(fontPath));

    // Only archive if not already archived
    if (!existsSync(archivePath)) {
        const originalSize = getFileSize(fontPath);
        copyFileSync(fontPath, archivePath);
        console.log(`📦 Archived: ${basename(fontPath)} (${originalSize} KB) → ${archivePath}`);
        return true;
    } else {
        console.log(`⏭️  Already archived: ${basename(fontPath)}`);
        return false;
    }
}

function subsetFont(fontPath, pyftsubsetPath) {
    const originalSize = getFileSize(fontPath);
    const tempPath = fontPath + '.subset';

    console.log(`\n🔧 Subsetting: ${basename(fontPath)}`);
    console.log(`   Original size: ${originalSize} KB`);

    try {
        // Subset using pyftsubset
        execSync(
            `"${pyftsubsetPath}" "${fontPath}" ` +
            `--unicodes="${UNICODE_RANGE}" ` +
            `--output-file="${tempPath}" ` +
            `--flavor=woff2 ` +
            `--layout-features="*" ` +
            `--desubroutinize`,
            { stdio: 'pipe' }
        );

        // Check if subset was created
        if (!existsSync(tempPath)) {
            throw new Error('Subset file was not created');
        }

        const subsetSize = getFileSize(tempPath);
        const savings = ((1 - parseFloat(subsetSize) / parseFloat(originalSize)) * 100).toFixed(1);

        // Replace original with subset
        copyFileSync(tempPath, fontPath);
        execSync(`rm "${tempPath}"`);

        console.log(`   ✅ Subset size: ${subsetSize} KB (${savings}% reduction)`);

    } catch (error) {
        console.error(`   ❌ Failed to subset ${basename(fontPath)}:`);
        console.error(`   ${error.message}`);

        // Clean up temp file if it exists
        if (existsSync(tempPath)) {
            execSync(`rm "${tempPath}"`);
        }

        throw error;
    }
}

function main() {
    console.log('🎯 Font Subsetting Optimization');
    console.log('================================\n');

    // Check for pyftsubset
    const pyftsubsetPath = checkPyftsubset();
    if (!pyftsubsetPath) {
        console.error('❌ pyftsubset not found!');
        console.error('   Install: pip install fonttools brotli');
        process.exit(1);
    }
    console.log(`✓ Using pyftsubset: ${pyftsubsetPath}\n`);

    // Check fonts directory
    if (!existsSync(FONTS_DIR)) {
        console.error(`❌ Fonts directory not found: ${FONTS_DIR}`);
        process.exit(1);
    }

    let totalOriginal = 0;
    let totalSubset = 0;
    let processedCount = 0;

    // Process each font
    for (const font of FONTS) {
        const fontPath = join(FONTS_DIR, font);

        if (!existsSync(fontPath)) {
            console.warn(`⚠️  Font not found: ${font}`);
            continue;
        }

        const originalSize = parseFloat(getFileSize(fontPath));
        totalOriginal += originalSize;

        // Archive original
        archiveOriginal(fontPath);

        // Subset font
        subsetFont(fontPath, pyftsubsetPath);

        const subsetSize = parseFloat(getFileSize(fontPath));
        totalSubset += subsetSize;
        processedCount++;
    }

    // Summary
    console.log('\n📊 Summary');
    console.log('===========');
    console.log(`Fonts processed: ${processedCount}`);
    console.log(`Total original: ${totalOriginal.toFixed(1)} KB`);
    console.log(`Total subset: ${totalSubset.toFixed(1)} KB`);
    console.log(`Total savings: ${(totalOriginal - totalSubset).toFixed(1)} KB (${((1 - totalSubset/totalOriginal) * 100).toFixed(1)}%)`);
    console.log(`\n✅ Font optimization complete!`);
}

// Skip in development mode
if (process.env.NODE_ENV !== 'production') {
    console.log('⏭️  Skipping font optimization in development mode');
    process.exit(0);
}

main();
