export class ViewLoader {
  async load(viewPath) {
    const response = await fetch(viewPath);

    if (!response.ok) {
      throw new Error(`Failed to load view: HTTP ${response.status}`);
    }

    return response.text();
  }
}
