import { describe, expect, it, vi } from 'vitest';
import {
    bindInteractiveLabelKeys,
    prepareInteractiveLabels,
    setupPopoverSystem,
} from '../../src/app/ui-interactions.js';

describe('app/ui-interactions', () => {
    it('marks interactive labels as keyboard-addressable buttons', () => {
        document.body.innerHTML = `
            <div class="toggle-ui">
                <label for="a">A</label>
            </div>
            <div class="other">
                <label for="b">B</label>
            </div>
        `;

        prepareInteractiveLabels(document);

        const interactive = document.querySelector('.toggle-ui label');
        const nonInteractive = document.querySelector('.other label');
        expect(interactive?.getAttribute('role')).toBe('button');
        expect(interactive?.getAttribute('tabindex')).toBe('0');
        expect(nonInteractive?.getAttribute('role')).toBeNull();
    });

    it('triggers click for Enter/Space on matching labels', () => {
        document.body.innerHTML = `
            <div class="song-controls">
                <label for="x">Play</label>
            </div>
            <label for="y" id="outside">Outside</label>
        `;
        bindInteractiveLabelKeys();

        const inScope = document.querySelector('.song-controls label');
        const outside = document.getElementById('outside');
        const inScopeClick = vi.spyOn(inScope, 'click');
        const outsideClick = vi.spyOn(outside, 'click');

        inScope.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
        outside.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));

        expect(inScopeClick).toHaveBeenCalledTimes(1);
        expect(outsideClick).not.toHaveBeenCalled();
    });

    it('binds popover triggers and syncs aria-expanded state', () => {
        document.body.innerHTML = `
            <button id="trigger" popovertarget="menu">Open</button>
            <div id="menu" popover>
                <button id="first-item">First</button>
            </div>
        `;

        const popover = document.getElementById('menu');
        const trigger = document.getElementById('trigger');
        const firstItem = document.getElementById('first-item');
        const triggerFocus = vi.spyOn(trigger, 'focus');
        const firstFocus = vi.spyOn(firstItem, 'focus');

        const nativeMatches = popover.matches.bind(popover);
        const openState = { value: false };
        popover.matches = vi.fn((selector) => (
            selector === ':popover-open' ? openState.value : nativeMatches(selector)
        ));

        const ctx = { lastPopoverTrigger: null };
        setupPopoverSystem(ctx);

        expect(trigger.getAttribute('aria-expanded')).toBe('false');
        trigger.click();
        expect(ctx.lastPopoverTrigger).toBe(trigger);

        openState.value = true;
        popover.dispatchEvent(new Event('toggle'));
        expect(trigger.getAttribute('aria-expanded')).toBe('true');
        expect(firstFocus).toHaveBeenCalled();

        openState.value = false;
        popover.dispatchEvent(new Event('toggle'));
        expect(trigger.getAttribute('aria-expanded')).toBe('false');
        expect(triggerFocus).toHaveBeenCalled();
    });
});
