// Scene 10: Quantum Circuits — 3D circuit builder with step-through
QVR.register({
    id: "quantum-circuits",
    title: "10. Quantum Circuits",
    subtitle: "Click gates to add them to the circuit — press PLAY to run",
    info: "A quantum circuit is a sequence of gates applied to qubits over time, read left-to-right. Horizontal wires represent qubits, gate blocks sit on the wires. This is the programming language of quantum computers — every quantum algorithm is expressed as a circuit. Try building H then CNOT to create entanglement!",

    async setup(scene, qvr) {
        qvr.createStarfield(scene);
        qvr.createLighting(scene);
        const gl = qvr.createGlow(scene);

        const camera = new BABYLON.ArcRotateCamera("cam", -Math.PI / 2, Math.PI / 3.5, 12, new BABYLON.Vector3(2, 2, 0), scene);
        camera.attachControl(qvr.canvas, true);

        const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 20, height: 20 }, scene);
        const gMat = new BABYLON.StandardMaterial("gMat", scene);
        gMat.diffuseColor = new BABYLON.Color3(0.05, 0.05, 0.12);
        gMat.alpha = 0.3;
        ground.material = gMat;

        // ── Circuit parameters ─────────────────────────────────
        const NUM_WIRES = 2;
        const MAX_STEPS = 6;
        const WIRE_SPACING = 1.5;
        const STEP_SPACING = 1.2;
        const WIRE_START_X = -1;
        const WIRE_Y = 2.5;

        // ── Draw wires ─────────────────────────────────────────
        for (let w = 0; w < NUM_WIRES; w++) {
            const y = WIRE_Y - w * WIRE_SPACING;
            const wire = BABYLON.MeshBuilder.CreateCylinder("wire_" + w, {
                diameter: 0.03, height: MAX_STEPS * STEP_SPACING + 1, tessellation: 8
            }, scene);
            wire.position = new BABYLON.Vector3(WIRE_START_X + (MAX_STEPS * STEP_SPACING) / 2, y, 0);
            wire.rotation.z = Math.PI / 2;
            const wMat = new BABYLON.StandardMaterial("wireMat_" + w, scene);
            wMat.emissiveColor = new BABYLON.Color3(0.2, 0.3, 0.5);
            wMat.disableLighting = true;
            wire.material = wMat;

            // Wire label
            const label = qvr.createTextPlane("q" + w, 32, 0.6, scene);
            label.position = new BABYLON.Vector3(WIRE_START_X - 0.8, y, 0);
        }

        // ── Circuit state ──────────────────────────────────────
        const circuit = []; // { step, wire, gate, mesh }
        let nextStep = 0;

        const gateColors = {
            H: new BABYLON.Color3(0.2, 0.8, 0.4),
            X: new BABYLON.Color3(1, 0.3, 0.3),
            Z: new BABYLON.Color3(0.3, 0.5, 1),
            CNOT: new BABYLON.Color3(0.8, 0.5, 1),
        };

        function addGate(gateName, wire) {
            if (nextStep >= MAX_STEPS) return;
            const step = nextStep;
            const x = WIRE_START_X + step * STEP_SPACING + STEP_SPACING / 2;
            const y = WIRE_Y - wire * WIRE_SPACING;

            const color = gateColors[gateName] || new BABYLON.Color3(0.5, 0.5, 0.5);

            if (gateName === "CNOT") {
                // Control dot on wire 0
                const ctrl = BABYLON.MeshBuilder.CreateSphere("ctrl_" + step, { diameter: 0.2, segments: 12 }, scene);
                ctrl.position = new BABYLON.Vector3(x, WIRE_Y, 0);
                const ctrlMat = new BABYLON.StandardMaterial("ctrlMat_" + step, scene);
                ctrlMat.diffuseColor = color;
                ctrlMat.emissiveColor = color.scale(0.3);
                ctrl.material = ctrlMat;

                // Target circle on wire 1
                const target = BABYLON.MeshBuilder.CreateTorus("target_" + step, {
                    diameter: 0.5, thickness: 0.06, tessellation: 24
                }, scene);
                target.position = new BABYLON.Vector3(x, WIRE_Y - WIRE_SPACING, 0);
                target.rotation.x = Math.PI / 2;
                const tMat = new BABYLON.StandardMaterial("tMat_" + step, scene);
                tMat.diffuseColor = color;
                tMat.emissiveColor = color.scale(0.3);
                target.material = tMat;

                // Vertical connector
                const conn = BABYLON.MeshBuilder.CreateCylinder("conn_" + step, {
                    diameter: 0.03, height: WIRE_SPACING, tessellation: 6
                }, scene);
                conn.position = new BABYLON.Vector3(x, WIRE_Y - WIRE_SPACING / 2, 0);
                const connMat = new BABYLON.StandardMaterial("connMat_" + step, scene);
                connMat.emissiveColor = color.scale(0.5);
                connMat.disableLighting = true;
                conn.material = connMat;

                circuit.push({ step, wire: -1, gate: gateName, meshes: [ctrl, target, conn] });
            } else {
                const block = BABYLON.MeshBuilder.CreateBox("gate_" + step + "_" + wire, {
                    width: 0.7, height: 0.7, depth: 0.3
                }, scene);
                block.position = new BABYLON.Vector3(x, y, 0);
                const mat = new BABYLON.StandardMaterial("gateMat_" + step, scene);
                mat.diffuseColor = color;
                mat.emissiveColor = color.scale(0.15);
                block.material = mat;

                const lbl = qvr.createTextPlane(gateName, 44, 0.6, scene);
                lbl.position = new BABYLON.Vector3(x, y, 0.2);

                circuit.push({ step, wire, gate: gateName, meshes: [block, lbl] });
            }
            nextStep++;
        }

        // ── Gate palette (left side) ───────────────────────────
        const paletteGates = [
            { name: "H", wire: 0, desc: "Hadamard on q0" },
            { name: "X", wire: 0, desc: "NOT on q0" },
            { name: "Z", wire: 0, desc: "Phase on q0" },
            { name: "H", wire: 1, desc: "Hadamard on q1" },
            { name: "CNOT", wire: 0, desc: "CNOT (q0→q1)" },
        ];

        paletteGates.forEach((pg, i) => {
            const color = gateColors[pg.name];
            const btn = BABYLON.MeshBuilder.CreateBox("pal_" + i, { width: 1, height: 0.45, depth: 0.2 }, scene);
            btn.position = new BABYLON.Vector3(-4, 4 - i * 0.6, 0);
            const mat = new BABYLON.StandardMaterial("palMat_" + i, scene);
            mat.diffuseColor = color;
            mat.emissiveColor = color.scale(0.15);
            btn.material = mat;

            const label = pg.name === "CNOT" ? "CNOT" : pg.name + " q" + pg.wire;
            const lbl = qvr.createTextPlane(label, 28, 0.9, scene);
            lbl.position = new BABYLON.Vector3(-4, 4 - i * 0.6, 0.15);

            btn.isPickable = true;
            btn.actionManager = new BABYLON.ActionManager(scene);
            btn.actionManager.registerAction(
                new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => {
                    addGate(pg.name, pg.wire);
                })
            );
            btn.actionManager.registerAction(
                new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOverTrigger, () => mat.emissiveColor = color.scale(0.5))
            );
            btn.actionManager.registerAction(
                new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOutTrigger, () => mat.emissiveColor = color.scale(0.15))
            );
        });

        // ── Play / Clear buttons ───────────────────────────────
        let playing = false;
        let playStep = -1;
        let playMarker = null;

        // Play marker (glowing vertical line)
        playMarker = BABYLON.MeshBuilder.CreateBox("playMarker", { width: 0.05, height: NUM_WIRES * WIRE_SPACING + 1, depth: 0.05 }, scene);
        playMarker.position = new BABYLON.Vector3(WIRE_START_X, WIRE_Y - (NUM_WIRES - 1) * WIRE_SPACING / 2, 0);
        const pmMat = new BABYLON.StandardMaterial("pmMat", scene);
        pmMat.emissiveColor = new BABYLON.Color3(1, 0.8, 0.2);
        pmMat.disableLighting = true;
        pmMat.alpha = 0.8;
        playMarker.material = pmMat;
        playMarker.isVisible = false;

        // Qubit state particles (travel along wires during play)
        const particles = [];
        for (let w = 0; w < NUM_WIRES; w++) {
            const p = BABYLON.MeshBuilder.CreateSphere("particle_" + w, { diameter: 0.25, segments: 12 }, scene);
            p.position = new BABYLON.Vector3(WIRE_START_X, WIRE_Y - w * WIRE_SPACING, 0);
            const pMat = new BABYLON.StandardMaterial("pMat_" + w, scene);
            pMat.diffuseColor = new BABYLON.Color3(0.3, 0.5, 1);
            pMat.emissiveColor = new BABYLON.Color3(0.1, 0.2, 0.5);
            p.material = pMat;
            gl.addIncludedOnlyMesh(p);
            p.isVisible = false;
            particles.push({ mesh: p, mat: pMat });
        }

        function makeCtrlBtn(label, x, y, color, onClick) {
            const btn = BABYLON.MeshBuilder.CreateBox("ctrl_" + label, { width: 1, height: 0.45, depth: 0.2 }, scene);
            btn.position = new BABYLON.Vector3(x, y, 0);
            const mat = new BABYLON.StandardMaterial("ctrlMat_" + label, scene);
            mat.diffuseColor = color;
            mat.emissiveColor = color.scale(0.15);
            btn.material = mat;
            const lbl = qvr.createTextPlane(label, 30, 0.9, scene);
            lbl.position = new BABYLON.Vector3(x, y, 0.15);
            btn.isPickable = true;
            btn.actionManager = new BABYLON.ActionManager(scene);
            btn.actionManager.registerAction(
                new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, onClick)
            );
            btn.actionManager.registerAction(
                new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOverTrigger, () => mat.emissiveColor = color.scale(0.5))
            );
            btn.actionManager.registerAction(
                new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOutTrigger, () => mat.emissiveColor = color.scale(0.15))
            );
        }

        makeCtrlBtn("PLAY", -4, 0.8, new BABYLON.Color3(0.2, 0.8, 0.3), () => {
            if (circuit.length === 0) return;
            playing = true;
            playStep = -0.5;
            playMarker.isVisible = true;
            particles.forEach(p => { p.mesh.isVisible = true; });
        });

        makeCtrlBtn("CLEAR", -4, 0.2, new BABYLON.Color3(0.8, 0.3, 0.3), () => {
            circuit.forEach(c => c.meshes.forEach(m => m.dispose()));
            circuit.length = 0;
            nextStep = 0;
            playing = false;
            playMarker.isVisible = false;
            particles.forEach(p => {
                p.mesh.isVisible = false;
                p.mesh.position.x = WIRE_START_X;
                p.mat.diffuseColor = new BABYLON.Color3(0.3, 0.5, 1);
                p.mat.emissiveColor = new BABYLON.Color3(0.1, 0.2, 0.5);
            });
        });

        // ── Output state display ───────────────────────────────
        const outPlane = BABYLON.MeshBuilder.CreatePlane("out", { width: 3, height: 0.8 }, scene);
        outPlane.position = new BABYLON.Vector3(WIRE_START_X + MAX_STEPS * STEP_SPACING + 1.5, WIRE_Y - 0.5, 0);
        outPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        const outTex = new BABYLON.DynamicTexture("outTex", { width: 384, height: 100 }, scene);
        const outMat = new BABYLON.StandardMaterial("outMat", scene);
        outMat.diffuseTexture = outTex;
        outMat.emissiveTexture = outTex;
        outMat.opacityTexture = outTex;
        outMat.disableLighting = true;
        outMat.backFaceCulling = false;
        outPlane.material = outMat;

        function updateOutput(text) {
            const ctx = outTex.getContext();
            ctx.clearRect(0, 0, 384, 100);
            ctx.textAlign = "center";
            ctx.font = "20px monospace";
            ctx.fillStyle = "#aabbff";
            ctx.fillText(text, 192, 50);
            outTex.update();
        }
        updateOutput("Add gates, then PLAY");

        // ── Play animation ─────────────────────────────────────
        scene.onBeforeRenderObservable.add(() => {
            if (!playing) return;

            playStep += 0.015;
            const x = WIRE_START_X + playStep * STEP_SPACING + STEP_SPACING / 2;
            playMarker.position.x = x;

            particles.forEach((p, w) => {
                p.mesh.position.x = x;
            });

            // Check if passing through a gate
            const currentStepIdx = Math.floor(playStep);
            circuit.forEach(c => {
                if (c.step === currentStepIdx && Math.abs(playStep - c.step - 0.5) < 0.02) {
                    // Flash gate
                    c.meshes.forEach(m => {
                        if (m.material && m.material.emissiveColor) {
                            const orig = m.material.emissiveColor.clone();
                            m.material.emissiveColor = new BABYLON.Color3(1, 1, 1);
                            setTimeout(() => { if (m.material) m.material.emissiveColor = orig; }, 200);
                        }
                    });

                    // Change particle colors based on gate
                    if (c.gate === "H") {
                        const p = particles[c.wire];
                        p.mat.diffuseColor = new BABYLON.Color3(0.5, 0.8, 0.5);
                        p.mat.emissiveColor = new BABYLON.Color3(0.2, 0.4, 0.2);
                    } else if (c.gate === "X") {
                        const p = particles[c.wire];
                        p.mat.diffuseColor = new BABYLON.Color3(1, 0.4, 0.4);
                        p.mat.emissiveColor = new BABYLON.Color3(0.4, 0.1, 0.1);
                    } else if (c.gate === "CNOT") {
                        particles[0].mat.diffuseColor = new BABYLON.Color3(0.7, 0.4, 1);
                        particles[1].mat.diffuseColor = new BABYLON.Color3(0.7, 0.4, 1);
                        particles[0].mat.emissiveColor = new BABYLON.Color3(0.3, 0.15, 0.5);
                        particles[1].mat.emissiveColor = new BABYLON.Color3(0.3, 0.15, 0.5);
                    }
                }
            });

            if (playStep > nextStep + 0.5) {
                playing = false;
                // Determine output state description
                const gates = circuit.map(c => c.gate).join(" → ");
                updateOutput("Circuit: " + gates);
            }
        });
    }
});
