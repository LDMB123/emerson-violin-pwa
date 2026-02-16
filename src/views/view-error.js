/**
 * View Error Display
 *
 * Displays user-friendly error UI when view loading fails.
 */

/**
 * Show error message when view loading fails
 * @param {string} message - Error message to display
 */
export function showViewError(message) {
    const container = document.getElementById('main-content');
    if (!container) {
        console.error('[ViewError] main-content container not found');
        return;
    }

    // Sanitize message by escaping HTML to prevent XSS
    const escapeHtml = (str) => {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    };

    container.innerHTML = `
        <div class="view-error glass">
            <div class="error-icon">⚠️</div>
            <h2>Oops! Something went wrong</h2>
            <p>${escapeHtml(message)}</p>
            <button class="btn btn-primary" onclick="window.location.reload()">
                Reload App
            </button>
        </div>
    `;
}
