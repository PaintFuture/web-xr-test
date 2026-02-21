// Scene 1: Classical Bit vs Qubit
QVR.register({
    id: "bit-vs-qubit",
    title: "1. Classical Bit vs Qubit",
    subtitle: "Click the switch or drag the qubit sphere to see the difference",
    info: "A classical bit is always 0 or 1 — like a light switch. A qubit can exist in a blend of both states simultaneously, described by two amplitudes (α and β) where |α|² + |β|² = 1. This is the foundation of everything in quantum computing.",

    async setup(scene, qvr) {
        qvr.createStarfield(scene);
        const { hemi, point } = qvr.createLighting(scene);
        const gl = qvr.createGlow(scene);

        const camera = new BABYLON.ArcRotateCamera("cam", -Math.PI / 2, Math.PI / 3, 10, new BABYLON.Vector3(0, 1.5, 0), scene);
        camera.attachControl(qvr.canvas, true);

        // Ground
        const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 20, height: 20 }, scene);
        const gMat = new BABYLON.StandardMaterial("gMat", scene);
        gMat.diffuseColor = new BABYLON.Color3(0.05, 0.05, 0.12);
        gMat.alpha = 0.3;
        ground.material = gMat;

        // ── LEFT SIDE: Classical Bit ───────────────────────────
        const classicalLabel = qvr.createTextPlane("Classical Bit", 40, 3, scene);
        classicalLabel.position = new BABYLON.Vector3(-3, 4, 0);

        // Switch base
        const switchBase = BABYLON.MeshBuilder.CreateBox("switchBase", { width: 1.2, height: 2, depth: 0.4 }, scene);
        switchBase.position = new BABYLON.Vector3(-3, 1.5, 0);
        const switchMat = new BABYLON.StandardMaterial("switchMat", scene);
        switchMat.diffuseColor = new BABYLON.Color3(0.15, 0.15, 0.2);
        switchBase.material = switchMat;

        // Switch lever
        const lever = BABYLON.MeshBuilder.CreateBox("lever", { width: 0.4, height: 1, depth: 0.3 }, scene);
        lever.position = new BABYLON.Vector3(-3, 1.5, 0.2);
        const leverMat = new BABYLON.StandardMaterial("leverMat", scene);
        leverMat.diffuseColor = new BABYLON.Color3(0.8, 0.2, 0.2);
        leverMat.emissiveColor = new BABYLON.Color3(0.3, 0.05, 0.05);
        lever.material = leverMat;

        // State display for classical bit
        const bitLight = BABYLON.MeshBuilder.CreateSphere("bitLight", { diameter: 0.8 }, scene);
        bitLight.position = new BABYLON.Vector3(-3, 3.2, 0);
        const bitLightMat = new BABYLON.StandardMaterial("bitLightMat", scene);
        bitLightMat.emissiveColor = new BABYLON.Color3(0.8, 0.1, 0.1);
        bitLightMat.disableLighting = true;
        bitLight.material = bitLightMat;
        gl.addIncludedOnlyMesh(bitLight);

        const bitLabel = qvr.createTextPlane("0", 80, 1, scene);
        bitLabel.position = new BABYLON.Vector3(-3, 0.3, 0);

        let bitState = 0;
        function toggleBit() {
            bitState = 1 - bitState;
            lever.position.y = bitState ? 2.0 : 1.0;
            leverMat.diffuseColor = bitState
                ? new BABYLON.Color3(0.2, 0.8, 0.2)
                : new BABYLON.Color3(0.8, 0.2, 0.2);
            leverMat.emissiveColor = bitState
                ? new BABYLON.Color3(0.05, 0.3, 0.05)
                : new BABYLON.Color3(0.3, 0.05, 0.05);
            bitLightMat.emissiveColor = bitState
                ? new BABYLON.Color3(0.1, 0.9, 0.2)
                : new BABYLON.Color3(0.8, 0.1, 0.1);

            // Update label
            bitLabel.dispose();
            const newLabel = qvr.createTextPlane(bitState ? "1" : "0", 80, 1, scene);
            newLabel.position = new BABYLON.Vector3(-3, 0.3, 0);
        }

        // Click to toggle
        lever.isPickable = true;
        switchBase.isPickable = true;
        lever.actionManager = new BABYLON.ActionManager(scene);
        lever.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, toggleBit)
        );
        switchBase.actionManager = new BABYLON.ActionManager(scene);
        switchBase.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, toggleBit)
        );

        // ── RIGHT SIDE: Qubit ──────────────────────────────────
        const qubitLabel = qvr.createTextPlane("Qubit", 40, 3, scene);
        qubitLabel.position = new BABYLON.Vector3(3, 4, 0);

        // Qubit sphere — color blends between blue (|0⟩) and red (|1⟩)
        const qubit = BABYLON.MeshBuilder.CreateSphere("qubit", { diameter: 1.5, segments: 32 }, scene);
        qubit.position = new BABYLON.Vector3(3, 2, 0);
        const qubitMat = new BABYLON.StandardMaterial("qubitMat", scene);
        qubitMat.specularColor = new BABYLON.Color3(0.4, 0.4, 0.5);
        qubitMat.specularPower = 32;
        qubit.material = qubitMat;
        gl.addIncludedOnlyMesh(qubit);

        // Probability bars
        const bar0 = BABYLON.MeshBuilder.CreateBox("bar0", { width: 0.3, height: 1, depth: 0.3 }, scene);
        bar0.position = new BABYLON.Vector3(2.2, 0.5, 1.5);
        const bar0Mat = new BABYLON.StandardMaterial("bar0Mat", scene);
        bar0Mat.diffuseColor = new BABYLON.Color3(0.2, 0.4, 1);
        bar0Mat.emissiveColor = new BABYLON.Color3(0.05, 0.1, 0.3);
        bar0.material = bar0Mat;

        const bar1 = BABYLON.MeshBuilder.CreateBox("bar1", { width: 0.3, height: 0.01, depth: 0.3 }, scene);
        bar1.position = new BABYLON.Vector3(3.8, 0.005, 1.5);
        const bar1Mat = new BABYLON.StandardMaterial("bar1Mat", scene);
        bar1Mat.diffuseColor = new BABYLON.Color3(1, 0.2, 0.2);
        bar1Mat.emissiveColor = new BABYLON.Color3(0.3, 0.05, 0.05);
        bar1.material = bar1Mat;

        const label0 = qvr.createTextPlane("|0⟩", 36, 1, scene);
        label0.position = new BABYLON.Vector3(2.2, -0.2, 1.5);
        const label1 = qvr.createTextPlane("|1⟩", 36, 1, scene);
        label1.position = new BABYLON.Vector3(3.8, -0.2, 1.5);

        // Blend parameter (0 = fully |0⟩, 1 = fully |1⟩)
        let blend = 0;
        let autoAnimate = true;
        let animDir = 1;

        scene.onBeforeRenderObservable.add(() => {
            if (autoAnimate) {
                blend += 0.003 * animDir;
                if (blend >= 1) { blend = 1; animDir = -1; }
                if (blend <= 0) { blend = 0; animDir = 1; }
            }

            // Color: blue → purple → red
            const r = blend;
            const g = 0.1;
            const b = 1 - blend;
            qubitMat.diffuseColor = new BABYLON.Color3(r, g, b);
            qubitMat.emissiveColor = new BABYLON.Color3(r * 0.3, g * 0.1, b * 0.3);

            // Probability bars
            const p0 = 1 - blend;
            const p1 = blend;
            bar0.scaling.y = Math.max(0.01, p0);
            bar0.position.y = p0 * 0.5;
            bar1.scaling.y = Math.max(0.01, p1);
            bar1.position.y = p1 * 0.5;

            // Gentle float
            qubit.position.y = 2 + Math.sin(Date.now() * 0.001) * 0.15;
            qubit.rotation.y += 0.008;
        });

        // Click qubit to toggle auto-animation / manual
        qubit.isPickable = true;
        qubit.actionManager = new BABYLON.ActionManager(scene);
        qubit.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => {
                autoAnimate = !autoAnimate;
            })
        );
    }
});
