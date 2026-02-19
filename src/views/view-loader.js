export class ViewLoader {
  constructor() {
    this.cache = new Map();
    this.loading = new Map();
    this.templates = new Map();
  }

  has(viewPath) {
    return this.cache.has(viewPath);
  }

  async load(viewPath) {
    if (this.cache.has(viewPath)) {
      return this.cache.get(viewPath);
    }

    if (this.loading.has(viewPath)) {
      return this.loading.get(viewPath);
    }

    const promise = fetch(viewPath)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load view: HTTP ${response.status}`);
        }
        return response.text();
      })
      .then((html) => {
        this.cache.set(viewPath, html);
        this.#cacheTemplate(viewPath, html);
        return html;
      })
      .finally(() => {
        this.loading.delete(viewPath);
      });

    this.loading.set(viewPath, promise);
    return promise;
  }

  async prefetch(viewPath) {
    try {
      await this.load(viewPath);
    } catch {
      // Prefetch failures are non-blocking; normal navigation retries.
    }
  }

  seed(viewPath, html) {
    if (this.cache.has(viewPath)) return;
    this.cache.set(viewPath, html);
    this.#cacheTemplate(viewPath, html);
  }

  async clone(viewPath) {
    if (this.templates.has(viewPath)) {
      return this.templates.get(viewPath).content.cloneNode(true);
    }
    const html = await this.load(viewPath);
    const template = this.#cacheTemplate(viewPath, html);
    return template.content.cloneNode(true);
  }

  #cacheTemplate(viewPath, html) {
    if (this.templates.has(viewPath)) {
      return this.templates.get(viewPath);
    }
    const template = document.createElement('template');
    template.innerHTML = html;
    this.templates.set(viewPath, template);
    return template;
  }
}
