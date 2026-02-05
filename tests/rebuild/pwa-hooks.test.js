import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Diagnostics drill hooks', () => {
  const indexHtml = readFileSync(resolve(process.cwd(), 'index.html'), 'utf-8');

  it('includes integrity drill UI hooks', () => {
    expect(indexHtml).toContain('data-db-integrity-drill');
    expect(indexHtml).toContain('data-db-integrity-drill-status');
  });

  it('includes storage pressure drill hooks', () => {
    expect(indexHtml).toContain('data-storage-drill-size');
    expect(indexHtml).toContain('data-storage-drill-fill');
    expect(indexHtml).toContain('data-storage-drill-clear');
    expect(indexHtml).toContain('data-storage-drill-check');
    expect(indexHtml).toContain('data-storage-drill-status');
    expect(indexHtml).toContain('data-storage-drill-pressure');
  });
});

describe('DB and storage status hooks', () => {
  const indexHtml = readFileSync(resolve(process.cwd(), 'index.html'), 'utf-8');

  it('includes DB worker status hooks', () => {
    expect(indexHtml).toContain('data-db-worker-status');
    expect(indexHtml).toContain('data-db-mode');
    expect(indexHtml).toContain('data-db-latency-p50');
  });

  it('includes storage status hooks', () => {
    expect(indexHtml).toContain('data-storage-persisted');
    expect(indexHtml).toContain('data-storage-pressure');
    expect(indexHtml).toContain('data-opfs-support');
  });

  it('includes migration status hooks', () => {
    expect(indexHtml).toContain('data-db-migrate-status');
    expect(indexHtml).toContain('data-db-migrate-state');
    expect(indexHtml).toContain('data-db-migrate-checksums');
  });
});
