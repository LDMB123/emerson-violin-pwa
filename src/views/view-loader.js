export class ViewLoader {
  constructor() {
    this.cache = new Map();
    this.loading = new Map();
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
}
