import React, { useState, useEffect } from 'react';
import { Typography } from '../primitives/Typography.jsx';
import { Button } from '../primitives/Button.jsx';

export function PermissionGate({ permissionType = 'microphone', required = true, onGranted, children }) {
    const [status, setStatus] = useState('checking'); // 'checking', 'prompt', 'granted', 'denied'

    // E2E: skip all permission flows during automated tests
    const isE2ESkip = typeof localStorage !== 'undefined' && localStorage.getItem('e2e-skip-permissions') === 'true';

    useEffect(() => {
        if (isE2ESkip) {
            if (onGranted) setTimeout(onGranted, 0);
            return;
        }

        let mounted = true;

        const applyState = (state) => {
            if (!mounted) return;
            if (state === 'granted') {
                setStatus('granted');
                onGranted?.();
            } else if (state === 'denied') {
                setStatus('denied');
            } else {
                setStatus('prompt');
            }
        };

        const checkStatus = async () => {
            try {
                const permName = permissionType === 'microphone' ? 'microphone' : 'camera';
                const res = await navigator.permissions.query({ name: permName });
                applyState(res.state);
                res.onchange = () => applyState(res.state);
            } catch {
                // Safari sometimes doesn't support generic permission queries
                if (mounted) setStatus('prompt');
            }
        };

        checkStatus();
        return () => { mounted = false; };
    }, [permissionType, onGranted, isE2ESkip]);

    if (isE2ESkip) return <>{children}</>;

    const requestPermission = async () => {
        try {
            const constraints = permissionType === 'microphone' ? { audio: true } : { video: true };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            stream.getTracks().forEach(track => track.stop());
            setStatus('granted');
            onGranted?.();
        } catch (err) {
            console.error(`User denied ${permissionType} permission:`, err);
            setStatus('denied');
        }
    };

    if (status === 'granted' || !required) {
        return <>{children}</>;
    }

    if (status === 'checking') {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', padding: '24px' }}>
                <Typography variant="body">Checking permissions...</Typography>
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            padding: '24px',
            textAlign: 'center',
            background: 'var(--color-bg)'
        }}>
            <picture>
                <source srcSet="./assets/illustrations/mascot-focus.webp" type="image/webp" />
                <img src="./assets/illustrations/mascot-focus.webp" alt="Panda asking to listen" style={{ width: '200px', marginBottom: '24px' }} decoding="async" loading="eager" data-permission-mascot />
            </picture>

            <Typography variant="h2" style={{ marginBottom: '16px' }}>
                {permissionType === 'microphone' ? "Panda Needs to Hear You!" : "Panda Needs to See You!"}
            </Typography>

            <Typography variant="body" style={{ marginBottom: '32px', maxWidth: '400px', color: 'var(--color-text-muted)' }}>
                {permissionType === 'microphone'
                    ? "To give you feedback on your playing, the app needs access to your microphone. We never record or save your audio without your permission."
                    : "To check your posture, the app needs camera access. The video never leaves your device."}
            </Typography>

            {status === 'denied' ? (
                <div style={{ background: 'rgba(255,59,48,0.1)', padding: '16px', borderRadius: '12px', color: '#FF3B30' }}>
                    <Typography variant="h4" style={{ marginBottom: '8px' }}>Permission Denied</Typography>
                    <Typography variant="body">Please open your browser settings and allow {permissionType} access to use this feature.</Typography>
                </div>
            ) : (
                <Button variant="primary" size="giant" onClick={requestPermission} style={{ minWidth: '200px' }}>
                    Grant Access
                </Button>
            )}
        </div>
    );
}
