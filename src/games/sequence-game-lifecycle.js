export const cleanupSequenceGameBinding = ({
    lifecycleCleanup,
    reportResult,
}) => {
    if (typeof lifecycleCleanup === 'function') {
        lifecycleCleanup();
    }
    if (reportResult?.dispose) {
        reportResult.dispose();
    }
};
