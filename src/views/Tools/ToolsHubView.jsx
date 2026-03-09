import React from 'react';
import { Link } from 'react-router';
import { Typography } from '../../components/primitives/Typography.jsx';
import { SharedViewHeader } from '../../components/shared/SharedViewHeader.jsx';
import styles from './ToolsHubView.module.css';

export function ToolsHubView() {

    return (
        <section className={`view is-active ${styles.toolsView}`} id="view-trainer" aria-label="Practice Tools" style={{ display: 'block' }}>
            <SharedViewHeader
                title="Practice Tools"
                backTo="/home"
                heroSrc="/assets/illustrations/mascot-focus.webp"
                heroAlt="Panda ready to help you practice"
            />

            <Typography className={`view-lead ${styles.viewLead}`}>
                Tune up, find a steady beat, and get your body ready before the first note.
            </Typography>

            <div className={styles.heroCard}>
                <img
                    src="/assets/illustrations/mascot-focus.webp"
                    alt="Panda ready to help you practice"
                    className={styles.heroMascot}
                    loading="eager"
                    decoding="async"
                    data-tools-hero-mascot
                />
                <div className={styles.heroCopy}>
                    <p className={styles.heroTitle}>Pick one warm-up helper.</p>
                    <p className={styles.heroBody}>Every tool opens fast, works offline, and keeps the session gentle before practice mode begins.</p>
                    <div className={styles.heroMeta}>
                        <span className={styles.metaChip}>Offline-ready</span>
                        <span className={styles.metaChip}>Kid-sized controls</span>
                        <span className={styles.bpmChip}>100 BPM</span>
                    </div>
                </div>
            </div>

            <div className={styles.toolGrid}>
                <Link className={`glass ${styles.toolCard}`} id="tool-tuner" to="/tools/tuner">
                    <div className={styles.toolIcon}>🎸</div>
                    <div className={styles.toolTitle}>Tune Your Violin</div>
                    <div className={styles.toolDesc}>Get each string in tune before you play.</div>
                </Link>

                <Link className={`glass ${styles.toolCard}`} id="tool-metronome" to="/tools/metronome">
                    <div className={styles.toolIcon}>🎵</div>
                    <div className={styles.toolTitle}>Keep the Beat</div>
                    <div className={styles.toolDesc}>Set the tempo and play in time with the clicks.</div>
                </Link>

                <Link className={`glass ${styles.toolCard}`} id="tool-drone" to="/tools/drone">
                    <div className={styles.toolIcon}>🔊</div>
                    <div className={styles.toolTitle}>Listen to a Drone</div>
                    <div className={styles.toolDesc}>Play a steady note to match while you practice.</div>
                </Link>

                <Link className={`glass ${styles.toolCard}`} id="tool-bowing" to="/tools/bowing">
                    <div className={styles.toolIcon}>🎻</div>
                    <div className={styles.toolTitle}>Practice Your Bow Hold</div>
                    <div className={styles.toolDesc}>Check your bow arm position with the camera.</div>
                </Link>

                <Link className={`glass ${styles.toolCard}`} id="tool-posture" to="/tools/posture">
                    <div className={styles.toolIcon}>🧍</div>
                    <div className={styles.toolTitle}>Check Your Posture</div>
                    <div className={styles.toolDesc}>Stand tall and line up before you start.</div>
                </Link>
            </div>
        </section>
    );
}
