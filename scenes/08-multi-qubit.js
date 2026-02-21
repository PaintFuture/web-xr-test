// Scene 8: Multi-Qubit Systems — exponential state space
QVR.register({
    id: "multi-qubit",
    title: "8. Multi-Qubit Systems",
    subtitle: "Click + to add qubits — watch the state space explode",
    info: "The state space of N qubits is 2^N. Two qubits have 4 basis states, 3 have 8, 10 have 1024. This exponential growth is the fundamental source of quantum computing power. 300 qubits have more states than atoms in the observable universe. Each bar represents one possible state the system can be in simultaneously.",

    async setup(scene, qvr) {
        qvr.createStarfield(scene);
        qvr.createLighting(scene);
        const gl = qvr.createGlow(scene);

        const camera = new BABYLON.ArcRotateCamera("cam", -Math.PI / 2, Math.PI / 3.5, 14, new BABYLON.Vector3(0, 2, 0), scene);
        camera.attachControl(qvr.canvas, true);

        const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 20, height: 20 }, scene);
        const gMat = new BABYLON.StandardMaterial("gMat", scene);
        gMat.diffuseColor = new BABYLON.Color3(0.05, 0.05, 0.12);
        gMat.alpha = 0.3;
        ground.material = gMat;

        // ── State ──────────────────────────────────────────────
        let numQubits = 1;
        const MAX_QUBITS = 7; // 128 bars max for performance
        let bars = [];
        let qubitSpheres = [];

        // ── Qubit display (left side) ──────────────────────────
        const qubitParent = new BABYLON.TransformNode("qubits", scene);
        qubitParent.position = new BABYLON.Vector3(-5, 3, 0);

        function rebuildQubitDisplay() {
            qubitSpheres.forEach(s => s.dispose());
            qubitSpheres = [];
            for (let i = 0; i < numQubits; i++) {
                const s = qvr.createQubitSphere("qb_" + i, 0.5, new BABYLON.Color3(0.3, 0.5, 1), scene);
                s.parent = qubitParent;
                s.position.set(0, -i * 0.7, 0);
                gl.addIncludedOnlyMesh(s);
                qubitSpheres.push(s);
            }
        }

        // ── Histogram (center) ─────────────────────────────────
        const barParent = new BABYLON.TransformNode("bars", scene);
        barParent.position = new BABYLON.Vector3(0, 0, 0);

        const barColors = [
            new BABYLON.Color3(0.2, 0.5, 1),
            new BABYLON.Color3(0.3, 0.7, 0.9),
            new BABYLON.Color3(0.2, 0.9, 0.5),
            new BABYLON.Color3(0.5, 0.9, 0.2),
            new BABYLON.Color3(0.9, 0.8, 0.1),
            new BABYLON.Color3(0.9, 0.5, 0.1),
            new BABYLON.Color3(0.9, 0.2, 0.3),
            new BABYLON.Color3(0.7, 0.2, 0.8),
        ];

        function rebuildBars() {
            bars.forEach(b => { b.mesh.dispose(); if (b.label) b.label.dispose(); });
            bars = [];

            const states = Math.pow(2, numQubits);
            const maxWidth = 10;
            const barWidth = Math.min(0.4, maxWidth / states - 0.02);
            const totalWidth = states * (barWidth + 0.02);
            const startX = -totalWidth / 2;

            // Equal superposition: each state has amplitude 1/sqrt(2^n)
            const amp = 1 / Math.sqrt(states);

            for (let i = 0; i < states; i++) {
                const bar = BABYLON.MeshBuilder.CreateBox("bar_" + i, {
                    width: barWidth, height: 1, depth: barWidth
                }, scene);
                bar.parent = barParent;
                const x = startX + i * (barWidth + 0.02) + barWidth / 2;
                bar.position.set(x, 0, 2);

                const mat = new BABYLON.StandardMaterial("bMat_" + i, scene);
                const colorIdx = i % barColors.length;
                mat.diffuseColor = barColors[colorIdx];
                mat.emissiveColor = barColors[colorIdx].scale(0.15);
                bar.material = mat;

                // Label for small state counts
                let label = null;
                if (states <= 16) {
                    const binStr = i.toString(2).padStart(numQubits, "0");
                    label = qvr.createTextPlane("|" + binStr + "⟩", 24, barWidth * 3, scene);
                    label.parent = barParent;
                    label.position.set(x, -0.3, 2);
                }

                bars.push({ mesh: bar, amp, label });
            }
        }

        // ── Info display ───────────────────────────────────────
        const infoPlane = BABYLON.MeshBuilder.CreatePlane("info", { width: 4, height: 1.2 }, scene);
        infoPlane.position = new BABYLON.Vector3(0, 5, 2);
        infoPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        const infoTex = new BABYLON.DynamicTexture("infoTex", { width: 512, height: 160 }, scene);
        const infoMat = new BABYLON.StandardMaterial("infoMat", scene);
        infoMat.diffuseTexture = infoTex;
        infoMat.emissiveTexture = infoTex;
        infoMat.opacityTexture = infoTex;
        infoMat.disableLighting = true;
        infoMat.backFaceCulling = false;
        infoPlane.material = infoMat;

        function updateInfo() {
            const ctx = infoTex.getContext();
            ctx.clearRect(0, 0, 512, 160);
            ctx.textAlign = "center";

            ctx.font = "bold 32px monospace";
            ctx.fillStyle = "#aabbff";
            ctx.fillText(numQubits + " qubit" + (numQubits > 1 ? "s" : ""), 256, 40);

            ctx.font = "28px monospace";
            ctx.fillStyle = "#88ddaa";
            const states = Math.pow(2, numQubits);
            ctx.fillText("2^" + numQubits + " = " + states + " states", 256, 80);

            ctx.font = "18px sans-serif";
            ctx.fillStyle = "#667799";
            if (numQubits >= 5) {
                ctx.fillText("Each state held simultaneously!", 256, 120);
            } else {
                ctx.fillText("All states in superposition at once", 256, 120);
            }
            if (numQubits >= 7) {
                ctx.fillStyle = "#ffaa44";
                ctx.fillText("128 states — and we're just getting started", 256, 148);
            }
            infoTex.update();
        }

        // ── Buttons ────────────────────────────────────────────
        function makeButton(label, x, y, color, onClick) {
            const btn = BABYLON.MeshBuilder.CreateBox("btn_" + label, { width: 0.8, height: 0.5, depth: 0.2 }, scene);
            btn.position = new BABYLON.Vector3(x, y, 0);
            const mat = new BABYLON.StandardMaterial("btnMat_" + label, scene);
            mat.diffuseColor = color;
            mat.emissiveColor = color.scale(0.15);
            btn.material = mat;

            const lbl = qvr.createTextPlane(label, 40, 0.7, scene);
            lbl.position = new BABYLON.Vector3(x, y, 0.15);

            btn.isPickable = true;
            btn.actionManager = new BABYLON.ActionManager(scene);
            btn.actionManager.registerAction(
                new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, onClick)
            );
            btn.actionManager.registerAction(
                new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOverTrigger, () => {
                    mat.emissiveColor = color.scale(0.5);
                })
            );
            btn.actionManager.registerAction(
                new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOutTrigger, () => {
                    mat.emissiveColor = color.scale(0.15);
                })
            );
        }

        makeButton("+", -5, 1, new BABYLON.Color3(0.2, 0.8, 0.4), () => {
            if (numQubits < MAX_QUBITS) {
                numQubits++;
                rebuild();
            }
        });

        makeButton("−", -5, 0.3, new BABYLON.Color3(0.8, 0.3, 0.3), () => {
            if (numQubits > 1) {
                numQubits--;
                rebuild();
            }
        });

        makeButton("RST", -5, -0.4, new BABYLON.Color3(0.5, 0.5, 0.5), () => {
            numQubits = 1;
            rebuild();
        });

        function rebuild() {
            rebuildQubitDisplay();
            rebuildBars();
            updateInfo();
        }

        rebuild();

        // ── Animation ──────────────────────────────────────────
        let t = 0;
        scene.onBeforeRenderObservable.add(() => {
            t += 0.016;
            // Animate bars: gentle wave
            bars.forEach((b, i) => {
                const h = b.amp * 3 * (0.8 + 0.2 * Math.sin(t * 2 + i * 0.3));
                b.mesh.scaling.y = Math.max(0.01, h);
                b.mesh.position.y = h * 0.5;
            });
            // Qubit spheres pulse
            qubitSpheres.forEach((s, i) => {
                s.scaling.setAll(1 + Math.sin(t * 3 + i) * 0.05);
            });
        });
    }
});
