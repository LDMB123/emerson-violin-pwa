export const createSwUpdateFlowController = ({ setStatus, showApply }) => {
    const boundRegistrations = new WeakSet();

    const bindUpdateFlow = (registration) => {
        if (!registration) return;

        if (registration.waiting) {
            setStatus('Update ready to apply.');
            showApply(true);
        } else {
            setStatus('App is up to date.');
            showApply(false);
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
                    setStatus('Update ready to apply.');
                    showApply(true);
                } else {
                    setStatus('App ready for offline use.');
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
