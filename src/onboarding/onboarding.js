import { setJSON } from '../persistence/storage.js';

const STORAGE_KEY = 'onboarding-complete';

const carousel = document.getElementById('onboarding-carousel');
const dots = document.querySelectorAll('.onboarding-dot');
const startBtn = document.getElementById('onboarding-start');
const skipBtn = document.getElementById('onboarding-skip');

const dismiss = async () => {
    await setJSON(STORAGE_KEY, true);
    window.location.hash = '#view-home';
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

    // Update active dot on scroll
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const id = entry.target.id;
                const index = id.replace('onboarding-slide-', '');
                dots.forEach((dot) => {
                    dot.classList.toggle('is-active', dot.dataset.slide === index);
                });
            });
        },
        { root: carousel, threshold: 0.6 }
    );

    carousel.querySelectorAll('.onboarding-slide').forEach((slide) => {
        observer.observe(slide);
    });
}

if (startBtn) {
    startBtn.addEventListener('click', dismiss);
}

if (skipBtn) {
    skipBtn.addEventListener('click', dismiss);
}

// Escape key dismisses onboarding
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !document.getElementById('view-onboarding')?.hidden) {
        event.preventDefault();
        dismiss();
    }
}, { once: true });
