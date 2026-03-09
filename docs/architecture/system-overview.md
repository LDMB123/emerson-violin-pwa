# System Overview

This app is a local-first violin practice PWA built with Vite and vanilla ES modules. The shell, route loading, and feature initialization are intentionally split so views stay lightweight and feature code loads on demand.

## Runtime Shape

- `index.html` provides the shell and the `#main-content` mount point
- `public/views/` contains routed HTML fragments for top-level views, games, and song sheets
- `src/routes.jsx` defines the routing tree using React Router
- `src/app/module-registry.js` maps views to lazy feature modules, eager startup modules, and low-priority idle preloads
- `src/routes.jsx` and `src/app.jsx` coordinate route changes and initial view activation

## Source Of Truth

- Current routed surface: `public/views/`
- View-to-module mapping: `src/app/module-registry.js`
- View-loading behavior: `src/routes.jsx`
- Runtime bootstrap: `src/app.jsx` and `src/app/view-bootstrap.js`

## Maintainer Guidance

- If a new view is added, update the routed HTML, module-registry rules, and the relevant guide or architecture note in the same PR
- Keep human docs focused on behavior and ownership; use the source files above for exact inventory
- Do not document view counts here; they drift too quickly
