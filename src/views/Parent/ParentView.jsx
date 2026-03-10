import React, { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router';
import { useSessionStorage } from '../../hooks/useStorage.js';
import { Typography } from '../../components/primitives/Typography.jsx';
import { lazyNamedWithRetry } from '../../app/lazy-import.js';
import styles from './ParentView.module.css';
import { getPublicAssetPath } from '../../utils/public-asset-path.js';
import { verifyPin } from '../../parent/pin-crypto.js';
import { loadPinData, normalizePin, savePinData } from '../../parent/pin-state.js';
import {
    PARENT_PIN_KEY,
    PARENT_PIN_LEGACY_KEY,
    PARENT_UNLOCK_KEY,
} from '../../persistence/storage-keys.js';

const IDLE_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const WARN_TIMEOUT = 14 * 60 * 1000; // 14 minutes
const ReviewPanel = lazyNamedWithRetry(() => import('./ReviewPanel.jsx'), 'ReviewPanel');
const GoalsPanel = lazyNamedWithRetry(() => import('./GoalsPanel.jsx'), 'GoalsPanel');
const ChecklistPanel = lazyNamedWithRetry(() => import('./ChecklistPanel.jsx'), 'ChecklistPanel');
const RecordingsPanel = lazyNamedWithRetry(() => import('./RecordingsPanel.jsx'), 'RecordingsPanel');
const DataPanel = lazyNamedWithRetry(() => import('./DataPanel.jsx'), 'DataPanel');
const SettingsPanel = lazyNamedWithRetry(() => import('./SettingsPanel.jsx'), 'SettingsPanel');

export function ParentView({ defaultTab = 'review' }) {
    const navigate = useNavigate();
    const [pinUnlocked, setPinUnlocked] = useSessionStorage(PARENT_UNLOCK_KEY, false);
    const [pinInput, setPinInput] = useState('');
    const [pinErrorMessage, setPinErrorMessage] = useState('');
    const [pinData, setPinData] = useState(null);
    const [isPinReady, setIsPinReady] = useState(false);
    const [pinLoadFailed, setPinLoadFailed] = useState(false);
    const [activeTab, setActiveTab] = useState(defaultTab);
    const [showRevertWarning, setShowRevertWarning] = useState(false);
    const idleTimerRef = useRef(null);
    const warnTimerRef = useRef(null);

    useEffect(() => {
        let mounted = true;

        loadPinData({
            pinKey: PARENT_PIN_KEY,
            legacyPinKey: PARENT_PIN_LEGACY_KEY,
        }).then((nextPinData) => {
            if (!mounted) return;
            setPinData(nextPinData);
            setPinLoadFailed(false);
            setIsPinReady(true);
        }).catch((error) => {
            console.error('Failed to load parent PIN', error);
            if (!mounted) return;
            setPinLoadFailed(true);
            setPinErrorMessage('We could not load the Parent Zone lock. Refresh and try again.');
            setIsPinReady(true);
        });

        return () => {
            mounted = false;
        };
    }, []);

    // Parent auto-revert: 15-min inactivity → child mode (spec lines 2309-2316)
    const resetIdleTimer = useCallback(() => {
        setShowRevertWarning(false);
        clearTimeout(idleTimerRef.current);
        clearTimeout(warnTimerRef.current);
        warnTimerRef.current = setTimeout(() => setShowRevertWarning(true), WARN_TIMEOUT);
        idleTimerRef.current = setTimeout(() => {
            setPinUnlocked(false);
            navigate('/home', { replace: true });
        }, IDLE_TIMEOUT);
    }, [navigate]);

    useEffect(() => {
        if (!pinUnlocked) return;
        resetIdleTimer();
        const events = ['pointerdown', 'keydown'];
        events.forEach(evt => document.addEventListener(evt, resetIdleTimer));
        return () => {
            events.forEach(evt => document.removeEventListener(evt, resetIdleTimer));
            clearTimeout(idleTimerRef.current);
            clearTimeout(warnTimerRef.current);
        };
    }, [pinUnlocked, resetIdleTimer]);

    const handlePinSubmit = async (e) => {
        e.preventDefault();
        const normalizedPin = normalizePin(pinInput);

        if (normalizedPin.length !== 4) {
            setPinErrorMessage('Enter a 4-digit PIN.');
            return;
        }

        if (pinLoadFailed) {
            setPinErrorMessage('We could not load the Parent Zone lock. Refresh and try again.');
            return;
        }

        if (!pinData?.hash || !pinData?.salt) {
            try {
                const nextPinData = await savePinData({
                    pinKey: PARENT_PIN_KEY,
                    pin: normalizedPin,
                });
                setPinData(nextPinData);
                setPinUnlocked(true);
                setPinErrorMessage('');
                setPinInput('');
            } catch (error) {
                console.error('Failed to create parent PIN', error);
                setPinErrorMessage('We could not save that PIN. Try again.');
            }
            return;
        }

        const isValid = await verifyPin(normalizedPin, pinData.hash, pinData.salt);
        if (isValid) {
            setPinUnlocked(true);
            setPinErrorMessage('');
            setPinInput('');
        } else {
            setPinErrorMessage('Incorrect PIN. Try again.');
            setPinInput('');
        }
    };

    if (!pinUnlocked) {
        const hasConfiguredPin = Boolean(pinData?.hash && pinData?.salt);
        const canCreatePin = !pinLoadFailed && !hasConfiguredPin;
        return (
            <section className={`view is-active ${styles.parentView}`} id="view-parent" aria-label="Parent Zone Unlock">
                <div className={`view-header ${styles.viewHeader}`}>
                    <Link to="/home" className={`back-btn ${styles.backBtn}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                        Back
                    </Link>
                    <Typography variant="h2" as="h2">Parent Zone</Typography>
                </div>
                <div style={{ padding: '24px', maxWidth: '400px', margin: '40px auto' }}>
                    <div className="pin-dialog glass" data-pin-dialog style={{ position: 'relative', display: 'block', margin: 0 }}>
                        <form className="pin-form" onSubmit={handlePinSubmit}>
                            <h3 id="parent-pin-title">
                                {pinLoadFailed ? 'Parent Zone unavailable' : hasConfiguredPin ? 'Unlock Zone' : 'Create Parent PIN'}
                            </h3>
                            <p>
                                {pinLoadFailed
                                    ? 'The saved Parent Zone lock could not be loaded in this session.'
                                    : hasConfiguredPin
                                    ? 'Enter your 4-digit PIN to continue.'
                                    : 'Set a 4-digit PIN to protect Parent Zone tools, settings, and recordings.'}
                            </p>
                            <label className="sr-only" htmlFor="parent-pin-input">Parent PIN</label>
                            <input
                                type="password"
                                id="parent-pin-input"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength="4"
                                placeholder="1234"
                                value={pinInput}
                                onChange={e => {
                                    setPinInput(normalizePin(e.target.value));
                                    if (pinErrorMessage) setPinErrorMessage('');
                                }}
                                autoComplete="off"
                                disabled={!isPinReady || pinLoadFailed}
                                style={{
                                    fontSize: '2rem',
                                    padding: '12px',
                                    textAlign: 'center',
                                    letterSpacing: '0.5em',
                                    width: '100%',
                                    marginBottom: '16px',
                                    borderRadius: '16px',
                                    border: '2px solid rgba(15, 23, 42, 0.16)',
                                    background: 'rgba(248, 250, 252, 0.96)',
                                    color: 'var(--color-text)',
                                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 10px 20px rgba(15, 23, 42, 0.08)',
                                }}
                            />
                            {!isPinReady && <p style={{ color: 'var(--color-text-muted)', marginBottom: '16px' }}>Loading your Parent Zone lock…</p>}
                            {canCreatePin && isPinReady && (
                                <p style={{ color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                                    You skipped this during onboarding. Set it now and the app will remember it on this device.
                                </p>
                            )}
                            {pinErrorMessage && <p className="pin-error" style={{ color: 'var(--color-warning)', fontWeight: 600, marginBottom: '16px' }}>{pinErrorMessage}</p>}
                            <div className="pin-actions">
                                <Link className="btn btn-secondary" to="/home">Cancel</Link>
                                <button className="btn btn-primary" type="submit" value="confirm" disabled={!isPinReady || pinLoadFailed || pinInput.length !== 4}>
                                    {pinLoadFailed ? 'Reload required' : hasConfiguredPin ? 'Unlock' : 'Create PIN & Enter'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </section>
        );
    }

    const TABS = [
        { id: 'review', label: 'Review' },
        { id: 'goals', label: 'Goals' },
        { id: 'checklist', label: 'Checklist' },
        { id: 'recordings', label: 'Recordings' },
        { id: 'data', label: 'Data' },
        { id: 'settings', label: 'Settings' }
    ];

    const panelFallback = (
        <div className="glass" style={{ padding: '24px', borderRadius: '24px', textAlign: 'center' }}>
            <Typography variant="body">Loading parent tools...</Typography>
        </div>
    );

    const renderActivePanel = () => {
        switch (activeTab) {
            case 'review': return <ReviewPanel />;
            case 'goals': return <GoalsPanel />;
            case 'checklist': return <ChecklistPanel />;
            case 'recordings': return <RecordingsPanel />;
            case 'data': return <DataPanel />;
            case 'settings': return <SettingsPanel />;
            default: return <ReviewPanel />;
        }
    };

    return (
        <section className={`view is-active ${styles.parentView}`} id="view-parent" aria-label="Parent Zone" style={{ display: 'block' }}>
            <div className={`view-header ${styles.viewHeader}`}>
                <Link to="/home" className={`back-btn ${styles.backBtn}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                    Back
                </Link>
                <Typography variant="h2" as="h2">Parent Zone</Typography>
                <div className="pin-lock" style={{ marginLeft: 'auto', fontWeight: 600, color: 'var(--color-success)' }}>🔓 Unlocked</div>
            </div>

            {showRevertWarning && (
                <div style={{ background: 'var(--color-warning)', color: '#352019', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 600 }}>
                    <span>Returning to child mode in 1 minute</span>
                    <button className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: '0.85rem' }} onClick={resetIdleTimer}>Stay</button>
                </div>
            )}

            <nav className="parent-tabs" style={{ display: 'flex', overflowX: 'auto', gap: '8px', padding: '0 24px', marginBottom: '24px', WebkitOverflowScrolling: 'touch' }}>
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ whiteSpace: 'nowrap', borderRadius: '24px', padding: '8px 16px' }}
                    >
                        {tab.label}
                    </button>
                ))}
            </nav>

            <div className="parent-layout" style={{ maxWidth: '800px', margin: '0 auto' }}>
                <Suspense fallback={panelFallback}>
                    {renderActivePanel()}
                </Suspense>
            </div>

            <picture>
                <source srcSet={getPublicAssetPath('./assets/illustrations/mascot-focus.webp')} type="image/webp" />
                <img src={getPublicAssetPath('./assets/illustrations/mascot-focus.webp')} alt="" className="corner-mascot parent-mascot" loading="lazy" decoding="async" style={{ position: 'fixed', bottom: -20, right: -20, width: '200px', opacity: 0.8, pointerEvents: 'none', zIndex: -1 }} />
            </picture>
        </section >
    );
}
