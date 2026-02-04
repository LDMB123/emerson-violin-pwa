import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Rust-first shell markup', () => {
  const indexHtml = readFileSync(resolve(process.cwd(), 'index.html'), 'utf-8');

  it('boots via Trunk + Rust', () => {
    expect(indexHtml).toContain('data-trunk');
    expect(indexHtml).toContain('Cargo.toml');
    expect(indexHtml).not.toContain('src="./src/app.js"');
  });

  it('includes the core sections', () => {
    expect(indexHtml).toContain('id="overview"');
    expect(indexHtml).toContain('id="support"');
    expect(indexHtml).toContain('id="controls"');
  });

  it('includes Rust data hooks', () => {
    expect(indexHtml).toContain('data-session-start');
    expect(indexHtml).toContain('data-tuner-toggle');
    expect(indexHtml).toContain('data-metronome-toggle');
    expect(indexHtml).toContain('data-recorder-toggle');
  });
});

describe('Manifest shell defaults', () => {
  const manifest = JSON.parse(
    readFileSync(resolve(process.cwd(), 'manifest.webmanifest'), 'utf-8')
  );

  it('starts on the overview section', () => {
    expect(manifest.start_url).toBe('./#overview');
  });

  it('uses the Emerson Violin Studio name', () => {
    expect(manifest.name).toBe('Emerson Violin Studio');
  });

  it('enables window controls overlay', () => {
    expect(manifest.display_override).toContain('window-controls-overlay');
  });
});
