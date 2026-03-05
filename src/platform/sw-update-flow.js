export const createSwUpdateFlowController = ({ setStatus, showApply }) => {
    const boundRegistrations = new WeakSet();
    const markReadyToApply = () => {
        setStatus('Update ready to apply.');
        showApply(true);
    };
    const markUpToDate = () => {
        setStatus('App is up to date.');
        showApply(false);
    };

    const bindUpdateFlow = (registration) => {
        if (!registration) return;

        if (registration.waiting) {
            markReadyToApply();
        } else {
            markUpToDate();
        }

        if (boundRegistrations.has(registration)) return;
        boundRegistrations.add(registration);

        registration.addEventListener('updatefound', () => {
            setStatus('Update downloading…');
            const newWorker = registration.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', () => {
                if (newWorker.state !== 'installed') return;
                if (navigator.serviceWorker.controller) {
                    markReadyToApply();
                } else {
                    setStatus('App ready for offline use.');
                    showApply(false);
                }
            });
        });
    };

    const handleControllerChange = () => {
        setStatus('Update applied. Reloading…');
        window.location.reload();
    };

    return {
        bindUpdateFlow,
        handleControllerChange,
    };
};
