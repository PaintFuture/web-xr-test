// ── Quantum VR Audio System ──────────────────────────────
// Procedural audio via Web Audio API — no external files needed.
// All sounds are synthesized: ambient drone, UI feedback, effects.

(function () {
    const QAudio = {};
    window.QAudio = QAudio;

    let ctx = null;
    let masterGain = null;
    let ambientGain = null;
    let sfxGain = null;
    let ambientNodes = [];
    let ambientRunning = false;

    // Lazy-init AudioContext (must happen after user gesture)
    QAudio.init = function () {
        if (ctx) return;
        ctx = new (window.AudioContext || window.webkitAudioContext)();

        masterGain = ctx.createGain();
        masterGain.gain.value = 0.7;
        masterGain.connect(ctx.destination);

        ambientGain = ctx.createGain();
        ambientGain.gain.value = 0.0; // fade in
        ambientGain.connect(masterGain);

        sfxGain = ctx.createGain();
        sfxGain.gain.value = 0.5;
        sfxGain.connect(masterGain);
    };

    QAudio.resume = function () {
        if (ctx && ctx.state === "suspended") ctx.resume();
    };

    // ── AMBIENT: layered space drone ─────────────────────

    QAudio.startAmbient = function () {
        if (!ctx || ambientRunning) return;
        ambientRunning = true;

        const now = ctx.currentTime;

        // Layer 1: deep sub-bass drone (slow LFO modulation)
        const sub = ctx.createOscillator();
        sub.type = "sine";
        sub.frequency.value = 55; // A1
        const subGain = ctx.createGain();
        subGain.gain.value = 0.12;
        sub.connect(subGain);
        subGain.connect(ambientGain);

        // LFO on sub frequency for gentle movement
        const subLfo = ctx.createOscillator();
        subLfo.type = "sine";
        subLfo.frequency.value = 0.03; // very slow
        const subLfoGain = ctx.createGain();
        subLfoGain.gain.value = 3;
        subLfo.connect(subLfoGain);
        subLfoGain.connect(sub.frequency);
        subLfo.start(now);

        // Layer 2: mid-range pad (fifth harmony)
        const pad1 = ctx.createOscillator();
        pad1.type = "sine";
        pad1.frequency.value = 82.5; // E2-ish
        const pad1Gain = ctx.createGain();
        pad1Gain.gain.value = 0.06;
        pad1.connect(pad1Gain);
        pad1Gain.connect(ambientGain);

        // Layer 3: higher harmonic shimmer
        const pad2 = ctx.createOscillator();
        pad2.type = "sine";
        pad2.frequency.value = 165; // E3
        const pad2Gain = ctx.createGain();
        pad2Gain.gain.value = 0.03;
        const pad2Filter = ctx.createBiquadFilter();
        pad2Filter.type = "lowpass";
        pad2Filter.frequency.value = 400;
        pad2.connect(pad2Filter);
        pad2Filter.connect(pad2Gain);
        pad2Gain.connect(ambientGain);

        // LFO on pad2 filter for shimmer
        const shimmerLfo = ctx.createOscillator();
        shimmerLfo.type = "sine";
        shimmerLfo.frequency.value = 0.07;
        const shimmerLfoGain = ctx.createGain();
        shimmerLfoGain.gain.value = 200;
        shimmerLfo.connect(shimmerLfoGain);
        shimmerLfoGain.connect(pad2Filter.frequency);
        shimmerLfo.start(now);

        // Layer 4: filtered noise — "air" texture
        const noiseLen = ctx.sampleRate * 4;
        const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
        const noiseData = noiseBuf.getChannelData(0);
        for (let i = 0; i < noiseLen; i++) {
            noiseData[i] = (Math.random() * 2 - 1);
        }
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuf;
        noise.loop = true;
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = "bandpass";
        noiseFilter.frequency.value = 300;
        noiseFilter.Q.value = 0.5;
        const noiseGain = ctx.createGain();
        noiseGain.gain.value = 0.015;
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(ambientGain);

        // Slow sweep on noise filter
        const noiseLfo = ctx.createOscillator();
        noiseLfo.type = "sine";
        noiseLfo.frequency.value = 0.02;
        const noiseLfoGain = ctx.createGain();
        noiseLfoGain.gain.value = 150;
        noiseLfo.connect(noiseLfoGain);
        noiseLfoGain.connect(noiseFilter.frequency);
        noiseLfo.start(now);

        // Start all
        sub.start(now);
        pad1.start(now);
        pad2.start(now);
        noise.start(now);

        // Fade in over 3 seconds
        ambientGain.gain.setValueAtTime(0, now);
        ambientGain.gain.linearRampToValueAtTime(0.8, now + 3);

        ambientNodes = [sub, subLfo, pad1, pad2, shimmerLfo, noise, noiseLfo,
                        subGain, pad1Gain, pad2Gain, pad2Filter, noiseFilter, noiseGain,
                        subLfoGain, shimmerLfoGain, noiseLfoGain];
    };

    QAudio.stopAmbient = function () {
        if (!ambientRunning) return;
        ambientRunning = false;
        const now = ctx.currentTime;
        ambientGain.gain.linearRampToValueAtTime(0, now + 1);
        setTimeout(() => {
            ambientNodes.forEach(n => { try { n.stop ? n.stop() : null; } catch(e){} try { n.disconnect(); } catch(e){} });
            ambientNodes = [];
        }, 1200);
    };

    // ── SOUND EFFECTS ────────────────────────────────────

    // Scene transition: soft filtered sweep
    QAudio.playTransition = function () {
        if (!ctx) return;
        QAudio.resume();
        const now = ctx.currentTime;

        // Rising sweep
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.6);

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(600, now);
        filter.frequency.linearRampToValueAtTime(2000, now + 0.3);
        filter.frequency.linearRampToValueAtTime(300, now + 0.6);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
        gain.gain.linearRampToValueAtTime(0.06, now + 0.3);
        gain.gain.linearRampToValueAtTime(0, now + 0.6);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(sfxGain);
        osc.start(now);
        osc.stop(now + 0.7);
    };

    // Particle spawn: short chirp
    QAudio.playParticleSpawn = function () {
        if (!ctx) return;
        QAudio.resume();
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.15);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.connect(gain);
        gain.connect(sfxGain);
        osc.start(now);
        osc.stop(now + 0.25);
    };

    // Button press / interaction: gentle ping
    QAudio.playPing = function () {
        if (!ctx) return;
        QAudio.resume();
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = 660;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(gain);
        gain.connect(sfxGain);
        osc.start(now);
        osc.stop(now + 0.2);
    };

    // Scene loaded: two-note chime (ascending minor third)
    QAudio.playSceneChime = function () {
        if (!ctx) return;
        QAudio.resume();
        const now = ctx.currentTime;

        [523.25, 659.25].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = "sine";
            const t = now + i * 0.12;

            osc.frequency.value = freq;

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.06, t + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

            osc.connect(gain);
            gain.connect(sfxGain);
            osc.start(t);
            osc.stop(t + 0.45);
        });
    };

    // Interaction hit (trigger ray picks something): soft click
    QAudio.playClick = function () {
        if (!ctx) return;
        QAudio.resume();
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        osc.type = "square";
        osc.frequency.value = 1000;

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 1500;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(sfxGain);
        osc.start(now);
        osc.stop(now + 0.06);
    };

    // ── VOLUME CONTROLS ──────────────────────────────────

    QAudio.setMasterVolume = function (v) {
        if (masterGain) masterGain.gain.value = Math.max(0, Math.min(1, v));
    };

    QAudio.setAmbientVolume = function (v) {
        if (ambientGain) ambientGain.gain.value = Math.max(0, Math.min(1, v));
    };

    QAudio.setSfxVolume = function (v) {
        if (sfxGain) sfxGain.gain.value = Math.max(0, Math.min(1, v));
    };

    QAudio.getMasterVolume = function () {
        return masterGain ? masterGain.gain.value : 0.7;
    };

    QAudio.isMuted = function () {
        return masterGain && masterGain.gain.value === 0;
    };

    QAudio.toggleMute = function () {
        if (!masterGain) return;
        if (masterGain.gain.value > 0) {
            QAudio._prevVolume = masterGain.gain.value;
            masterGain.gain.value = 0;
        } else {
            masterGain.gain.value = QAudio._prevVolume || 0.7;
        }
    };
})();
