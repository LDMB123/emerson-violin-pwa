import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pinStateMocks = vi.hoisted(() => ({
    loadPinData: vi.fn(),
    normalizePin: vi.fn((value) => (value || '').replace(/\D/g, '').slice(0, 4)),
    savePinData: vi.fn(),
}));

const pinCryptoMocks = vi.hoisted(() => ({
    verifyPin: vi.fn(),
}));

vi.mock('../../src/parent/pin-state.js', () => pinStateMocks);
vi.mock('../../src/parent/pin-crypto.js', () => pinCryptoMocks);

import { ParentView } from '../../src/views/Parent/ParentView.jsx';

describe('ParentView', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.sessionStorage.clear();
        pinStateMocks.loadPinData.mockRejectedValue(new Error('load failed'));
    });

    it('fails closed when the saved PIN cannot be loaded', async () => {
        render(
            <MemoryRouter>
                <ParentView />
            </MemoryRouter>,
        );

        expect(await screen.findByText('Parent Zone unavailable')).toBeInTheDocument();
        expect(screen.getByText('We could not load the Parent Zone lock. Refresh and try again.')).toBeInTheDocument();
        expect(screen.getByLabelText('Parent PIN')).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Reload required' })).toBeDisabled();
        expect(pinStateMocks.savePinData).not.toHaveBeenCalled();
    });
});
