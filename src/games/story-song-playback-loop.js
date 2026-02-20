export const playStorySongPages = async ({
    player,
    token,
    getPageIndex,
    setPageIndex,
    storyPages,
    isPlaybackCurrent,
    isToggleChecked,
    updatePage,
    tempo,
    stageSeconds,
    onPageCompleted,
}) => {
    while (getPageIndex() < storyPages.length) {
        const currentPageIndex = getPageIndex();
        if (!isPlaybackCurrent(token) || !isToggleChecked()) break;
        const page = storyPages[currentPageIndex];
        updatePage(currentPageIndex);
        const played = await player.playSequence(page.notes, {
            tempo: page.tempo ?? tempo,
            gap: 0.12,
            duration: 0.4,
            volume: 0.2,
            type: 'triangle',
        });
        if (!played || !isPlaybackCurrent(token) || !isToggleChecked()) break;
        onPageCompleted({ page, pageIndex: currentPageIndex });
        const nextPageIndex = currentPageIndex + 1;
        setPageIndex(nextPageIndex);
        if (nextPageIndex < storyPages.length) {
            await new Promise((resolve) => setTimeout(resolve, Math.max(400, stageSeconds * 250)));
        }
    }
};
