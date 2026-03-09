import React from 'react';
import { Link } from 'react-router';
import { Typography } from '../../components/primitives/Typography.jsx';
import { SharedViewHeader } from '../../components/shared/SharedViewHeader.jsx';
import { TOOL_HUB_LINKS } from './tools-hub-contract.js';
import styles from './ToolsHubView.module.css';

export function ToolsHubView() {

    return (
        <section className={`view is-active ${styles.toolsView}`} id="view-trainer" aria-label="Practice Tools" style={{ display: 'block' }}>
            <SharedViewHeader
                title="Practice Tools"
                backTo="/home"
                heroSrc="./assets/illustrations/mascot-focus.webp"
                heroAlt="Panda ready to help you practice"
            />

            <Typography className={`view-lead ${styles.viewLead}`}>
                Tune up, find a steady beat, and get your body ready before the first note.
            </Typography>

            <div className={styles.heroCard}>
                <img
                    src="./assets/illustrations/mascot-focus.webp"
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
                {TOOL_HUB_LINKS.map((tool) => (
                    <Link key={tool.id} className={`glass ${styles.toolCard}`} id={tool.id} to={tool.to}>
                        <div className={styles.toolIcon}>{tool.icon}</div>
                        <div className={styles.toolTitle}>{tool.title}</div>
                        <div className={styles.toolDesc}>{tool.description}</div>
                    </Link>
                ))}
            </div>
        </section>
    );
}
