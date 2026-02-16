// scripts/extract-views.js
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

export function identifyViews(html) {
  const $ = cheerio.load(html);
  const views = [];

  $('.view[id^="view-"]').each((i, el) => {
    const $el = $(el);
    const id = $el.attr('id');

    let category = 'core';
    if (id.startsWith('view-song-')) category = 'song';
    else if (id.startsWith('view-game-')) category = 'game';

    views.push({
      id,
      tag: el.tagName.toLowerCase(),
      category,
      html: $.html($el)
    });
  });

  return views;
}

export function getViewFilePath(viewId, category) {
  const name = viewId.replace(/^view-(song-|game-)?/, '');

  if (category === 'song') return `views/songs/${name}.html`;
  if (category === 'game') return `views/games/${name}.html`;
  return `views/${name}.html`;
}

export async function extractViews(inputHtml, outputDir = 'views') {
  const views = identifyViews(inputHtml);

  // Create directories
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(path.join(outputDir, 'songs'), { recursive: true });
  fs.mkdirSync(path.join(outputDir, 'games'), { recursive: true });

  // Write view files
  for (const view of views) {
    const filePath = path.join(outputDir, getViewFilePath(view.id, view.category).replace('views/', ''));
    fs.writeFileSync(filePath, view.html, 'utf-8');
  }

  return views.length;
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const indexHtml = fs.readFileSync('index.html', 'utf-8');
  const count = await extractViews(indexHtml);
  console.log(`✓ Extracted ${count} views to views/ directory`);
}
