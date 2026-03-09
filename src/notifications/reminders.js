import { PERSIST_APPLIED } from '../utils/event-names.js';
import { downloadFile, tryShareFile } from '../utils/recording-export.js';
import { createOnceBinder } from '../utils/lifecycle-utils.js';

let notificationToggle = null;
let reminderToggle = null;
let notificationStatusEl = null;
let reminderStatusEl = null;
let suppressNotificationChange = false;
const claimGlobalListenersBinding = createOnceBinder();

const hasNotifications = () => 'Notification' in window;

const resolveElements = () => {
    notificationToggle = document.querySelector('#setting-notifications');
    reminderToggle = document.querySelector('#parent-reminder-toggle');
    notificationStatusEl = document.querySelector('[data-notification-status]');
    reminderStatusEl = document.querySelector('[data-reminder-status]');
};

const updateNotificationStatus = (message) => {
    if (notificationStatusEl) notificationStatusEl.textContent = message;
};

const updateReminderStatus = (message) => {
    if (reminderStatusEl) reminderStatusEl.textContent = message;
};

const turnOffNotificationToggle = ({ disabled = false } = {}) => {
    if (!notificationToggle) return;
    notificationToggle.checked = false;
    notificationToggle.disabled = disabled;
};

const blockNotifications = (message) => {
    turnOffNotificationToggle({ disabled: true });
    updateNotificationStatus(message);
};

const formatICSDate = (date) => {
    const pad = (value) => String(value).padStart(2, '0');
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
};

const buildReminderICS = () => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(18, 0, 0, 0);
    if (start < now) {
        start.setDate(start.getDate() + 1);
    }
    const uid = `panda-violin-${Date.now()}@local`;
    const dtstamp = formatICSDate(now);
    const dtstart = formatICSDate(start);

    return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Panda Violin//EN',
        'CALSCALE:GREGORIAN',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART:${dtstart}`,
        'RRULE:FREQ=DAILY',
        'SUMMARY:Panda Violin Practice',
        'DESCRIPTION:Time for your violin practice session!',
        'END:VEVENT',
        'END:VCALENDAR',
    ].join('\n');
};

const shareICS = async () => {
    const ics = buildReminderICS();
    const file = new File([ics], 'panda-violin-reminder.ics', { type: 'text/calendar' });

    const shared = await tryShareFile(file, {
        title: 'Panda Violin Practice Reminder',
        text: 'Add a daily practice reminder to your calendar.',
    });
    if (shared) {
        return true;
    }

    downloadFile(file);
    return true;
};

const handleReminderToggle = async () => {
    if (!reminderToggle) return;
    if (reminderToggle.checked) {
        updateReminderStatus('Adding a daily reminder to your calendar…');
        try {
            await shareICS();
            updateReminderStatus('Reminder file ready. Add it to Calendar or Reminders.');
        } catch {
            updateReminderStatus('Reminder export failed. Use iPadOS Reminders or Calendar manually.');
        }
    } else {
        updateReminderStatus('Reminders are off. Remove the Calendar alert if you added one.');
    }
};

const showNotification = async () => {
    if (!hasNotifications()) {
        turnOffNotificationToggle();
        updateNotificationStatus('Notifications are unavailable on this device.');
        return;
    }

    let permission = 'default';
    try {
        permission = await Notification.requestPermission();
    } catch {
        turnOffNotificationToggle();
        updateNotificationStatus('Notification permission request failed.');
        return;
    }
    if (permission !== 'granted') {
        updateNotificationStatus('Notifications are blocked. Enable them in Settings.');
        if (notificationToggle) {
            suppressNotificationChange = true;
            notificationToggle.checked = false;
            notificationToggle.dispatchEvent(new Event('change', { bubbles: true }));
            suppressNotificationChange = false;
        }
        return;
    }

    const registration = await navigator.serviceWorker.getRegistration();
    if (registration?.showNotification) {
        await registration.showNotification('Panda Violin', {
            body: 'Notifications are enabled for practice reminders.',
            icon: getPublicAssetPath('./assets/icons/icon-192.png'),
        });
    } else {
        new Notification('Panda Violin', {
            body: 'Notifications are enabled for practice reminders.',
        });
    }
    updateNotificationStatus('Notifications are on.');
};

const handleNotificationToggle = () => {
    if (!notificationToggle) return;
    if (suppressNotificationChange) return;
    if (notificationToggle.checked) {
        updateNotificationStatus('Requesting notification permission…');
        showNotification();
    } else {
        updateNotificationStatus('Notifications are off.');
    }
};

const syncNotificationPermission = () => {
    if (!notificationToggle) return;
    if (!hasNotifications()) {
        blockNotifications('Notifications are unavailable on this device.');
        return;
    }

    if (Notification.permission === 'granted') {
        notificationToggle.disabled = false;
        updateNotificationStatus(notificationToggle.checked ? 'Notifications are on.' : 'Notifications are off.');
        return;
    }
    if (Notification.permission === 'denied') {
        blockNotifications('Notifications are blocked. Enable them in Settings.');
        return;
    }
    notificationToggle.disabled = false;
    notificationToggle.checked = false;
    updateNotificationStatus('Notifications are off. Toggle to request access.');
};

const syncStatuses = () => {
    syncNotificationPermission();
    if (reminderToggle) {
        updateReminderStatus(reminderToggle.checked
            ? 'Daily reminder is on. Tap again to export a new calendar reminder.'
            : 'Reminders are off. Enable to add a daily reminder.');
    }
};

const bindLocalListeners = () => {
    if (notificationToggle && notificationToggle.dataset.remindersBound !== 'true') {
        notificationToggle.dataset.remindersBound = 'true';
        notificationToggle.addEventListener('change', handleNotificationToggle);
    }

    if (reminderToggle && reminderToggle.dataset.remindersBound !== 'true') {
        reminderToggle.dataset.remindersBound = 'true';
        reminderToggle.addEventListener('change', handleReminderToggle);
    }
};

const initReminders = () => {
    resolveElements();
    bindLocalListeners();
    if (claimGlobalListenersBinding()) {
        document.addEventListener(PERSIST_APPLIED, syncStatuses);
    }
    syncStatuses();
};

/**
 * Initializes notification and reminder controls for practice nudges and calendar exports.
 */
export const init = initReminders;
import { getPublicAssetPath } from '../utils/public-asset-path.js';
