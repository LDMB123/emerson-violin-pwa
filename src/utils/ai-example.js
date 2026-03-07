import {
    isNativeAIAvailable,
    generateWithNanoBananaPro,
    generateUIWithStitch
} from '../platform/platform-utils.js';

/**
 * Example Usage of Native window.ai APIs in Emerson Violin PWA
 * 
 * This file demonstrates how to natively utilize the on-device AI capabilities
 * (Nano Banana Pro and Stitch) through the platform utilities.
 */

export const demonstrateAI = async () => {
    if (!isNativeAIAvailable()) {
        console.warn('Native AI is not available in this browser. Please use Chrome 127+ with window.ai enabled.');
        return;
    }

    try {
        console.log('Generating positive feedback using Nano Banana Pro...');
        const feedback = await generateWithNanoBananaPro(
            'The student just played a perfect A major scale. Provide a short, encouraging message in the persona of a friendly Red Panda violin teacher named Emerson.',
            { temperature: 0.7 }
        );
        console.log('Emerson says:', feedback);

        console.log('Generating a custom practice UI component using Stitch...');
        const uiCode = await generateUIWithStitch(
            'Create a dark-themed CSS glassmorphism card for displaying a daily practice streak of 5 days, including a fire emoji and "Keep it up!" text.'
        );
        console.log('Generated UI Code:', uiCode);

    } catch (error) {
        console.error('Error during native AI demonstration:', error);
    }
};
