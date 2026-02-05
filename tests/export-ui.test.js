import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

describe('Export and import UI hooks', () => {
  it('includes file access controls and status elements', () => {
    const html = readFileSync('index.html', 'utf-8');
    expect(html).toContain('data-export-status');
    expect(html).toContain('data-export-summary-files');
    expect(html).toContain('data-score-open-files');
    expect(html).toContain('data-restore-open-files');
    expect(html).toContain('data-import-files');
    expect(html).toContain('data-ml-trace-filter-start');
    expect(html).toContain('data-game-score-filter-start');
    expect(html).toContain('data-game-score-profile-only');
    expect(html).toContain('data-profile-export-csv');
    expect(html).toContain('data-recorder-select-all');
    expect(html).toContain('data-score-library-include-xml');
    expect(html).toContain('data-ml-trace-filter-badge');
    expect(html).toContain('data-game-score-filter-badge');
    expect(html).toContain('data-ml-trace-select-all');
    expect(html).toContain('data-game-score-select-all');
    expect(html).toContain('data-recorder-filter-badge');
    expect(html).toContain('data-recorder-profile-only');
  });
});
