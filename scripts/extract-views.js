// scripts/extract-views.js
import * as cheerio from 'cheerio';

export function identifyViews(html) {
  const $ = cheerio.load(html);
  const views = [];

  $('.view[id^="view-"]').each((i, el) => {
    const $el = $(el);
    views.push({
      id: $el.attr('id'),
      tag: el.tagName.toLowerCase(),
      html: $.html($el)
    });
  });

  return views;
}
