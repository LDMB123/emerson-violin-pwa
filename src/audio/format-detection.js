/**
 * Audio format detection for dynamic audio loading
 * Detects Opus support (Safari 17+, Chrome/Firefox/Edge)
 */

// Detect Opus support (Safari 17+, Chrome/Firefox/Edge)
export const SUPPORTS_OPUS = (() => {
  const audio = document.createElement('audio');
  return audio.canPlayType('audio/ogg; codecs=opus') === 'probably' ||
         audio.canPlayType('audio/webm; codecs=opus') === 'probably';
})();

export const AUDIO_EXT = SUPPORTS_OPUS ? 'opus' : 'mp3';

/**
 * Get the appropriate audio file path with extension based on browser support
 * @param {string} basePath - Path without extension (e.g., './assets/audio/violin-a4')
 * @returns {string} - Path with appropriate extension (e.g., './assets/audio/violin-a4.opus')
 */
export const getAudioPath = (basePath) => {
  // Remove any existing extension
  const cleanPath = basePath.replace(/\.(wav|mp3|opus)$/, '');
  return `${cleanPath}.${AUDIO_EXT}`;
};
