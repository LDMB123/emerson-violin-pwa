// tests/views/view-paths.test.js
import { describe, it, expect } from 'vitest';
import { getViewPath } from '../../src/views/view-paths.js';

describe('View Path Mapping', () => {
  it('should map core view IDs to paths', () => {
    expect(getViewPath('view-home')).toBe('views/home.html');
    expect(getViewPath('view-tune')).toBe('views/tune.html');
    expect(getViewPath('view-settings')).toBe('views/settings.html');
  });

  it('should map song view IDs to paths', () => {
    expect(getViewPath('view-song-twinkle-twinkle')).toBe('views/songs/twinkle-twinkle.html');
    expect(getViewPath('view-song-mary-lamb')).toBe('views/songs/mary-lamb.html');
  });

  it('should map game view IDs to paths', () => {
    expect(getViewPath('view-game-pitch-quest')).toBe('views/games/pitch-quest.html');
    expect(getViewPath('view-game-rhythm-match')).toBe('views/games/rhythm-match.html');
  });
});
