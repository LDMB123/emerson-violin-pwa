import { rm } from 'node:fs/promises';

const legacyPaths = [
  'src/app',
  'src/core',
  'src/features',
  'src/data',
  'src/boot.js',
  'src/app-ml.js',
  'src/app.js',
  'src-next',
  'src/styles/gaming.css',
  'tests/unit',
  'scripts/copy-src-next.sh',
  'public/assets/mockups/screen_games_menu_1769391385366.png',
  'public/packs',
  'public/boot.js',
  'boot.js',
  'scripts/build/build-wasm.js',
  'scripts/build/copy-wasm.js',
  'scripts/build/check-model-sizes.js',
  'scripts/build/build-songs-html.js',
  'scripts/build/generate-pwa-manifest.js',
  'wasm-src',
];

const prune = async () => {
  const results = await Promise.allSettled(
    legacyPaths.map(async (target) => {
      await rm(target, { force: true, recursive: true });
    })
  );

  const removed = results.filter((result) => result.status === 'fulfilled').length;
  console.log(`[prune-legacy] cleaned ${removed} targets`);
};

prune().catch((error) => {
  console.error('[prune-legacy] failed', error);
  process.exitCode = 1;
});
