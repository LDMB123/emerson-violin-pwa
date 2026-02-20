const createEmptyElements = () => ({
    shareButton: null,
    shareStatusEl: null,
});

const buildShareSummary = () => {
    const weekSummary = document.querySelector('[data-parent="week-summary"]')?.textContent?.trim();
    const goalValue = document.querySelector('[data-parent="goal-value"]')?.textContent?.trim();
    const goalTitle = document.querySelector('[data-parent-goal-title]')?.textContent?.trim();
    const skillLines = Array.from(document.querySelectorAll('.overview-skill')).map((skill) => {
        const name = skill.querySelector('.skill-name')?.textContent?.trim();
        const stars = skill.querySelector('.skill-stars')?.textContent?.trim();
        if (!name || !stars) return null;
        return `${name}: ${stars}`;
    }).filter(Boolean);

    const lines = [
        'Panda Violin — Weekly Summary',
        weekSummary || 'Weekly practice summary',
    ];
    if (goalTitle) lines.push(`Recital focus: ${goalTitle}`);
    if (goalValue) lines.push(`Goal progress: ${goalValue}`);
    if (skillLines.length) {
        lines.push('Skills:');
        lines.push(...skillLines);
    }
    return lines.join('\n');
};

export const createShareSummaryController = () => {
    let elements = createEmptyElements();

    const bind = () => {
        const shareButton = elements.shareButton;
        if (!shareButton) return;
        if (shareButton.dataset.nativeBound === 'true') return;
        shareButton.dataset.nativeBound = 'true';

        shareButton.addEventListener('click', async () => {
            const text = buildShareSummary();
            if (!text) return;
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: 'Panda Violin Summary',
                        text,
                    });
                    if (elements.shareStatusEl) elements.shareStatusEl.textContent = 'Shared.';
                    return;
                } catch {
                    // User cancelled or share failed; continue to fallback
                }
            }
            try {
                await navigator.clipboard.writeText(text);
                if (elements.shareStatusEl) elements.shareStatusEl.textContent = 'Summary copied to clipboard.';
                return;
            } catch {
                // fall through
            }
            if (elements.shareStatusEl) elements.shareStatusEl.textContent = 'Sharing not available on this device.';
        });
    };

    return {
        setElements(nextElements) {
            elements = {
                ...createEmptyElements(),
                ...nextElements,
            };
        },
        bind,
    };
};
