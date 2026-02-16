// scripts/extract-views.js
import * as cheerio from 'cheerio';

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
