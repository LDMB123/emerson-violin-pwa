import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
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


  it('should report cache presence via has()', async () => {
    expect(viewLoader.has('views/songs.html')).toBe(false);
    viewLoader.seed('views/songs.html', '<section id="songs">Songs</section>');
    expect(viewLoader.has('views/songs.html')).toBe(true);
  });

  it('should not overwrite seeded cache entries', async () => {
    viewLoader.seed('views/coach.html', '<section id="coach-a">Coach A</section>');
    viewLoader.seed('views/coach.html', '<section id="coach-b">Coach B</section>');

    expect(viewLoader.cache.get('views/coach.html')).toContain('coach-a');
    expect(viewLoader.cache.get('views/coach.html')).not.toContain('coach-b');
  });

  it('should clone from cached template when present', async () => {
    viewLoader.seed('views/home.html', '<article><h2>Home</h2></article>');

    const fragment = await viewLoader.clone('views/home.html');
    const container = document.createElement('div');
    container.appendChild(fragment);

    expect(container.querySelector('h2')?.textContent).toBe('Home');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should load and cache template when cloning uncached view', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      text: async () => '<main><p>Loaded Clone</p></main>'
    });

    const firstClone = await viewLoader.clone('views/clone-load.html');
    const secondClone = await viewLoader.clone('views/clone-load.html');
    const firstContainer = document.createElement('div');
    const secondContainer = document.createElement('div');
    firstContainer.appendChild(firstClone);
    secondContainer.appendChild(secondClone);

    expect(firstContainer.querySelector('p')?.textContent).toBe('Loaded Clone');
    expect(secondContainer.querySelector('p')?.textContent).toBe('Loaded Clone');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should reuse an existing template in #cacheTemplate path', () => {
    const preseededTemplate = document.createElement('template');
    preseededTemplate.innerHTML = '<section id="existing-template">Existing</section>';
    viewLoader.templates.set('views/existing.html', preseededTemplate);

    viewLoader.seed('views/existing.html', '<section id="new-template">New</section>');

    expect(viewLoader.templates.get('views/existing.html')).toBe(preseededTemplate);
    expect(viewLoader.cache.get('views/existing.html')).toContain('new-template');
  });

  describe('prefetch()', () => {
    it('should initiate background load when not cached or loading', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => '<div>Prefetched</div>',
      });

      viewLoader.prefetch('views/prefetch.html');
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(global.fetch).toHaveBeenCalledWith('views/prefetch.html');
    });

    it('should not initiate load when already cached', () => {
      viewLoader.seed('views/already-cached.html', '<div>Cached</div>');
      viewLoader.prefetch('views/already-cached.html');

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should not initiate duplicate load when already loading', async () => {
      let resolveLoad;
      global.fetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveLoad = () => resolve({ ok: true, text: async () => '<div>Slow</div>' });
          }),
      );

      viewLoader.prefetch('views/in-flight.html');
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(global.fetch).toHaveBeenCalledTimes(1);

      viewLoader.prefetch('views/in-flight.html');
      expect(global.fetch).toHaveBeenCalledTimes(1);

      resolveLoad();
    });
  });
});

describe('ViewLoader — native Map.getOrInsertComputed path', () => {
  let NativeViewLoader;

  beforeAll(async () => {
    // Simulate Safari 26.2+ / Chrome 133+ native method
    Map.prototype.getOrInsertComputed = function (key, fn) {
      if (!this.has(key)) this.set(key, fn(key));
      return this.get(key);
    };
    vi.resetModules();
    const mod = await import('../../src/views/view-loader.js');
    NativeViewLoader = mod.ViewLoader;
  });

  afterAll(() => {
    delete Map.prototype.getOrInsertComputed;
    vi.resetModules();
  });

  it('should use getOrInsertComputed in #cacheTemplate when natively available', () => {
    const loader = new NativeViewLoader();
    loader.seed('views/native-gori.html', '<article>Native GOrI</article>');

    const template = loader.templates.get('views/native-gori.html');
    expect(template).toBeTruthy();
    expect(template.innerHTML).toBe('<article>Native GOrI</article>');
  });

  it('should return the existing template without recreating it on repeated #cacheTemplate calls', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '<section>Clone Me</section>',
    });

    const loader = new NativeViewLoader();
    const first = await loader.clone('views/native-clone.html');
    const firstTemplate = loader.templates.get('views/native-clone.html');

    // Second clone reuses the cached template without a second fetch
    const second = await loader.clone('views/native-clone.html');
    const secondTemplate = loader.templates.get('views/native-clone.html');

    expect(firstTemplate).toBe(secondTemplate);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const containerA = document.createElement('div');
    const containerB = document.createElement('div');
    containerA.appendChild(first);
    containerB.appendChild(second);
    expect(containerA.querySelector('section')?.textContent).toBe('Clone Me');
    expect(containerB.querySelector('section')?.textContent).toBe('Clone Me');
  });
});
