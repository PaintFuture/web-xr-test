// Scene 4: The Bloch Sphere — interactive state vector
QVR.register({
    id: "bloch-sphere",
    title: "4. The Bloch Sphere",
    subtitle: "Drag the state vector arrow to explore qubit states",
    info: "The Bloch sphere maps every possible single-qubit state to a point on a unit sphere. North pole = |0⟩, south pole = |1⟩, equator = equal superposition. The latitude determines measurement probabilities, while the longitude encodes phase — invisible to measurement but crucial for computation. Every single-qubit gate is a rotation on this sphere.",

    async setup(scene, qvr) {
        qvr.createStarfield(scene);
        qvr.createLighting(scene);
        const gl = qvr.createGlow(scene);

        const camera = new BABYLON.ArcRotateCamera("cam", -Math.PI / 4, Math.PI / 3, 8, new BABYLON.Vector3(0, 2, 0), scene);
        camera.attachControl(qvr.canvas, true);

        const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 20, height: 20 }, scene);
        const gMat = new BABYLON.StandardMaterial("gMat", scene);
        gMat.diffuseColor = new BABYLON.Color3(0.05, 0.05, 0.12);
        gMat.alpha = 0.3;
        ground.material = gMat;

        const center = new BABYLON.Vector3(0, 2.5, 0);
        const RADIUS = 2;

        // ── Wireframe sphere ───────────────────────────────────
        const wireSphere = BABYLON.MeshBuilder.CreateSphere("wire", { diameter: RADIUS * 2, segments: 24 }, scene);
        wireSphere.position = center.clone();
        const wireMat = new BABYLON.StandardMaterial("wireMat", scene);
        wireMat.wireframe = true;
        wireMat.emissiveColor = new BABYLON.Color3(0.15, 0.2, 0.4);
        wireMat.disableLighting = true;
        wireMat.alpha = 0.3;
        wireSphere.material = wireMat;

        // ── Axes ───────────────────────────────────────────────
        const axisColors = {
            x: new BABYLON.Color3(1, 0.3, 0.3),
            y: new BABYLON.Color3(0.3, 1, 0.3),
            z: new BABYLON.Color3(0.3, 0.5, 1),
        };

        function createAxis(name, from, to, color) {
            const line = BABYLON.MeshBuilder.CreateLines(name, {
                points: [from.add(center), to.add(center)]
            }, scene);
            line.color = color;
            line.alpha = 0.5;
            return line;
        }

        createAxis("xAxis", new BABYLON.Vector3(-RADIUS - 0.3, 0, 0), new BABYLON.Vector3(RADIUS + 0.3, 0, 0), axisColors.x);
        createAxis("yAxis", new BABYLON.Vector3(0, 0, -RADIUS - 0.3), new BABYLON.Vector3(0, 0, RADIUS + 0.3), axisColors.y);
        createAxis("zAxis", new BABYLON.Vector3(0, -RADIUS - 0.3, 0), new BABYLON.Vector3(0, RADIUS + 0.3, 0), axisColors.z);

        // Axis labels
        const labels = [
            { text: "X", pos: new BABYLON.Vector3(RADIUS + 0.6, 0, 0) },
            { text: "Y", pos: new BABYLON.Vector3(0, 0, RADIUS + 0.6) },
            { text: "|0⟩", pos: new BABYLON.Vector3(0, RADIUS + 0.5, 0) },
            { text: "|1⟩", pos: new BABYLON.Vector3(0, -RADIUS - 0.5, 0) },
        ];
        labels.forEach(l => {
            const lbl = qvr.createTextPlane(l.text, 40, 1, scene);
            lbl.position = l.pos.add(center);
        });

        // Equator ring
        const equator = BABYLON.MeshBuilder.CreateTorus("equator", {
            diameter: RADIUS * 2, thickness: 0.02, tessellation: 64
        }, scene);
        equator.position = center.clone();
        const eqMat = new BABYLON.StandardMaterial("eqMat", scene);
        eqMat.emissiveColor = new BABYLON.Color3(0.2, 0.3, 0.5);
        eqMat.disableLighting = true;
        eqMat.alpha = 0.4;
        equator.material = eqMat;

        // ── State vector ───────────────────────────────────────
        let theta = 0.5; // polar angle (0 = |0⟩, PI = |1⟩)
        let phi = 0;     // azimuthal angle (phase)

        function statePos() {
            return new BABYLON.Vector3(
                RADIUS * Math.sin(theta) * Math.cos(phi),
                RADIUS * Math.cos(theta),
                RADIUS * Math.sin(theta) * Math.sin(phi)
            );
        }

        // Arrow tip
        const tip = BABYLON.MeshBuilder.CreateSphere("tip", { diameter: 0.2, segments: 16 }, scene);
        const tipMat = new BABYLON.StandardMaterial("tipMat", scene);
        tipMat.diffuseColor = new BABYLON.Color3(1, 0.8, 0.2);
        tipMat.emissiveColor = new BABYLON.Color3(0.5, 0.4, 0.1);
        tip.material = tipMat;
        gl.addIncludedOnlyMesh(tip);

        // Arrow line (updated each frame)
        let arrowLine = null;

        // ── Info display ───────────────────────────────────────
        const infoPlane = BABYLON.MeshBuilder.CreatePlane("infoPlane", { width: 3, height: 1.5 }, scene);
        infoPlane.position = new BABYLON.Vector3(3.5, 3.5, 0);
        infoPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        const infoTex = new BABYLON.DynamicTexture("infoTex", { width: 512, height: 256 }, scene);
        const infoMat = new BABYLON.StandardMaterial("infoMat", scene);
        infoMat.diffuseTexture = infoTex;
        infoMat.emissiveTexture = infoTex;
        infoMat.opacityTexture = infoTex;
        infoMat.disableLighting = true;
        infoMat.backFaceCulling = false;
        infoPlane.material = infoMat;

        function updateInfo() {
            const ctx = infoTex.getContext();
            ctx.clearRect(0, 0, 512, 256);
            ctx.font = "bold 22px monospace";
            ctx.fillStyle = "#aabbff";

            const p0 = Math.cos(theta / 2) ** 2;
            const p1 = Math.sin(theta / 2) ** 2;
            const phiDeg = ((phi * 180 / Math.PI) % 360).toFixed(0);

            ctx.fillText(`θ = ${(theta * 180 / Math.PI).toFixed(1)}°`, 20, 40);
            ctx.fillText(`φ = ${phiDeg}°`, 20, 75);
            ctx.fillText(`P(|0⟩) = ${(p0 * 100).toFixed(1)}%`, 20, 120);
            ctx.fillText(`P(|1⟩) = ${(p1 * 100).toFixed(1)}%`, 20, 155);
            ctx.fillStyle = "#667799";
            ctx.font = "bold 16px sans-serif";
            ctx.fillText(`α = cos(θ/2) = ${Math.cos(theta / 2).toFixed(3)}`, 20, 200);
            ctx.fillText(`β = sin(θ/2)·e^(iφ) = ${Math.sin(theta / 2).toFixed(3)}`, 20, 225);
            infoTex.update();
        }

        // ── Animation & interaction ────────────────────────────
        let autoRotate = true;

        scene.onBeforeRenderObservable.add(() => {
            if (autoRotate) {
                phi += 0.005;
                theta = 0.8 + Math.sin(Date.now() * 0.0005) * 0.6;
            }

            const pos = statePos();
            tip.position = pos.add(center);

            // Redraw arrow line
            if (arrowLine) arrowLine.dispose();
            arrowLine = BABYLON.MeshBuilder.CreateLines("arrow", {
                points: [center, tip.position]
            }, scene);
            arrowLine.color = new BABYLON.Color3(1, 0.8, 0.2);

            // Color tip based on state
            const p0 = Math.cos(theta / 2) ** 2;
            tipMat.diffuseColor = new BABYLON.Color3(
                1 - p0 * 0.8,
                0.3 + p0 * 0.5,
                p0
            );
            tipMat.emissiveColor = tipMat.diffuseColor.scale(0.4);

            updateInfo();
        });

        // Click tip to toggle auto-rotation
        tip.isPickable = true;
        tip.actionManager = new BABYLON.ActionManager(scene);
        tip.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => {
                autoRotate = !autoRotate;
            })
        );

        // Click sphere to set state
        wireSphere.isPickable = true;
        wireSphere.actionManager = new BABYLON.ActionManager(scene);
        wireSphere.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, (evt) => {
                autoRotate = false;
                const pickInfo = scene.pick(scene.pointerX, scene.pointerY);
                if (pickInfo.hit) {
                    const local = pickInfo.pickedPoint.subtract(center);
                    const r = local.length();
                    if (r > 0.1) {
                        theta = Math.acos(local.y / r);
                        phi = Math.atan2(local.z, local.x);
                    }
                }
            })
        );

        // ── Preset buttons as 3D objects ───────────────────────
        const presets = [
            { name: "|0⟩", t: 0.001, p: 0, color: new BABYLON.Color3(0.2, 0.5, 1) },
            { name: "|1⟩", t: Math.PI - 0.001, p: 0, color: new BABYLON.Color3(1, 0.3, 0.3) },
            { name: "|+⟩", t: Math.PI / 2, p: 0, color: new BABYLON.Color3(0.2, 1, 0.5) },
            { name: "|−⟩", t: Math.PI / 2, p: Math.PI, color: new BABYLON.Color3(1, 0.7, 0.1) },
        ];

        presets.forEach((pr, i) => {
            const btn = BABYLON.MeshBuilder.CreateBox("preset_" + i, { width: 0.8, height: 0.4, depth: 0.3 }, scene);
            btn.position = new BABYLON.Vector3(-3.5, 1 + i * 0.6, 0);
            const mat = new BABYLON.StandardMaterial("prMat_" + i, scene);
            mat.diffuseColor = pr.color;
            mat.emissiveColor = pr.color.scale(0.2);
            btn.material = mat;

            const lbl = qvr.createTextPlane(pr.name, 36, 0.8, scene);
            lbl.position = new BABYLON.Vector3(-3.5, 1 + i * 0.6, 0.2);

            btn.isPickable = true;
            btn.actionManager = new BABYLON.ActionManager(scene);
            btn.actionManager.registerAction(
                new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => {
                    autoRotate = false;
                    theta = pr.t;
                    phi = pr.p;
                })
            );
            btn.actionManager.registerAction(
                new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOverTrigger, () => {
                    mat.emissiveColor = pr.color.scale(0.5);
                })
            );
            btn.actionManager.registerAction(
                new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOutTrigger, () => {
                    mat.emissiveColor = pr.color.scale(0.2);
                })
            );
        });
    }
});
