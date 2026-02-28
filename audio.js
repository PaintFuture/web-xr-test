// ── Quantum VR Audio System ──────────────────────────────
// Procedural audio via Web Audio API — no external files needed.
// Pre-renders ambient to a buffer to minimize real-time CPU cost.

(function () {
    const QAudio = {};
    window.QAudio = QAudio;

    let ctx = null;
    let masterGain = null;
    let ambientGain = null;
    let sfxGain = null;
    let ambientSource = null;
    let sparkleInterval = null;
    let ambientRunning = false;

    QAudio.init = function () {
        if (ctx) return;
        ctx = new (window.AudioContext || window.webkitAudioContext)();

        masterGain = ctx.createGain();
        masterGain.gain.value = 0.7;
        masterGain.connect(ctx.destination);

        ambientGain = ctx.createGain();
        ambientGain.gain.value = 0.0;
        ambientGain.connect(masterGain);

        sfxGain = ctx.createGain();
        sfxGain.gain.value = 0.5;
        sfxGain.connect(masterGain);
    };

    QAudio.resume = function () {
        if (ctx && ctx.state === "suspended") ctx.resume();
    };

    // ── Pre-render ambient drone into a buffer ───────────
    // Renders offline so zero real-time CPU cost for the drone.
    function renderAmbientBuffer(callback) {
        var dur = 16; // 16-second loop
        var sr = ctx.sampleRate;
        var len = sr * dur;
        var offline = new OfflineAudioContext(2, len, sr);

        // Layer 1: sub-bass drone with slow wobble
        var sub = offline.createOscillator();
        sub.type = "sine";
        sub.frequency.value = 55;
        for (var t = 0; t < dur; t += 0.5) {
            sub.frequency.setValueAtTime(55 + Math.sin(t * 0.4) * 2, t);
        }
        var subG = offline.createGain();
        subG.gain.value = 0.10;
        sub.connect(subG);
        subG.connect(offline.destination);

        // Layer 2: fifth harmony pad
        var pad = offline.createOscillator();
        pad.type = "sine";
        pad.frequency.value = 82.5;
        var padG = offline.createGain();
        padG.gain.value = 0.05;
        pad.connect(padG);
        padG.connect(offline.destination);

        // Layer 3: shimmer with filter sweep
        var shim = offline.createOscillator();
        shim.type = "sine";
        shim.frequency.value = 165;
        var shimFilter = offline.createBiquadFilter();
        shimFilter.type = "lowpass";
        shimFilter.Q.value = 1;
        for (var t2 = 0; t2 < dur; t2 += 0.2) {
            shimFilter.frequency.setValueAtTime(250 + Math.sin(t2 * 0.44) * 180, t2);
        }
        var shimG = offline.createGain();
        shimG.gain.value = 0.025;
        shim.connect(shimFilter);
        shimFilter.connect(shimG);
        shimG.connect(offline.destination);

        // Layer 4: filtered noise texture
        var noiseBuf = offline.createBuffer(1, len, sr);
        var nd = noiseBuf.getChannelData(0);
        for (var i = 0; i < len; i++) nd[i] = Math.random() * 2 - 1;
        var noise = offline.createBufferSource();
        noise.buffer = noiseBuf;
        var nf = offline.createBiquadFilter();
        nf.type = "bandpass";
        nf.frequency.value = 300;
        nf.Q.value = 0.4;
        for (var t3 = 0; t3 < dur; t3 += 0.3) {
            nf.frequency.setValueAtTime(250 + Math.sin(t3 * 0.13) * 120, t3);
        }
        var ng = offline.createGain();
        ng.gain.value = 0.012;
        noise.connect(nf);
        nf.connect(ng);
        ng.connect(offline.destination);

        // Layer 5: baked sparkle — random high pings scattered throughout
        for (var s = 0; s < 30; s++) {
            var st = Math.random() * dur;
            var freq = 1200 + Math.random() * 3000;
            var o = offline.createOscillator();
            o.type = "sine";
            o.frequency.value = freq;
            var g = offline.createGain();
            g.gain.setValueAtTime(0, st);
            g.gain.linearRampToValueAtTime(0.015 + Math.random() * 0.01, st + 0.005);
            g.gain.exponentialRampToValueAtTime(0.0001, st + 0.08 + Math.random() * 0.15);
            var hpf = offline.createBiquadFilter();
            hpf.type = "highpass";
            hpf.frequency.value = 1000;
            o.connect(hpf);
            hpf.connect(g);
            g.connect(offline.destination);
            o.start(st);
            o.stop(st + 0.3);
        }

        sub.start(0);
        pad.start(0);
        shim.start(0);
        noise.start(0);

        offline.startRendering().then(callback);
    }

    // ── AMBIENT ──────────────────────────────────────────

    QAudio.startAmbient = function () {
        if (!ctx || ambientRunning) return;
        ambientRunning = true;

        renderAmbientBuffer(function (buffer) {
            if (!ambientRunning) return;
            ambientSource = ctx.createBufferSource();
            ambientSource.buffer = buffer;
            ambientSource.loop = true;
            ambientSource.connect(ambientGain);
            ambientSource.start();

            var now = ctx.currentTime;
            ambientGain.gain.setValueAtTime(0, now);
            ambientGain.gain.linearRampToValueAtTime(0.9, now + 3);
        });

        // Live sparkle: random pings at irregular intervals on top of baked ones
        startLiveSparkle();
    };

    function startLiveSparkle() {
        if (sparkleInterval) return;
        function scheduleSparkle() {
            if (!ambientRunning) { sparkleInterval = null; return; }
            playSparkle();
            sparkleInterval = setTimeout(scheduleSparkle, 1500 + Math.random() * 3500);
        }
        sparkleInterval = setTimeout(scheduleSparkle, 2000);
    }

    function playSparkle() {
        if (!ctx) return;
        var now = ctx.currentTime;
        var count = 1 + Math.floor(Math.random() * 3);
        for (var i = 0; i < count; i++) {
            var t = now + i * (0.06 + Math.random() * 0.08);
            var freq = 2000 + Math.random() * 4000;
            var osc = ctx.createOscillator();
            osc.type = "sine";
            osc.frequency.value = freq;
            var g = ctx.createGain();
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.012 + Math.random() * 0.008, t + 0.003);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06 + Math.random() * 0.1);
            osc.connect(g);
            g.connect(ambientGain);
            osc.start(t);
            osc.stop(t + 0.2);
        }
    }

    QAudio.stopAmbient = function () {
        if (!ambientRunning) return;
        ambientRunning = false;
        if (sparkleInterval) { clearTimeout(sparkleInterval); sparkleInterval = null; }
        var now = ctx.currentTime;
        ambientGain.gain.linearRampToValueAtTime(0, now + 1);
        setTimeout(function () {
            if (ambientSource) { try { ambientSource.stop(); } catch(e){} ambientSource = null; }
        }, 1200);
    };

    // ── SOUND EFFECTS ────────────────────────────────────

    QAudio.playTransition = function () {
        if (!ctx) return;
        QAudio.resume();
        var now = ctx.currentTime;

        var osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.6);

        var filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(600, now);
        filter.frequency.linearRampToValueAtTime(2000, now + 0.3);
        filter.frequency.linearRampToValueAtTime(300, now + 0.6);

        var gain = ctx.createGain();
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

    QAudio.playParticleSpawn = function () {
        if (!ctx) return;
        QAudio.resume();
        var now = ctx.currentTime;

        var osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.15);

        var gain = ctx.createGain();
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.connect(gain);
        gain.connect(sfxGain);
        osc.start(now);
        osc.stop(now + 0.25);
    };

    QAudio.playPing = function () {
        if (!ctx) return;
        QAudio.resume();
        var now = ctx.currentTime;

        var osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = 660;

        var gain = ctx.createGain();
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(gain);
        gain.connect(sfxGain);
        osc.start(now);
        osc.stop(now + 0.2);
    };

    QAudio.playSceneChime = function () {
        if (!ctx) return;
        QAudio.resume();
        var now = ctx.currentTime;

        [523.25, 659.25].forEach(function (freq, i) {
            var osc = ctx.createOscillator();
            osc.type = "sine";
            var t = now + i * 0.12;
            osc.frequency.value = freq;

            var gain = ctx.createGain();
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.06, t + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

            osc.connect(gain);
            gain.connect(sfxGain);
            osc.start(t);
            osc.stop(t + 0.45);
        });
    };

    QAudio.playClick = function () {
        if (!ctx) return;
        QAudio.resume();
        var now = ctx.currentTime;

        var osc = ctx.createOscillator();
        osc.type = "square";
        osc.frequency.value = 1000;

        var filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 1500;

        var gain = ctx.createGain();
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
