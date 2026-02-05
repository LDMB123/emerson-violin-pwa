(() => {
  let running = false;
  let stream = null;
  let video = null;
  let landmarker = null;
  let useMediaPipe = false;
  let lastOrientation = { beta: 0, gamma: 0 };

  function emitSample(confidence, bowAngle, posture) {
    const detail = { confidence, bow_angle: bowAngle, posture };
    window.dispatchEvent(new CustomEvent('pose-sample', { detail }));
  }

  function handleOrientation(event) {
    if (typeof event.beta === 'number') lastOrientation.beta = event.beta;
    if (typeof event.gamma === 'number') lastOrientation.gamma = event.gamma;
  }

  async function setupMediaPipe() {
    if (!window.PoseLandmarker || !window.FilesetResolver) return false;
    try {
      const modelPath = './assets/models/pose_landmarker.task';
      try {
        const resp = await fetch(modelPath, { cache: 'force-cache' });
        if (!resp.ok) return false;
      } catch (err) {
        return false;
      }

      const vision = await window.FilesetResolver.forVisionTasks('./assets/models');
      landmarker = await window.PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: modelPath
        },
        runningMode: 'VIDEO',
        numPoses: 1
      });
      return true;
    } catch (err) {
      console.warn('[pose] MediaPipe init failed', err);
      landmarker = null;
      return false;
    }
  }

  async function start() {
    if (running) return true;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
    } catch (err) {
      console.warn('[pose] camera unavailable', err);
      return false;
    }

    video = document.createElement('video');
    video.playsInline = true;
    video.muted = true;
    video.srcObject = stream;
    try {
      await video.play();
    } catch (err) {
      console.warn('[pose] video play failed', err);
    }

    useMediaPipe = await setupMediaPipe();
    if ('DeviceOrientationEvent' in window) {
      window.addEventListener('deviceorientation', handleOrientation, { passive: true });
    }

    running = true;
    requestAnimationFrame(loop);
    return true;
  }

  function stop() {
    running = false;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    stream = null;
    if (video) {
      video.srcObject = null;
    }
    video = null;
    landmarker = null;
    window.removeEventListener('deviceorientation', handleOrientation);
    return true;
  }

  let lastInfer = 0;
  function loop() {
    if (!running || !video) return;
    const now = performance.now();
    let confidence = 0.7;
    let bowAngle = lastOrientation.beta || 0;
    let posture = 70;

    if (useMediaPipe && landmarker && now - lastInfer > 66) {
      lastInfer = now;
      const result = landmarker.detectForVideo(video, now);
      if (result && result.landmarks && result.landmarks[0]) {
        const lm = result.landmarks[0];
        const leftWrist = lm[15];
        const rightWrist = lm[16];
        const leftShoulder = lm[11];
        const rightShoulder = lm[12];
        if (leftWrist && rightWrist && leftShoulder && rightShoulder) {
          const dx = rightWrist.x - leftWrist.x;
          const dy = rightWrist.y - leftWrist.y;
          bowAngle = Math.atan2(dy, dx) * (180 / Math.PI);
          const shoulderSpan = Math.abs(rightShoulder.y - leftShoulder.y);
          posture = Math.max(0, Math.min(100, 100 - shoulderSpan * 120));
          confidence = result.landmarks[0][0].visibility || 0.8;
        }
      }
    }

    emitSample(confidence, bowAngle, posture);
    requestAnimationFrame(loop);
  }

  window.EmersonPose = { start, stop };
})();
