import { setJSON } from '../persistence/storage.js';
import { ONBOARDING_KEY as STORAGE_KEY } from '../persistence/storage-keys.js';

const carousel = document.getElementById('onboarding-carousel');
const dots = document.querySelectorAll('.onboarding-dot');
const startBtn = document.getElementById('onboarding-start');
const skipBtn = document.getElementById('onboarding-skip');

const dismiss = async () => {
    await setJSON(STORAGE_KEY, true);
    window.location.hash = '#view-home';
};

const setActiveDot = (index) => {
    dots.forEach((dot) => {
        dot.classList.toggle('is-active', dot.dataset.slide === index);
    });
};

const bindDismissButton = (button) => {
    if (!button) return;
    button.addEventListener('click', dismiss);
};

if (carousel && dots.length) {
    // Dot navigation
    dots.forEach((dot) => {
        dot.addEventListener('click', () => {
            const index = Number(dot.dataset.slide);
            const target = document.getElementById(`onboarding-slide-${index}`);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
            }
        });
    });

    // Use scrollend when available for exact snap alignment; otherwise fall back
    // to IntersectionObserver so the active dot still tracks the visible slide.
    if ('onscrollend' in window) {
        carousel.addEventListener('scrollend', () => {
            const index = String(Math.round(carousel.scrollLeft / (carousel.offsetWidth || 1)));
            setActiveDot(index);
        });
    } else {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    const id = entry.target.id;
                    const index = id.replace('onboarding-slide-', '');
                    setActiveDot(index);
                });
            },
            { root: carousel, threshold: 0.6 }
        );

        carousel.querySelectorAll('.onboarding-slide').forEach((slide) => {
            observer.observe(slide);
        });
    }
}

bindDismissButton(startBtn);
bindDismissButton(skipBtn);

// Escape key dismisses onboarding
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !document.getElementById('view-onboarding')?.hidden) {
        event.preventDefault();
        dismiss();
    }
}, { once: true });
