const wireFallback = () => {
  const start = document.querySelector('[data-session-start]');
  const pause = document.querySelector('[data-session-pause]');
  const finish = document.querySelector('[data-session-finish]');
  const status = document.querySelector('[data-session-status]');
  if (!start || !status) {
    return;
  }

  if (!start.hasAttribute('disabled')) {
    return;
  }

  start.removeAttribute('disabled');
  pause?.removeAttribute('disabled');
  finish?.removeAttribute('disabled');

  let running = false;
  const setStatus = (text) => {
    status.textContent = text;
  };

  start.addEventListener('click', () => {
    running = true;
    setStatus('Session running');
  });

  pause?.addEventListener('click', () => {
    if (running) {
      running = false;
      setStatus('Session paused');
    }
  });

  finish?.addEventListener('click', () => {
    running = false;
    setStatus('Session saved');
  });
};

window.addEventListener('DOMContentLoaded', () => {
  setTimeout(wireFallback, 1500);
});
