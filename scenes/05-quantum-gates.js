// Scene 5: Single-Qubit Gates — apply gates and watch Bloch sphere rotations
QVR.register({
    id: "quantum-gates",
    title: "5. Quantum Gates",
    subtitle: "Click a gate to apply it — watch the state vector rotate on the Bloch sphere",
    info: "Quantum gates are reversible operations that rotate the qubit's state on the Bloch sphere. X gate (NOT): flips |0⟩↔|1⟩ — a 180° rotation around the X axis. Z gate: flips the phase — 180° around Z. H gate (Hadamard): creates superposition from |0⟩ — the most important gate in quantum computing. Unlike classical gates, quantum gates never destroy information.",

    async setup(scene, qvr) {
        qvr.createStarfield(scene);
        qvr.createLighting(scene);
        const gl = qvr.createGlow(scene);

        const camera = new BABYLON.ArcRotateCamera("cam", -Math.PI / 4, Math.PI / 3, 9, new BABYLON.Vector3(0, 2, 0), scene);
        camera.attachControl(qvr.canvas, true);

        const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 20, height: 20 }, scene);
        const gMat = new BABYLON.StandardMaterial("gMat", scene);
        gMat.diffuseColor = new BABYLON.Color3(0.05, 0.05, 0.12);
        gMat.alpha = 0.3;
        ground.material = gMat;

        const center = new BABYLON.Vector3(0, 2.5, 0);
        const RADIUS = 1.8;

        // ── Bloch sphere (compact) ─────────────────────────────
        const wireSphere = BABYLON.MeshBuilder.CreateSphere("wire", { diameter: RADIUS * 2, segments: 20 }, scene);
        wireSphere.position = center.clone();
        const wireMat = new BABYLON.StandardMaterial("wireMat", scene);
        wireMat.wireframe = true;
        wireMat.emissiveColor = new BABYLON.Color3(0.12, 0.15, 0.3);
        wireMat.disableLighting = true;
        wireMat.alpha = 0.25;
        wireSphere.material = wireMat;

        // Equator
        const equator = BABYLON.MeshBuilder.CreateTorus("eq", { diameter: RADIUS * 2, thickness: 0.015, tessellation: 64 }, scene);
        equator.position = center.clone();
        const eqMat = new BABYLON.StandardMaterial("eqMat", scene);
        eqMat.emissiveColor = new BABYLON.Color3(0.15, 0.2, 0.4);
        eqMat.disableLighting = true;
        eqMat.alpha = 0.3;
        equator.material = eqMat;

        // Pole labels
        const l0 = qvr.createTextPlane("|0⟩", 36, 0.8, scene);
        l0.position = center.add(new BABYLON.Vector3(0, RADIUS + 0.4, 0));
        const l1 = qvr.createTextPlane("|1⟩", 36, 0.8, scene);
        l1.position = center.add(new BABYLON.Vector3(0, -RADIUS - 0.4, 0));

        // ── State ──────────────────────────────────────────────
        let theta = 0.001; // start at |0⟩
        let phi = 0;

        // Target state for animation
        let targetTheta = theta;
        let targetPhi = phi;
        let animating = false;
        let trailPoints = [];

        function statePos(t, p) {
            return new BABYLON.Vector3(
                RADIUS * Math.sin(t) * Math.cos(p),
                RADIUS * Math.cos(t),
                RADIUS * Math.sin(t) * Math.sin(p)
            );
        }

        // State vector tip
        const tip = BABYLON.MeshBuilder.CreateSphere("tip", { diameter: 0.18, segments: 16 }, scene);
        const tipMat = new BABYLON.StandardMaterial("tipMat", scene);
        tipMat.diffuseColor = new BABYLON.Color3(1, 0.8, 0.2);
        tipMat.emissiveColor = new BABYLON.Color3(0.5, 0.4, 0.1);
        tip.material = tipMat;
        gl.addIncludedOnlyMesh(tip);

        let arrowLine = null;
        let trailMesh = null;

        // ── Gate definitions ───────────────────────────────────
        // Each gate transforms (theta, phi) -> (newTheta, newPhi)
        const gates = [
            {
                name: "X",
                desc: "NOT gate\n180° around X",
                color: new BABYLON.Color3(1, 0.3, 0.3),
                apply: (t, p) => [Math.PI - t, -p],
            },
            {
                name: "Z",
                desc: "Phase flip\n180° around Z",
                color: new BABYLON.Color3(0.3, 0.5, 1),
                apply: (t, p) => [t, p + Math.PI],
            },
            {
                name: "H",
                desc: "Hadamard\nCreates superposition",
                color: new BABYLON.Color3(0.2, 0.9, 0.4),
                apply: (t, p) => {
                    // H maps |0⟩ → |+⟩, |1⟩ → |−⟩
                    // On Bloch sphere: reflection about the X+Z diagonal
                    const x = Math.sin(t) * Math.cos(p);
                    const y = Math.sin(t) * Math.sin(p);
                    const z = Math.cos(t);
                    // H: (x,y,z) -> (z, -y, x)
                    const nx = z;
                    const ny = -y;
                    const nz = x;
                    const newTheta = Math.acos(Math.max(-1, Math.min(1, nz)));
                    const newPhi = Math.atan2(ny, nx);
                    return [newTheta, newPhi];
                },
            },
            {
                name: "S",
                desc: "Phase gate\n90° around Z",
                color: new BABYLON.Color3(0.8, 0.5, 1),
                apply: (t, p) => [t, p + Math.PI / 2],
            },
            {
                name: "T",
                desc: "π/8 gate\n45° around Z",
                color: new BABYLON.Color3(1, 0.7, 0.2),
                apply: (t, p) => [t, p + Math.PI / 4],
            },
            {
                name: "RST",
                desc: "Reset to |0⟩",
                color: new BABYLON.Color3(0.5, 0.5, 0.5),
                apply: () => [0.001, 0],
            },
        ];

        // ── Gate buttons ───────────────────────────────────────
        gates.forEach((gate, i) => {
            const btn = BABYLON.MeshBuilder.CreateBox("gate_" + i, { width: 0.9, height: 0.5, depth: 0.3 }, scene);
            btn.position = new BABYLON.Vector3(-3.5, 3.5 - i * 0.7, 0);
            const mat = new BABYLON.StandardMaterial("gateMat_" + i, scene);
            mat.diffuseColor = gate.color;
            mat.emissiveColor = gate.color.scale(0.15);
            btn.material = mat;

            const lbl = qvr.createTextPlane(gate.name, 44, 0.8, scene);
            lbl.position = new BABYLON.Vector3(-3.5, 3.5 - i * 0.7, 0.2);

            btn.isPickable = true;
            btn.actionManager = new BABYLON.ActionManager(scene);
            btn.actionManager.registerAction(
                new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => {
                    if (animating) return;
                    const [nt, np] = gate.apply(theta, phi);
                    targetTheta = nt;
                    targetPhi = np;
                    animating = true;
                    trailPoints = [];

                    // Flash the button
                    mat.emissiveColor = gate.color.scale(0.8);
                    setTimeout(() => { mat.emissiveColor = gate.color.scale(0.15); }, 300);
                })
            );
            btn.actionManager.registerAction(
                new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOverTrigger, () => {
                    mat.emissiveColor = gate.color.scale(0.4);
                })
            );
            btn.actionManager.registerAction(
                new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOutTrigger, () => {
                    mat.emissiveColor = gate.color.scale(0.15);
                })
            );
        });

        // ── State info display ─────────────────────────────────
        const infoPlane = BABYLON.MeshBuilder.CreatePlane("info", { width: 2.5, height: 1 }, scene);
        infoPlane.position = new BABYLON.Vector3(3, 4, 0);
        infoPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        const infoTex = new BABYLON.DynamicTexture("infoTex", { width: 400, height: 160 }, scene);
        const infoMat = new BABYLON.StandardMaterial("infoMat", scene);
        infoMat.diffuseTexture = infoTex;
        infoMat.emissiveTexture = infoTex;
        infoMat.opacityTexture = infoTex;
        infoMat.disableLighting = true;
        infoMat.backFaceCulling = false;
        infoPlane.material = infoMat;

        // ── Render loop ────────────────────────────────────────
        scene.onBeforeRenderObservable.add(() => {
            // Animate toward target
            if (animating) {
                const speed = 0.06;
                const dTheta = targetTheta - theta;
                const dPhi = targetPhi - phi;

                if (Math.abs(dTheta) < 0.01 && Math.abs(dPhi) < 0.01) {
                    theta = targetTheta;
                    phi = targetPhi;
                    animating = false;
                } else {
                    theta += dTheta * speed;
                    phi += dPhi * speed;
                    trailPoints.push(statePos(theta, phi).add(center));
                }
            }

            // Update tip
            const pos = statePos(theta, phi);
            tip.position = pos.add(center);

            // Arrow line
            if (arrowLine) arrowLine.dispose();
            arrowLine = BABYLON.MeshBuilder.CreateLines("arrow", {
                points: [center, tip.position]
            }, scene);
            arrowLine.color = new BABYLON.Color3(1, 0.8, 0.2);

            // Trail
            if (trailMesh) trailMesh.dispose();
            if (trailPoints.length > 2) {
                trailMesh = BABYLON.MeshBuilder.CreateLines("trail", {
                    points: trailPoints.slice(-50)
                }, scene);
                trailMesh.color = new BABYLON.Color3(0.5, 0.8, 1);
                trailMesh.alpha = 0.6;
            }

            // Info
            const ctx = infoTex.getContext();
            ctx.clearRect(0, 0, 400, 160);
            ctx.font = "20px monospace";
            ctx.fillStyle = "#aabbff";
            const p0 = (Math.cos(theta / 2) ** 2 * 100).toFixed(1);
            const p1 = (Math.sin(theta / 2) ** 2 * 100).toFixed(1);
            ctx.fillText(`P(|0⟩) = ${p0}%`, 15, 35);
            ctx.fillText(`P(|1⟩) = ${p1}%`, 15, 65);
            ctx.fillStyle = "#667799";
            ctx.font = "16px monospace";
            ctx.fillText(`θ=${(theta * 180 / Math.PI).toFixed(0)}° φ=${(phi * 180 / Math.PI).toFixed(0)}°`, 15, 100);
            if (animating) {
                ctx.fillStyle = "#ffcc44";
                ctx.fillText("Applying gate...", 15, 135);
            }
            infoTex.update();
        });
    }
});
