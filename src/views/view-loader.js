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
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load view: HTTP ${response.status}`);
        }
        return response.text();
      })
      .then(html => {
        this.cache.set(viewPath, html);
        this.loading.delete(viewPath);
        return html;
      })
      .catch(err => {
        this.loading.delete(viewPath);
        throw err;
      });

    this.loading.set(viewPath, promise);
    return promise;
  }
}
