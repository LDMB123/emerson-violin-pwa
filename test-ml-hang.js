import { getLearningRecommendations } from './src/ml/recommendations.js';

console.log("Starting getLearningRecommendations test...");
const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT!')), 5000));

Promise.race([
    getLearningRecommendations({ allowCached: false }),
    timeout
]).then(res => {
    console.log("SUCCESS:", JSON.stringify(res, null, 2).slice(0, 100));
    process.exit(0);
}).catch(err => {
    console.error("FAILED:", err);
    process.exit(1);
});
