import React from 'react';
import { Link } from 'react-router';
import { Typography } from '../primitives/Typography.jsx';
import styles from '../../styles/components/SharedViewHeader.module.css';

export function SharedViewHeader({
    title,
    backTo,
    heroSrc,
    heroAlt = '',
    heroClassName = '',
    className = '',
    backLabel = 'Back',
    viewTransition = true,
}) {
    const headerClassName = [styles.viewHeader, className].filter(Boolean).join(' ');
    const mascotClassName = [styles.mascot, heroClassName].filter(Boolean).join(' ');

    return (
        <div className={headerClassName} data-view-header>
            <Link
                to={backTo}
                viewTransition={viewTransition}
                className={styles.backBtn}
                aria-label={`${backLabel} to ${backTo}`}
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M15 18l-6-6 6-6" />
                </svg>
                <span>{backLabel}</span>
            </Link>
            <Typography variant="h2" as="h2" className={styles.title}>
                {title}
            </Typography>
            {heroSrc ? (
                <div className={styles.mascotWrap}>
                    <img
                        src={heroSrc}
                        alt={heroAlt}
                        className={mascotClassName}
                        loading="eager"
                        decoding="async"
                        data-view-header-mascot
                    />
                </div>
            ) : (
                <div className={styles.mascotSpacer} aria-hidden="true" />
            )}
        </div>
    );
}
