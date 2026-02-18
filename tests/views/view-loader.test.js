import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ViewLoader } from '../../src/views/view-loader.js';

describe('ViewLoader', () => {
  let viewLoader;

  beforeEach(() => {
    viewLoader = new ViewLoader();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch view HTML', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      text: async () => '<div>Home View</div>'
    });

    const html = await viewLoader.load('views/home.html');
    expect(html).toBe('<div>Home View</div>');
    expect(global.fetch).toHaveBeenCalledWith('views/home.html');
  });

  it('should cache loaded views', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      text: async () => '<div>Cached</div>'
    });

    await viewLoader.load('views/tune.html');
    await viewLoader.load('views/tune.html');

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should prevent duplicate fetches for same view', async () => {
    global.fetch.mockImplementation(() => {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            ok: true,
            text: async () => '<div>Slow</div>'
          });
        }, 100);
      });
    });

    const [html1, html2] = await Promise.all([
      viewLoader.load('views/slow.html'),
      viewLoader.load('views/slow.html')
    ]);

    expect(html1).toBe('<div>Slow</div>');
    expect(html2).toBe('<div>Slow</div>');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should handle fetch errors', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 404
    });

    await expect(viewLoader.load('views/missing.html'))
      .rejects.toThrow('Failed to load view: HTTP 404');
  });

  it('should handle network errors', async () => {
    global.fetch.mockRejectedValue(new Error('Network error'));

    await expect(viewLoader.load('views/error.html'))
      .rejects.toThrow('Network error');
  });
});
