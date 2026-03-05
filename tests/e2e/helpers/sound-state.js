export const forceSoundsOn = async (page) => {
    await page.evaluate(() => {
        document.documentElement.dataset.sounds = 'on';
        document.dispatchEvent(new CustomEvent('panda:sounds-change', { detail: { enabled: true } }));
    });
};
