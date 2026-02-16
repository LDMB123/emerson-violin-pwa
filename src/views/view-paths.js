// src/views/view-paths.js
export function getViewPath(viewId) {
  if (!viewId.startsWith('view-')) {
    throw new Error(`Invalid view ID: ${viewId}`);
  }

  const name = viewId.replace('view-', '');

  if (name.startsWith('song-')) {
    return `views/songs/${name.replace('song-', '')}.html`;
  }

  if (name.startsWith('game-')) {
    return `views/games/${name.replace('game-', '')}.html`;
  }

  return `views/${name}.html`;
}
