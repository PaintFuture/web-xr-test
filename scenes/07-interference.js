// Scene 7: Quantum Interference — 3D ripple tank
QVR.register({
    id: "interference",
    title: "7. Quantum Interference",
    subtitle: "Drag the sources to see interference patterns change",
    info: "Quantum amplitudes can add (constructive) or cancel (destructive interference). This is the engine of quantum speedup: every useful quantum algorithm arranges interference so wrong answers cancel and right answers reinforce. The ripple tank shows this visually — where wave crests meet, they amplify; where crest meets trough, they cancel to zero.",

    async setup(scene, qvr) {
        qvr.createStarfield(scene);
        qvr.createLighting(scene);
        const gl = qvr.createGlow(scene);

        const camera = new BABYLON.ArcRotateCamera("cam", -Math.PI / 2, Math.PI / 4, 14, new BABYLON.Vector3(0, 0, 0), scene);
        camera.attachControl(qvr.canvas, true);

        const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 20, height: 20 }, scene);
        const gMat = new BABYLON.StandardMaterial("gMat", scene);
        gMat.diffuseColor = new BABYLON.Color3(0.05, 0.05, 0.12);
        gMat.alpha = 0.15;
        ground.material = gMat;

        // ── Ripple surface (grid of spheres) ───────────────────
        const GRID = 30;
        const SPACING = 0.35;
        const OFFSET = (GRID - 1) * SPACING / 2;
        const dots = [];

        const dotMat = new BABYLON.StandardMaterial("dotMat", scene);
        dotMat.disableLighting = true;

        // Use SPS for performance
        const SPS = new BABYLON.SolidParticleSystem("ripple", scene);
        const model = BABYLON.MeshBuilder.CreateSphere("dot", { diameter: 0.12, segments: 6 }, scene);
        SPS.addShape(model, GRID * GRID);
        model.dispose();
        const mesh = SPS.buildMesh();
        mesh.material = dotMat;

        // Store grid positions
        const gridPositions = [];
        for (let z = 0; z < GRID; z++) {
            for (let x = 0; x < GRID; x++) {
                gridPositions.push({
                    x: x * SPACING - OFFSET,
                    z: z * SPACING - OFFSET
                });
            }
        }

        // ── Wave sources ───────────────────────────────────────
        let source1 = { x: -2, z: 0 };
        let source2 = { x: 2, z: 0 };

        // Source markers
        const s1Marker = BABYLON.MeshBuilder.CreateSphere("src1", { diameter: 0.4, segments: 16 }, scene);
        s1Marker.position.set(source1.x, 0.3, source1.z);
        const s1Mat = new BABYLON.StandardMaterial("s1Mat", scene);
        s1Mat.diffuseColor = new BABYLON.Color3(1, 0.3, 0.3);
        s1Mat.emissiveColor = new BABYLON.Color3(0.5, 0.1, 0.1);
        s1Marker.material = s1Mat;
        gl.addIncludedOnlyMesh(s1Marker);

        const s2Marker = BABYLON.MeshBuilder.CreateSphere("src2", { diameter: 0.4, segments: 16 }, scene);
        s2Marker.position.set(source2.x, 0.3, source2.z);
        const s2Mat = new BABYLON.StandardMaterial("s2Mat", scene);
        s2Mat.diffuseColor = new BABYLON.Color3(0.3, 0.5, 1);
        s2Mat.emissiveColor = new BABYLON.Color3(0.1, 0.15, 0.5);
        s2Marker.material = s2Mat;
        gl.addIncludedOnlyMesh(s2Marker);

        // Click sources to move them
        let selectedSource = null;
        [s1Marker, s2Marker].forEach((marker, idx) => {
            marker.isPickable = true;
            marker.actionManager = new BABYLON.ActionManager(scene);
            marker.actionManager.registerAction(
                new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => {
                    selectedSource = idx;
                })
            );
        });

        // Click ground to place selected source
        ground.isPickable = true;
        ground.actionManager = new BABYLON.ActionManager(scene);
        ground.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => {
                if (selectedSource === null) return;
                const pick = scene.pick(scene.pointerX, scene.pointerY);
                if (pick.hit) {
                    const p = pick.pickedPoint;
                    if (selectedSource === 0) {
                        source1.x = p.x; source1.z = p.z;
                        s1Marker.position.set(p.x, 0.3, p.z);
                    } else {
                        source2.x = p.x; source2.z = p.z;
                        s2Marker.position.set(p.x, 0.3, p.z);
                    }
                    selectedSource = null;
                }
            })
        );

        // ── Histogram bars (showing amplitude distribution) ────
        const HIST_BINS = 10;
        const histBars = [];
        for (let i = 0; i < HIST_BINS; i++) {
            const bar = BABYLON.MeshBuilder.CreateBox("hb_" + i, { width: 0.3, height: 1, depth: 0.3 }, scene);
            bar.position.set(-5 + i * 0.45, 0, -6);
            const bMat = new BABYLON.StandardMaterial("hbMat_" + i, scene);
            const t = i / (HIST_BINS - 1);
            bMat.diffuseColor = new BABYLON.Color3(0.2 + t * 0.8, 0.8 - t * 0.5, 1 - t * 0.8);
            bMat.emissiveColor = bMat.diffuseColor.scale(0.15);
            bar.material = bMat;
            histBars.push(bar);
        }
        const histLabel = qvr.createTextPlane("Amplitude distribution", 26, 3, scene);
        histLabel.position = new BABYLON.Vector3(-2.8, 2.5, -6);

        // ── Animation ──────────────────────────────────────────
        let t = 0;
        const freq = 3;
        const ampBins = new Array(HIST_BINS).fill(0);

        SPS.updateParticle = function (p) {
            const gp = gridPositions[p.idx];
            const d1 = Math.sqrt((gp.x - source1.x) ** 2 + (gp.z - source1.z) ** 2);
            const d2 = Math.sqrt((gp.x - source2.x) ** 2 + (gp.z - source2.z) ** 2);

            const wave1 = Math.sin(d1 * freq - t * 3) / (1 + d1 * 0.3);
            const wave2 = Math.sin(d2 * freq - t * 3) / (1 + d2 * 0.3);
            const combined = wave1 + wave2;

            p.position.x = gp.x;
            p.position.z = gp.z;
            p.position.y = combined * 0.8;

            // Color: blue for positive, red for negative, bright for large amplitude
            const amp = Math.abs(combined);
            if (combined > 0) {
                p.color.set(0.2, 0.3 + amp * 0.4, 0.8 + amp * 0.2, 1);
            } else {
                p.color.set(0.8 + amp * 0.2, 0.2, 0.3, 1);
            }

            const scale = 0.6 + amp * 0.8;
            p.scaling.setAll(scale);

            return p;
        };

        scene.onBeforeRenderObservable.add(() => {
            t += 0.016;
            SPS.setParticles();

            // Update histogram
            ampBins.fill(0);
            for (let i = 0; i < gridPositions.length; i++) {
                const gp = gridPositions[i];
                const d1 = Math.sqrt((gp.x - source1.x) ** 2 + (gp.z - source1.z) ** 2);
                const d2 = Math.sqrt((gp.x - source2.x) ** 2 + (gp.z - source2.z) ** 2);
                const combined = Math.abs(
                    Math.sin(d1 * freq - t * 3) / (1 + d1 * 0.3) +
                    Math.sin(d2 * freq - t * 3) / (1 + d2 * 0.3)
                );
                const bin = Math.min(HIST_BINS - 1, Math.floor(combined * HIST_BINS / 2));
                ampBins[bin]++;
            }
            const maxBin = Math.max(...ampBins, 1);
            for (let i = 0; i < HIST_BINS; i++) {
                const h = (ampBins[i] / maxBin) * 2;
                histBars[i].scaling.y = Math.max(0.01, h);
                histBars[i].position.y = h * 0.5;
            }

            // Pulse source markers
            s1Marker.scaling.setAll(1 + Math.sin(t * 5) * 0.05);
            s2Marker.scaling.setAll(1 + Math.sin(t * 5 + 1) * 0.05);
        });
    }
});
