/** Cleans up Sequence Game bindings and reports a final result if needed. */
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
