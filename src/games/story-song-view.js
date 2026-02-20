export const createStorySongView = ({
    titleEl,
    pageEl,
    notesEl,
    promptEl,
    statusEl,
    toggle,
    storyPages,
}) => {
    const updateStatus = (message) => {
        if (!statusEl) return;
        if (message) {
            statusEl.textContent = message;
            return;
        }
        statusEl.textContent = toggle?.checked
            ? 'Play-along running — follow the notes.'
            : 'Press Play-Along to start.';
    };

    const updatePage = (index) => {
        const page = storyPages[index];
        if (titleEl) {
            titleEl.textContent = page ? `Story Song Lab · ${page.title}` : 'Story Song Lab';
        }
        if (pageEl) {
            pageEl.textContent = page ? `Page ${index + 1} of ${storyPages.length}` : '';
        }
        if (notesEl) {
            notesEl.textContent = page ? page.notes.join(' · ') : '♪ ♪ ♪';
        }
        if (promptEl) {
            promptEl.textContent = page ? page.prompt : 'Warm up with your open strings.';
        }
    };

    return {
        updateStatus,
        updatePage,
    };
};
