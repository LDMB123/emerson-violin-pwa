export const dispatchPagehide = async (page, persisted) => {
    await page.evaluate((isPersisted) => {
        const event = new Event('pagehide');
        if (isPersisted) {
            Object.defineProperty(event, 'persisted', {
                configurable: true,
                value: true,
            });
        }
        window.dispatchEvent(event);
    }, persisted);
};
