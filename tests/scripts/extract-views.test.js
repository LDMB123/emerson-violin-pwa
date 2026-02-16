// tests/scripts/extract-views.test.js
import { describe, it, expect } from 'vitest';
import { identifyViews } from '../../scripts/extract-views.js';

describe('View Extraction', () => {
  it('should identify all view sections in HTML', () => {
    const html = `
      <section class="view" id="view-home">Home</section>
      <section class="view" id="view-tune">Tune</section>
    `;
    const views = identifyViews(html);
    expect(views).toHaveLength(2);
    expect(views[0]).toMatchObject({ id: 'view-home', tag: 'section' });
  });

  it('should categorize views by type', () => {
    const html = `
      <section class="view" id="view-home">Home</section>
      <section class="view" id="view-song-twinkle">Song</section>
      <section class="view" id="view-game-pitch">Game</section>
    `;
    const views = identifyViews(html);
    expect(views[0].category).toBe('core');
    expect(views[1].category).toBe('song');
    expect(views[2].category).toBe('game');
  });
});
