export class ViewLoader {
  constructor() {
    this.cache = new Map();
  }

  async load(viewPath) {
    if (this.cache.has(viewPath)) {
      return this.cache.get(viewPath);
    }

    const response = await fetch(viewPath);

    if (!response.ok) {
      throw new Error(`Failed to load view: HTTP ${response.status}`);
    }

    const html = await response.text();
    this.cache.set(viewPath, html);
    return html;
  }
}
