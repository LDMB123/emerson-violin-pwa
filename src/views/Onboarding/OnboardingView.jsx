import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useLocalStorage } from '../../hooks/useStorage.js';
import styles from './OnboardingView.module.css';
import { getPublicAssetPath } from '../../utils/public-asset-path.js';

export function OnboardingView({ onComplete }) {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(0);
    // Phase 35: Extracted Hook
    const [childName, setChildName] = useLocalStorage('emerson_violin_child_name', '');
    const [parentPin, setParentPin] = useState('');
    const [isStandalone, setIsStandalone] = useState(true);

    useEffect(() => {
        // Check if installed
        const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
        setIsStandalone(standalone);
    }, []);

    const steps = [
        { id: 'welcome', isChildFacing: true },
        { id: 'name', isChildFacing: true },
        { id: 'parentSetup', isChildFacing: false },
        // Step 4 is conditional. If standalone, we just skip displaying it, but keep the step in the array to keep indices simple, or filter it out.
        ...(isStandalone ? [] : [{ id: 'install', isChildFacing: false }]),
        { id: 'ready', isChildFacing: true }
    ];

    const totalSteps = steps.length;

    const handleNext = () => {
        // Progressive save: persist data immediately at each step
        const step = steps[currentStep];
        if (step?.id === 'name' && childName.trim()) {
            localStorage.setItem('emerson_violin_child_name', childName.trim());
            localStorage.setItem('panda-violin:child-name-v1', childName.trim());
            localStorage.setItem('CHILD_NAME_KEY', childName.trim());
        }
        if (step?.id === 'parentSetup' && parentPin.length === 4) {
            localStorage.setItem('PARENT_PIN_KEY', btoa(parentPin));
        }
        if (currentStep < totalSteps - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handlePinInput = (num) => {
        if (parentPin.length < 4) setParentPin(parentPin + num);
    };

    const handlePinDelete = () => {
        setParentPin(parentPin.slice(0, -1));
    };

    const finishOnboarding = () => {
        try {
            if (childName.trim()) {
                localStorage.setItem('emerson_violin_child_name', childName.trim());
                // Also set the new V2 key for consistency
                localStorage.setItem('panda-violin:child-name-v1', childName.trim());
                localStorage.setItem('CHILD_NAME_KEY', childName.trim());
            }
            if (parentPin.length === 4) {
                // In a real app we'd crypto-hash this.
                localStorage.setItem('PARENT_PIN_KEY', btoa(parentPin));
            } else if (!localStorage.getItem('PARENT_PIN_KEY')) {
                // Default PIN
                localStorage.setItem('PARENT_PIN_KEY', btoa('1234'));
            }
            localStorage.setItem('onboarding-complete', 'true');

            // Voice priming: prime speechSynthesis on user gesture (spec line 372)
            try {
                if ('speechSynthesis' in window) {
                    const utt = new SpeechSynthesisUtterance('');
                    utt.volume = 0;
                    window.speechSynthesis.speak(utt);
                }
            } catch (_) { /* ignore */ }
        } catch (e) {
            console.error("Storage error during onboarding finish", e);
        }

        if (onComplete) {
            onComplete();
        } else {
            navigate('/home', { replace: true });
        }
    };

    const currentStepData = steps[currentStep];

    return (
        <section
            className={`view is-active ${styles.onboardingView}`}
            style={{
                display: 'block',
                backgroundColor: currentStepData.isChildFacing ? 'var(--color-bg)' : 'var(--color-bg-alt)',
                fontFamily: currentStepData.isChildFacing ? 'var(--font-display)' : 'var(--font-body)'
            }}
        >
            <div className={styles.onboardingCarousel} style={{ transform: `translateX(-${currentStep * 100}%)`, display: 'flex', transition: 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)' }}>

                {/* Step Header (rendered outside carousel, overlays sliding content) */}
                <header className={styles.onboardingHeader}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ pointerEvents: 'auto' }}>
                            {currentStep > 0 && (
                                <button className="btn btn-ghost" onClick={handleBack} style={{ padding: '8px 16px', minHeight: '44px' }}>
                                    ← Back
                                </button>
                            )}
                        </div>
                        <div className={styles.onboardingProgressDots}>
                            {steps.map((s, idx) => (
                                <span key={idx} style={{
                                    width: '12px', height: '12px', borderRadius: '50%',
                                    backgroundColor: idx === currentStep ? 'var(--color-primary)' : 'var(--color-surface)',
                                    border: idx === currentStep ? 'none' : '2px solid var(--color-primary)',
                                    display: 'inline-block',
                                    transition: 'all 0.3s ease'
                                }}></span>
                            ))}
                        </div>
                    </div>
                </header>

                {steps.map((step) => {
                    switch (step.id) {
                        case 'welcome':
                            return (
                                <div key={step.id} className={styles.onboardingSlide}>
                                    <picture>
                                        <source srcSet={getPublicAssetPath('./assets/illustrations/mascot-happy.webp')} type="image/webp" />
                                        <img src={getPublicAssetPath('./assets/illustrations/mascot-happy.webp')} alt="Panda waving hello" width="1024" height="1024" style={{ width: '100%', maxWidth: '400px', height: 'auto', objectFit: 'contain' }} loading="eager" />
                                    </picture>
                                    <h2 style={{ fontSize: '2.5rem', textAlign: 'center', margin: 'var(--space-4) 0 var(--space-2)' }}>Hi! I'm Panda.</h2>
                                    <p style={{ fontSize: '1.5rem', textAlign: 'center', marginBottom: 'var(--space-6)', padding: '0 var(--space-4)', color: 'var(--color-text-muted)' }}>Let's learn violin together!</p>
                                    <button className="btn btn-primary btn-giant" style={{ width: '80%', maxWidth: '300px' }} onClick={handleNext}>▶ Let's Go!</button>
                                </div>
                            );

                        case 'name':
                            return (
                                <div key={step.id} className={styles.onboardingSlide}>
                                    <picture>
                                        <source srcSet={getPublicAssetPath('./assets/illustrations/mascot-focus.webp')} type="image/webp" />
                                        <img src={getPublicAssetPath('./assets/illustrations/mascot-focus.webp')} alt="Panda asking name" style={{ width: '100%', maxWidth: '300px', height: 'auto', objectFit: 'contain' }} loading="lazy" />
                                    </picture>
                                    <h2 style={{ fontSize: '2rem', textAlign: 'center', margin: 'var(--space-4) 0 var(--space-2)' }}>What's your name?</h2>
                                    <input
                                        type="text"
                                        value={childName}
                                        onChange={(e) => setChildName(e.target.value)}
                                        placeholder="Your Name"
                                        style={{
                                            fontSize: '1.8rem', padding: '16px', borderRadius: 'var(--radius-xl)',
                                            border: '2px solid var(--color-primary)', width: '80%', maxWidth: '300px',
                                            textAlign: 'center', margin: 'var(--space-4) 0', fontFamily: 'var(--font-display)',
                                            boxShadow: 'var(--shadow-sm)'
                                        }}
                                        autoComplete="off"
                                        autoCorrect="off" // No spell check for names
                                    />
                                    <button className="btn btn-primary btn-giant" style={{ width: '80%', maxWidth: '300px' }} onClick={handleNext} disabled={!childName.trim()}>Next →</button>
                                </div>
                            );

                        case 'parentSetup':
                            return (
                                <div key={step.id} className={styles.onboardingSlide}>
                                    <h2 style={{ fontSize: '1.8rem', textAlign: 'center', marginBottom: 'var(--space-2)' }}>For grown-ups:</h2>
                                    <p style={{ fontSize: '1.1rem', textAlign: 'center', marginBottom: 'var(--space-5)', color: 'var(--color-text-muted)', maxWidth: '400px' }}>
                                        Set a 4-digit PIN so only you can access the Parent Zone settings, recordings, and tools.
                                    </p>

                                    <div style={{ display: 'flex', gap: '16px', marginBottom: 'var(--space-6)' }}>
                                        {[0, 1, 2, 3].map(i => (
                                            <div key={i} style={{
                                                width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--color-surface)',
                                                border: '2px solid var(--color-brand-brown)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}>
                                                {parentPin[i] ? <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: 'var(--color-brand-brown)' }}></div> : null}
                                            </div>
                                        ))}
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', maxWidth: '280px', width: '100%', marginBottom: 'var(--space-6)' }}>
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                            <button key={num} className="btn" style={{
                                                backgroundColor: 'var(--color-surface)', border: '1px solid rgba(0,0,0,0.1)',
                                                fontSize: '1.5rem', borderRadius: 'var(--radius-lg)', padding: '16px 0', boxShadow: 'var(--shadow-sm)'
                                            }} onClick={() => handlePinInput(num.toString())}>{num}</button>
                                        ))}
                                        <div></div>
                                        <button className="btn" style={{
                                            backgroundColor: 'var(--color-surface)', border: '1px solid rgba(0,0,0,0.1)',
                                            fontSize: '1.5rem', borderRadius: 'var(--radius-lg)', padding: '16px 0', boxShadow: 'var(--shadow-sm)'
                                        }} onClick={() => handlePinInput('0')}>0</button>
                                        <button className="btn" style={{
                                            backgroundColor: 'var(--color-surface)', border: '1px solid rgba(0,0,0,0.1)',
                                            fontSize: '1.5rem', borderRadius: 'var(--radius-lg)', padding: '16px 0', color: 'var(--color-brand-brown)',
                                            boxShadow: 'var(--shadow-sm)'
                                        }} onClick={handlePinDelete}>⌫</button>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '80%', maxWidth: '300px' }}>
                                        <button className="btn btn-primary" onClick={handleNext} disabled={parentPin.length > 0 && parentPin.length < 4}>
                                            {parentPin.length === 4 ? "Save PIN" : (parentPin.length === 0 ? "Skip for now" : "Enter 4 digits")}
                                        </button>
                                    </div>
                                </div>
                            );

                        case 'install':
                            return (
                                <div key={step.id} className={styles.onboardingSlide}>
                                    <div style={{ background: 'var(--color-surface)', padding: 'var(--space-5)', borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-lg)', textAlign: 'center', maxWidth: '360px', width: '100%' }}>
                                        <div style={{ background: 'var(--color-bg-alt)', width: '72px', height: '72px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-4)' }}>
                                            <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.5" width="40" height="40">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                        </div>
                                        <h2 style={{ fontSize: '1.8rem', marginBottom: 'var(--space-2)' }}>Add to Home Screen</h2>
                                        <p style={{ fontSize: '1.1rem', marginBottom: 'var(--space-5)', color: 'var(--color-text-muted)' }}>
                                            For the best experience without internet, tap the <strong>Share</strong> button and select <strong>Add to Home Screen</strong>.
                                        </p>
                                        <button className="btn btn-primary" style={{ width: '100%', marginBottom: 'var(--space-3)' }} onClick={handleNext}>Got it!</button>
                                        <button className="btn btn-ghost" style={{ width: '100%' }} onClick={handleNext}>Maybe later</button>
                                    </div>
                                </div>
                            );

                        case 'ready':
                            return (
                                <div key={step.id} className={styles.onboardingSlide}>
                                    <picture>
                                        <source srcSet={getPublicAssetPath('./assets/illustrations/mascot-celebrate.webp')} type="image/webp" />
                                        <img src={getPublicAssetPath('./assets/illustrations/mascot-celebrate.webp')} alt="Panda celebrating" style={{ width: '100%', maxWidth: '400px', height: 'auto', objectFit: 'contain' }} loading="lazy" />
                                    </picture>
                                    <h2 style={{ fontSize: '2.5rem', textAlign: 'center', margin: 'var(--space-4) 0 var(--space-2)' }}>Let's Get Started!</h2>
                                    <p style={{ fontSize: '1.5rem', textAlign: 'center', marginBottom: 'var(--space-6)', padding: '0 var(--space-4)', color: 'var(--color-text-muted)' }}>
                                        {childName ? `${childName}, your ` : 'Your '} first mission is ready! Let's warm up and play a song.
                                    </p>
                                    <button className="btn btn-primary btn-giant" style={{ width: '80%', maxWidth: '340px' }} onClick={finishOnboarding}>▶ Start First Mission</button>
                                </div>
                            );
                        default:
                            return null;
                    }
                })}

            </div>
        </section>
    );
}
