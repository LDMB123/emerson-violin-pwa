import { describe, it, expect } from 'vitest';
import { getRouteMeta, getViewPath } from '../../src/views/view-paths.js';

describe('view-paths', () => {
  it('maps core view IDs to paths', () => {
    expect(getViewPath('view-home')).toBe('views/home.html');
    expect(getViewPath('view-settings')).toBe('views/settings.html');
    expect(getViewPath('view-parent')).toBe('views/parent.html');
  });

  it('maps song and game IDs to nested paths', () => {
    expect(getViewPath('view-song-twinkle')).toBe('views/songs/twinkle.html');
    expect(getViewPath('view-game-pitch-quest')).toBe('views/games/pitch-quest.html');
  });

  it('returns child metadata for core practice routes', () => {
    expect(getRouteMeta('view-home')).toEqual({ persona: 'child', primaryTask: true, navGroup: 'practice' });
    expect(getRouteMeta('view-coach')).toEqual({ persona: 'child', primaryTask: true, navGroup: 'practice' });
  });

  it('returns parent metadata for parent route', () => {
    expect(getRouteMeta('view-parent')).toEqual({ persona: 'parent', primaryTask: false, navGroup: 'parent' });
  });

  it('maps dynamic song/game routes to matching nav groups', () => {
    expect(getRouteMeta('view-song-open_strings')).toEqual({ persona: 'child', primaryTask: false, navGroup: 'songs' });
    expect(getRouteMeta('view-game-rhythm-dash')).toEqual({ persona: 'child', primaryTask: false, navGroup: 'games' });
  });
});
