// Scene 3: Measurement & Collapse — probability cloud crystallizes
QVR.register({
    id: "measurement",
    title: "3. Measurement & Collapse",
    subtitle: "Click the probability cloud to collapse it into a definite state",
    info: "Before measurement, a qubit exists as a probability cloud — a fuzzy distribution of possible outcomes. The moment you observe it, the cloud collapses into a single definite particle. This is irreversible: the quantum information is destroyed. Repeated measurements build up a histogram showing the underlying probabilities. Notice how each individual result is random, but the pattern emerges over many trials.",

    async setup(scene, qvr) {
        qvr.createStarfield(scene);
        qvr.createLighting(scene);
        const gl = qvr.createGlow(scene);

        const camera = new BABYLON.ArcRotateCamera("cam", -Math.PI / 2, Math.PI / 3, 10, new BABYLON.Vector3(0, 2, 0), scene);
        camera.attachControl(qvr.canvas, true);

        const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 20, height: 20 }, scene);
        const gMat = new BABYLON.StandardMaterial("gMat", scene);
        gMat.diffuseColor = new BABYLON.Color3(0.05, 0.05, 0.12);
        gMat.alpha = 0.3;
        ground.material = gMat;

        // ── Probability cloud ──────────────────────────────────
        const cloudParent = new BABYLON.TransformNode("cloud", scene);
        cloudParent.position.y = 2.5;

        const cloudParticles = [];
        const CLOUD_COUNT = 60;
        for (let i = 0; i < CLOUD_COUNT; i++) {
            const p = BABYLON.MeshBuilder.CreateSphere("cp_" + i, { diameter: 0.12 + Math.random() * 0.15, segments: 8 }, scene);
            p.parent = cloudParent;
            const mat = new BABYLON.StandardMaterial("cpMat_" + i, scene);
            const hue = 0.55 + Math.random() * 0.15; // blue-purple range
            mat.diffuseColor = new BABYLON.Color3(hue * 0.5, hue * 0.3, 1);
            mat.emissiveColor = new BABYLON.Color3(hue * 0.2, hue * 0.1, 0.5);
            mat.alpha = 0.4 + Math.random() * 0.4;
            p.material = mat;
            gl.addIncludedOnlyMesh(p);

            // Random orbit parameters
            p._orbitR = 0.5 + Math.random() * 1.2;
            p._orbitSpeed = 0.5 + Math.random() * 1.5;
            p._orbitPhase = Math.random() * Math.PI * 2;
            p._orbitTilt = (Math.random() - 0.5) * Math.PI;
            p._baseAlpha = mat.alpha;
            cloudParticles.push(p);
        }

        // Collapsed particle (hidden initially)
        const collapsed = BABYLON.MeshBuilder.CreateSphere("collapsed", { diameter: 0.5, segments: 32 }, scene);
        collapsed.position = new BABYLON.Vector3(0, 2.5, 0);
        const collapsedMat = new BABYLON.StandardMaterial("collapsedMat", scene);
        collapsedMat.diffuseColor = new BABYLON.Color3(0.2, 0.8, 1);
        collapsedMat.emissiveColor = new BABYLON.Color3(0.1, 0.4, 0.6);
        collapsedMat.specularPower = 64;
        collapsed.material = collapsedMat;
        collapsed.isVisible = false;
        gl.addIncludedOnlyMesh(collapsed);

        // ── Histogram ──────────────────────────────────────────
        const BINS = 8;
        const binCounts = new Array(BINS).fill(0);
        const bars = [];
        const barLabels = [];
        for (let i = 0; i < BINS; i++) {
            const bar = BABYLON.MeshBuilder.CreateBox("hbar_" + i, { width: 0.35, height: 1, depth: 0.35 }, scene);
            bar.position = new BABYLON.Vector3(-3 + i * 0.5, 0, 3);
            const mat = new BABYLON.StandardMaterial("hbMat_" + i, scene);
            const t = i / (BINS - 1);
            mat.diffuseColor = new BABYLON.Color3(0.2 + t * 0.6, 0.3 * (1 - t), 1 - t * 0.7);
            mat.emissiveColor = mat.diffuseColor.scale(0.2);
            bar.material = mat;
            bar.scaling.y = 0.01;
            bars.push(bar);
        }

        const histLabel = qvr.createTextPlane("Measurement histogram", 28, 4, scene);
        histLabel.position = new BABYLON.Vector3(-1, 3.5, 3);

        let totalMeasurements = 0;

        function updateHistogram(binIndex) {
            binCounts[binIndex]++;
            totalMeasurements++;
            const maxCount = Math.max(...binCounts, 1);
            for (let i = 0; i < BINS; i++) {
                const h = (binCounts[i] / maxCount) * 2.5;
                bars[i].scaling.y = Math.max(0.01, h);
                bars[i].position.y = h * 0.5;
            }
        }

        // ── State ──────────────────────────────────────────────
        let isCloud = true;
        let cooldown = false;

        // Clickable area
        const clickZone = BABYLON.MeshBuilder.CreateSphere("clickZone", { diameter: 3 }, scene);
        clickZone.position.y = 2.5;
        clickZone.isVisible = false;
        clickZone.isPickable = true;

        // ── Animation ──────────────────────────────────────────
        let t = 0;
        scene.onBeforeRenderObservable.add(() => {
            t += 0.016;
            if (isCloud) {
                cloudParticles.forEach(p => {
                    const angle = t * p._orbitSpeed + p._orbitPhase;
                    p.position.x = Math.cos(angle) * p._orbitR;
                    p.position.y = Math.sin(angle * 0.7) * p._orbitR * 0.5;
                    p.position.z = Math.sin(angle) * p._orbitR * Math.cos(p._orbitTilt);
                    p.material.alpha = p._baseAlpha * (0.5 + 0.5 * Math.sin(t * 2 + p._orbitPhase));
                });
            }
        });

        // ── Measure on click ───────────────────────────────────
        clickZone.actionManager = new BABYLON.ActionManager(scene);
        clickZone.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => {
                if (cooldown) return;
                cooldown = true;

                if (isCloud) {
                    // COLLAPSE
                    isCloud = false;

                    // Pick a random position from the cloud distribution
                    // Weighted toward center (Gaussian-ish via bin)
                    const r = Math.random();
                    // Simple distribution: more likely near center bins
                    const gaussian = Math.floor(
                        BINS * (0.5 + 0.3 * (Math.random() + Math.random() + Math.random() - 1.5))
                    );
                    const bin = Math.max(0, Math.min(BINS - 1, gaussian));

                    // Collapse animation: particles rush to center
                    const targetPos = new BABYLON.Vector3(
                        (bin - BINS / 2 + 0.5) * 0.3,
                        0,
                        0
                    );

                    cloudParticles.forEach(p => {
                        const startPos = p.position.clone();
                        let progress = 0;
                        const obs = scene.onBeforeRenderObservable.add(() => {
                            progress += 0.06;
                            if (progress >= 1) {
                                p.isVisible = false;
                                scene.onBeforeRenderObservable.remove(obs);
                            } else {
                                p.position = BABYLON.Vector3.Lerp(startPos, targetPos, progress);
                                p.material.alpha = p._baseAlpha * (1 - progress);
                                p.scaling.setAll(1 - progress * 0.8);
                            }
                        });
                    });

                    // Show collapsed particle after delay
                    setTimeout(() => {
                        collapsed.isVisible = true;
                        collapsed.position = new BABYLON.Vector3(
                            cloudParent.position.x + targetPos.x,
                            cloudParent.position.y,
                            cloudParent.position.z
                        );
                        collapsed.scaling.setAll(0.1);

                        // Pop-in animation
                        let scale = 0.1;
                        const obs = scene.onBeforeRenderObservable.add(() => {
                            scale += (1 - scale) * 0.1;
                            collapsed.scaling.setAll(scale);
                            if (Math.abs(scale - 1) < 0.01) {
                                collapsed.scaling.setAll(1);
                                scene.onBeforeRenderObservable.remove(obs);
                            }
                        });

                        // Shockwave ring
                        const ring = BABYLON.MeshBuilder.CreateTorus("ring", {
                            diameter: 0.5, thickness: 0.05, tessellation: 32
                        }, scene);
                        ring.position = collapsed.position.clone();
                        const ringMat = new BABYLON.StandardMaterial("ringMat", scene);
                        ringMat.emissiveColor = new BABYLON.Color3(0.5, 0.8, 1);
                        ringMat.disableLighting = true;
                        ring.material = ringMat;
                        let ringLife = 1;
                        const ringObs = scene.onBeforeRenderObservable.add(() => {
                            ringLife -= 0.02;
                            ring.scaling.setAll(1 + (1 - ringLife) * 5);
                            ringMat.alpha = ringLife;
                            if (ringLife <= 0) {
                                scene.onBeforeRenderObservable.remove(ringObs);
                                ring.dispose();
                                ringMat.dispose();
                            }
                        });

                        updateHistogram(bin);
                    }, 500);

                    setTimeout(() => { cooldown = false; }, 1500);
                } else {
                    // RESET to cloud
                    isCloud = true;
                    collapsed.isVisible = false;
                    cloudParticles.forEach(p => {
                        p.isVisible = true;
                        p.scaling.setAll(1);
                        p.material.alpha = p._baseAlpha;
                    });
                    cooldown = false;
                }
            })
        );
    }
});
