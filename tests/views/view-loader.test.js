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
});
