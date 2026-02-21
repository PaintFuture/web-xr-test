// Scene 9: Entanglement — two linked Bloch spheres
QVR.register({
    id: "entanglement",
    title: "9. Entanglement",
    subtitle: "Click ENTANGLE, then measure one qubit — watch the other respond",
    info: "Entanglement is a correlation with no classical equivalent. Two entangled qubits share a joint state: measuring one instantly determines the other, no matter the distance. Before entanglement, qubits are independent. After a CNOT gate, they become linked. Measure one and the other collapses to a correlated state. This isn't communication — it's correlation baked into the quantum state itself.",

    async setup(scene, qvr) {
        qvr.createStarfield(scene);
        qvr.createLighting(scene);
        const gl = qvr.createGlow(scene);

        const camera = new BABYLON.ArcRotateCamera("cam", -Math.PI / 2, Math.PI / 3, 14, new BABYLON.Vector3(0, 2.5, 0), scene);
        camera.attachControl(qvr.canvas, true);

        const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 20, height: 20 }, scene);
        const gMat = new BABYLON.StandardMaterial("gMat", scene);
        gMat.diffuseColor = new BABYLON.Color3(0.05, 0.05, 0.12);
        gMat.alpha = 0.3;
        ground.material = gMat;

        const RADIUS = 1.3;
        const SEPARATION = 4;

        // ── Two Bloch spheres ──────────────────────────────────
        function createMiniBloch(name, centerPos) {
            const parent = new BABYLON.TransformNode(name, scene);
            parent.position = centerPos;

            const wire = BABYLON.MeshBuilder.CreateSphere(name + "Wire", { diameter: RADIUS * 2, segments: 16 }, scene);
            wire.parent = parent;
            const wMat = new BABYLON.StandardMaterial(name + "WMat", scene);
            wMat.wireframe = true;
            wMat.emissiveColor = new BABYLON.Color3(0.12, 0.15, 0.3);
            wMat.disableLighting = true;
            wMat.alpha = 0.2;
            wire.material = wMat;

            const eq = BABYLON.MeshBuilder.CreateTorus(name + "Eq", { diameter: RADIUS * 2, thickness: 0.015, tessellation: 48 }, scene);
            eq.parent = parent;
            const eqMat = new BABYLON.StandardMaterial(name + "EqMat", scene);
            eqMat.emissiveColor = new BABYLON.Color3(0.15, 0.2, 0.4);
            eqMat.disableLighting = true;
            eqMat.alpha = 0.3;
            eq.material = eqMat;

            const tip = BABYLON.MeshBuilder.CreateSphere(name + "Tip", { diameter: 0.15, segments: 12 }, scene);
            tip.parent = parent;
            const tipMat = new BABYLON.StandardMaterial(name + "TipMat", scene);
            tipMat.diffuseColor = new BABYLON.Color3(1, 0.8, 0.2);
            tipMat.emissiveColor = new BABYLON.Color3(0.5, 0.4, 0.1);
            tip.material = tipMat;
            gl.addIncludedOnlyMesh(tip);

            return { parent, wire, tip, tipMat, theta: 0.001, phi: 0 };
        }

        const qubitA = createMiniBloch("A", new BABYLON.Vector3(-SEPARATION / 2, 2.5, 0));
        const qubitB = createMiniBloch("B", new BABYLON.Vector3(SEPARATION / 2, 2.5, 0));

        // Labels
        const labelA = qvr.createTextPlane("Qubit A", 32, 1.5, scene);
        labelA.position = new BABYLON.Vector3(-SEPARATION / 2, 4.5, 0);
        const labelB = qvr.createTextPlane("Qubit B", 32, 1.5, scene);
        labelB.position = new BABYLON.Vector3(SEPARATION / 2, 4.5, 0);

        // ── Entanglement link beam ─────────────────────────────
        let entangled = false;
        let measured = false;
        let measureResult = -1;
        let linkBeam = null;
        let linkPulses = [];

        function createLink() {
            if (linkBeam) linkBeam.dispose();
            linkBeam = BABYLON.MeshBuilder.CreateCylinder("link", {
                diameter: 0.06, height: SEPARATION, tessellation: 8
            }, scene);
            linkBeam.position = new BABYLON.Vector3(0, 2.5, 0);
            linkBeam.rotation.z = Math.PI / 2;
            const lMat = new BABYLON.StandardMaterial("linkMat", scene);
            lMat.emissiveColor = new BABYLON.Color3(0.5, 0.3, 1);
            lMat.disableLighting = true;
            lMat.alpha = 0.6;
            linkBeam.material = lMat;
            gl.addIncludedOnlyMesh(linkBeam);
        }

        function removeLink() {
            if (linkBeam) { linkBeam.dispose(); linkBeam = null; }
        }

        function firePulse(fromA) {
            const pulse = BABYLON.MeshBuilder.CreateSphere("pulse", { diameter: 0.2, segments: 8 }, scene);
            pulse.position.y = 2.5;
            pulse.position.x = fromA ? -SEPARATION / 2 : SEPARATION / 2;
            const pMat = new BABYLON.StandardMaterial("pMat", scene);
            pMat.emissiveColor = new BABYLON.Color3(0.8, 0.5, 1);
            pMat.disableLighting = true;
            pulse.material = pMat;
            gl.addIncludedOnlyMesh(pulse);

            const dir = fromA ? 1 : -1;
            const target = fromA ? SEPARATION / 2 : -SEPARATION / 2;
            linkPulses.push({ mesh: pulse, mat: pMat, dir, target, progress: 0 });
        }

        // ── Correlation tally ──────────────────────────────────
        const tally = { same: 0, total: 0 };
        const tallyPlane = BABYLON.MeshBuilder.CreatePlane("tally", { width: 3, height: 0.8 }, scene);
        tallyPlane.position = new BABYLON.Vector3(0, 0.8, 3);
        tallyPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        const tallyTex = new BABYLON.DynamicTexture("tallyTex", { width: 384, height: 100 }, scene);
        const tallyMat = new BABYLON.StandardMaterial("tallyMat", scene);
        tallyMat.diffuseTexture = tallyTex;
        tallyMat.emissiveTexture = tallyTex;
        tallyMat.opacityTexture = tallyTex;
        tallyMat.disableLighting = true;
        tallyMat.backFaceCulling = false;
        tallyPlane.material = tallyMat;

        function updateTally() {
            const ctx = tallyTex.getContext();
            ctx.clearRect(0, 0, 384, 100);
            ctx.textAlign = "center";
            ctx.font = "20px monospace";
            ctx.fillStyle = "#aabbff";
            if (tally.total > 0) {
                ctx.fillText("Correlated: " + tally.same + "/" + tally.total +
                    " (" + (tally.same / tally.total * 100).toFixed(0) + "%)", 192, 40);
            }
            ctx.fillStyle = "#667799";
            ctx.font = "16px sans-serif";
            ctx.fillText(entangled ? "Entangled (Bell state |Φ+⟩)" : "Independent", 192, 70);
            tallyTex.update();
        }
        updateTally();

        // ── Status display ─────────────────────────────────────
        const statusPlane = BABYLON.MeshBuilder.CreatePlane("status", { width: 3, height: 0.6 }, scene);
        statusPlane.position = new BABYLON.Vector3(0, 5.2, 0);
        statusPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        const statusTex = new BABYLON.DynamicTexture("statusTex", { width: 384, height: 80 }, scene);
        const statusMat = new BABYLON.StandardMaterial("statusMat", scene);
        statusMat.diffuseTexture = statusTex;
        statusMat.emissiveTexture = statusTex;
        statusMat.opacityTexture = statusTex;
        statusMat.disableLighting = true;
        statusMat.backFaceCulling = false;
        statusPlane.material = statusMat;

        function updateStatus(text, color) {
            const ctx = statusTex.getContext();
            ctx.clearRect(0, 0, 384, 80);
            ctx.textAlign = "center";
            ctx.font = "22px sans-serif";
            ctx.fillStyle = color || "#aabbff";
            ctx.fillText(text, 192, 45);
            statusTex.update();
        }
        updateStatus("Click ENTANGLE to link the qubits");

        // ── Buttons ────────────────────────────────────────────
        function makeBtn(label, x, y, color, onClick) {
            const btn = BABYLON.MeshBuilder.CreateBox("btn_" + label, { width: 1.2, height: 0.45, depth: 0.2 }, scene);
            btn.position = new BABYLON.Vector3(x, y, 0);
            const mat = new BABYLON.StandardMaterial("btnMat_" + label, scene);
            mat.diffuseColor = color;
            mat.emissiveColor = color.scale(0.15);
            btn.material = mat;
            const lbl = qvr.createTextPlane(label, 30, 1.1, scene);
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

        makeBtn("ENTANGLE", 0, 0.8, new BABYLON.Color3(0.6, 0.3, 1), () => {
            if (entangled) return;
            entangled = true;
            measured = false;
            // H on A, then CNOT
            qubitA.theta = Math.PI / 2;
            qubitA.phi = 0;
            qubitB.theta = Math.PI / 2;
            qubitB.phi = 0;
            createLink();
            updateStatus("Entangled! Now click MEASURE A", "#bb88ff");
            updateTally();
        });

        makeBtn("MEASURE A", -SEPARATION / 2, 0.8, new BABYLON.Color3(1, 0.4, 0.3), () => {
            if (!entangled || measured) return;
            measured = true;
            measureResult = Math.random() < 0.5 ? 0 : 1;

            // Collapse A
            qubitA.theta = measureResult === 0 ? 0.001 : Math.PI - 0.001;
            qubitA.phi = 0;
            qubitA.tipMat.diffuseColor = measureResult === 0
                ? new BABYLON.Color3(0.2, 0.5, 1)
                : new BABYLON.Color3(1, 0.3, 0.3);
            qubitA.tipMat.emissiveColor = qubitA.tipMat.diffuseColor.scale(0.4);

            // Fire pulse to B
            firePulse(true);

            // Collapse B after delay (correlated)
            setTimeout(() => {
                qubitB.theta = measureResult === 0 ? 0.001 : Math.PI - 0.001;
                qubitB.phi = 0;
                qubitB.tipMat.diffuseColor = qubitA.tipMat.diffuseColor.clone();
                qubitB.tipMat.emissiveColor = qubitA.tipMat.emissiveColor.clone();

                tally.same++;
                tally.total++;
                updateTally();
                updateStatus(
                    "Both collapsed to |" + measureResult + "⟩ — perfectly correlated!",
                    measureResult === 0 ? "#4488ff" : "#ff4444"
                );
            }, 600);
        });

        makeBtn("RESET", SEPARATION / 2, 0.8, new BABYLON.Color3(0.5, 0.5, 0.5), () => {
            entangled = false;
            measured = false;
            measureResult = -1;
            qubitA.theta = 0.001; qubitA.phi = 0;
            qubitB.theta = 0.001; qubitB.phi = 0;
            qubitA.tipMat.diffuseColor = new BABYLON.Color3(1, 0.8, 0.2);
            qubitA.tipMat.emissiveColor = new BABYLON.Color3(0.5, 0.4, 0.1);
            qubitB.tipMat.diffuseColor = new BABYLON.Color3(1, 0.8, 0.2);
            qubitB.tipMat.emissiveColor = new BABYLON.Color3(0.5, 0.4, 0.1);
            removeLink();
            updateStatus("Click ENTANGLE to link the qubits");
            updateTally();
        });

        // ── Animation ──────────────────────────────────────────
        let arrowA = null, arrowB = null;

        scene.onBeforeRenderObservable.add(() => {
            // Update state vectors
            [qubitA, qubitB].forEach((q, idx) => {
                const pos = new BABYLON.Vector3(
                    RADIUS * Math.sin(q.theta) * Math.cos(q.phi),
                    RADIUS * Math.cos(q.theta),
                    RADIUS * Math.sin(q.theta) * Math.sin(q.phi)
                );
                q.tip.position = pos;
            });

            // Arrows
            if (arrowA) arrowA.dispose();
            arrowA = BABYLON.MeshBuilder.CreateLines("arrA", {
                points: [BABYLON.Vector3.Zero(), qubitA.tip.position]
            }, scene);
            arrowA.parent = qubitA.parent;
            arrowA.color = new BABYLON.Color3(1, 0.8, 0.2);

            if (arrowB) arrowB.dispose();
            arrowB = BABYLON.MeshBuilder.CreateLines("arrB", {
                points: [BABYLON.Vector3.Zero(), qubitB.tip.position]
            }, scene);
            arrowB.parent = qubitB.parent;
            arrowB.color = new BABYLON.Color3(1, 0.8, 0.2);

            // Entangled: sync rotation when not measured
            if (entangled && !measured) {
                qubitA.phi += 0.01;
                qubitB.phi = qubitA.phi;
            }

            // Link beam pulse
            if (linkBeam) {
                linkBeam.material.alpha = 0.3 + Math.sin(Date.now() * 0.005) * 0.2;
            }

            // Animate pulses
            for (let i = linkPulses.length - 1; i >= 0; i--) {
                const p = linkPulses[i];
                p.progress += 0.03;
                p.mesh.position.x = (-SEPARATION / 2) + p.progress * SEPARATION;
                p.mat.alpha = 1 - p.progress;
                p.mesh.scaling.setAll(1 + p.progress);
                if (p.progress >= 1) {
                    p.mesh.dispose();
                    p.mat.dispose();
                    linkPulses.splice(i, 1);
                }
            }
        });
    }
});
