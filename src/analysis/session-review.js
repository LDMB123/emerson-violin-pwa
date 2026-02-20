import { getLearningRecommendations } from '../ml/recommendations.js';
import { loadEvents, loadRecordings } from '../persistence/loaders.js';
import { getCore } from '../wasm/load-core.js';
import { RECORDINGS_UPDATED } from '../utils/event-names.js';
import { createSkillProfileUtils } from '../utils/skill-profile.js';
import { coachMessageFor } from '../utils/session-review-utils.js';
import { createSessionReviewRenderer } from './session-review-render.js';
import { createSessionReviewRecordingController } from './session-review-recording-controls.js';
import { buildSessionStats, buildSkillProfile } from './session-review-data.js';

const renderer = createSessionReviewRenderer();
const recordingController = createSessionReviewRecordingController();
let teardown = () => {};

const initSessionReview = async () => {
    teardown();
    renderer.resolveElements();

    if (!renderer.hasRecordingSlots()) return;

    const { SkillProfile, SkillCategory } = await getCore();
    const { updateSkillProfile } = createSkillProfileUtils(SkillCategory);

    const events = await loadEvents();
    const recordings = await loadRecordings();
    const songMap = renderer.buildSongMap();
    const stats = buildSessionStats(events);

    if (stats.recentAccuracies.length) renderer.updateChart(stats.recentAccuracies);

    recordingController.applyRecordings({
        events,
        songMap,
        recordings,
        recordingElements: renderer.getRecordingElements(),
    });

    const refreshRecordings = async () => {
        recordingController.stop();
        const fresh = await loadRecordings();
        renderer.resolveElements();
        recordingController.applyRecordings({
            events,
            songMap,
            recordings: fresh,
            recordingElements: renderer.getRecordingElements(),
        });
    };

    const onHashChange = () => recordingController.stop();
    const onPageHide = () => recordingController.stop();
    const onVisibilityChange = () => {
        if (document.hidden) recordingController.stop();
    };

    window.addEventListener(RECORDINGS_UPDATED, refreshRecordings);
    window.addEventListener('hashchange', onHashChange, { passive: true });
    window.addEventListener('pagehide', onPageHide, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);

    renderer.updateMinutes(stats.minutes);
    renderer.updateAccuracy(stats.accuracyAvg);

    const profile = buildSkillProfile({ SkillProfile, SkillCategory, events, updateSkillProfile });
    renderer.updateSkills(profile);

    const weakest = profile.weakest_skill();
    const message = coachMessageFor(weakest);
    renderer.setCoachMessage(message);

    const recommendations = await getLearningRecommendations().catch(() => null);
    renderer.updateMissionStatus(recommendations?.mission || null);
    renderer.renderNextActions(recommendations);
    renderer.setCoachAltMessage('Keep your tempo steady and enjoy the melody.');

    const recs = await getLearningRecommendations();
    if (recs?.coachMessage) {
        renderer.setCoachMessage(recs.coachMessage);
    }
    if (recs?.coachActionMessage) {
        renderer.setCoachAltMessage(recs.coachActionMessage);
    }

    teardown = () => {
        window.removeEventListener(RECORDINGS_UPDATED, refreshRecordings);
        window.removeEventListener('hashchange', onHashChange);
        window.removeEventListener('pagehide', onPageHide);
        document.removeEventListener('visibilitychange', onVisibilityChange);
        recordingController.dispose();
    };
};

export const init = initSessionReview;
