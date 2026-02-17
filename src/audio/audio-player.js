/**
 * Progressive enhancement: replaces raw <audio controls> inside .audio-card
 * elements with custom play/pause buttons + waveform animation bars.
 *
 * Cards already using .tone-play-btn (tuner reference tones) are skipped.
 */

const PLAY_SVG = '<svg class="tone-play-icon" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
const STOP_SVG = '<svg class="tone-stop-icon" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';
const WAVE_BARS = '<span class="wave-bars" aria-hidden="true"><span class="wave-bar"></span><span class="wave-bar"></span><span class="wave-bar"></span><span class="wave-bar"></span></span>';

const enhance = (card) => {
    // Skip cards already enhanced
    if (card.querySelector('.tone-play-btn')) return;

    const audio = card.querySelector('audio[controls]');
    if (!audio) return;

    // Detect string name from label text for accent color
    const label = card.querySelector('.audio-label');
    const labelText = label?.textContent?.trim() ?? '';
    const stringMatch = labelText.match(/^([GDAE])\d?$/i);
    if (stringMatch) {
        card.dataset.string = stringMatch[1].toUpperCase();
    }

    // Remove controls, hide the element
    audio.removeAttribute('controls');
    audio.hidden = true;

    // Determine aria-label from label text
    const ariaLabel = label ? `Play ${labelText}` : 'Play';

    // Create play button
    const button = document.createElement('button');
    button.className = 'tone-play-btn';
    button.type = 'button';
    button.setAttribute('aria-label', ariaLabel);
    button.innerHTML = PLAY_SVG + STOP_SVG;

    // Create waveform bars
    const waveContainer = document.createElement('span');
    waveContainer.innerHTML = WAVE_BARS;
    const waveBars = waveContainer.firstElementChild;

    // Insert after label, before audio
    card.insertBefore(button, audio);
    card.insertBefore(waveBars, audio);

    // Wire up play/pause
    button.addEventListener('click', () => {
        if (!audio.paused) {
            audio.pause();
            audio.currentTime = 0;
            card.classList.remove('is-playing');
            return;
        }

        // Stop all other audio cards first
        document.querySelectorAll('.audio-card.is-playing').forEach((other) => {
            if (other === card) return;
            const otherAudio = other.querySelector('audio');
            if (otherAudio) {
                otherAudio.pause();
                otherAudio.currentTime = 0;
            }
            other.classList.remove('is-playing');
        });

        audio.currentTime = 0;
        audio.play().catch(() => {});
        card.classList.add('is-playing');
    });

    audio.addEventListener('ended', () => {
        card.classList.remove('is-playing');
    });

    audio.addEventListener('pause', () => {
        card.classList.remove('is-playing');
    });
};

const enhanceAll = () => {
    document.querySelectorAll('.audio-card').forEach(enhance);
};

// Enhance on initial load
enhanceAll();

// Re-enhance after view changes (views are loaded dynamically)
window.addEventListener('hashchange', () => {
    // Small delay to let the view HTML settle
    requestAnimationFrame(() => {
        requestAnimationFrame(enhanceAll);
    });
});
