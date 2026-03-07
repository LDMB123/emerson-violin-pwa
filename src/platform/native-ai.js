/**
 * Interfaces with native browser AI APIs (e.g., window.ai).
 * Provides wrappers for accessing Nano Banana Pro (Gemini Nano) and Stitch UI generation natively.
 */

/**
 * Checks if the experimental window.ai or window.ai.languageModel API is available natively.
 * @returns {boolean} True if the API is available.
 */
export const isNativeAIAvailable = () => {
    return typeof window !== 'undefined' && 'ai' in window && 'languageModel' in window.ai;
};

/**
 * Calls the native model (typically Nano Banana Pro / Gemini Nano) to generate multimodal text/image responses.
 * @param {string} prompt - The prompt to provide to the model.
 * @param {Object} [options] - Optional generation configuration or system instructions.
 * @returns {Promise<string>} The generated output.
 */
export const generateWithNanoBananaPro = async (prompt, options = {}) => {
    if (!isNativeAIAvailable()) {
        throw new Error('Native window.ai (Nano Banana Pro) is not available on this browser.');
    }

    try {
        const capabilities = await window.ai.languageModel.capabilities();
        if (capabilities.available === 'no') {
            throw new Error('Native AI model is present but currently unable to run (insufficient resources or disabled).');
        }

        const session = await window.ai.languageModel.create(options);
        const result = await session.prompt(prompt);
        
        // Clean up the session to free resources
        if (typeof session.destroy === 'function') {
            session.destroy();
        }
        
        return result;
    } catch (err) {
        console.error('Nano Banana Pro generation failed:', err);
        throw err;
    }
};

/**
 * Interfaces with the native Stitch UI-generation model via window.ai to generate UI components.
 * If explicitly exposed as ai.stitch, it uses that; otherwise falls back to the unified languageModel api.
 * @param {string} uiPrompt - The design or UI request to generate.
 * @returns {Promise<string>} The generated UI HTML/CSS or structural configuration.
 */
export const generateUIWithStitch = async (uiPrompt) => {
    // If window.ai.stitch is specifically exposed, use it.
    if (typeof window !== 'undefined' && window.ai && typeof window.ai.stitch?.create === 'function') {
        try {
            const session = await window.ai.stitch.create();
            const result = await session.prompt(uiPrompt);
            if (typeof session.destroy === 'function') session.destroy();
            return result;
        } catch (err) {
            console.error('Native Stitch AI generation failed:', err);
            throw err;
        }
    }
    
    // Fallback or unified architecture path
    const enhancedPrompt = `Generate a responsive UI component for the following request using Stitch-like logic:\n${uiPrompt}\nOutput valid code.`;
    return generateWithNanoBananaPro(enhancedPrompt, {
        systemPrompt: "You are an expert UI generator. Output structural logic and relevant design elements only."
    });
};
