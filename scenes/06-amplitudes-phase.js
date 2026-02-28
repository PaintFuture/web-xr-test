// Scene 6: Probability Amplitudes & Phase
QVR.register({
    id: "amplitudes-phase",
    title: "6. Amplitudes & Phase",
    subtitle: "Adjust the phase dial — watch waves align or cancel",
    info: "A qubit's state is defined by complex amplitudes with magnitude (probability) and phase (angle). Two qubits can have identical measurement probabilities but behave completely differently because of phase. When phases align, amplitudes add (constructive interference). When opposite, they cancel (destructive). Phase is invisible to measurement but drives all quantum computation.",

    async setup(scene, qvr) {
        qvr.createStarfield(scene);
        qvr.createLighting(scene);
        const gl = qvr.createGlow(scene);

        const camera = new BABYLON.ArcRotateCamera("cam", -Math.PI / 2, Math.PI / 3, 12, new BABYLON.Vector3(0, 2, 0), scene);
        camera.attachControl(qvr.canvas, true);

        const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 20, height: 20 }, scene);
        const gMat = new BABYLON.StandardMaterial("gMat", scene);
        gMat.diffuseColor = new BABYLON.Color3(0.05, 0.05, 0.12);
        gMat.alpha = 0.3;
        ground.material = gMat;

        // ── Two waves made of sphere chains ────────────────────
        const WAVE_POINTS = 40;
        const WAVE_LENGTH = 8;
        const wave1Spheres = [];
        const wave2Spheres = [];

        const mat1 = new BABYLON.StandardMaterial("w1Mat", scene);
        mat1.diffuseColor = new BABYLON.Color3(0.3, 0.5, 1);
        mat1.emissiveColor = new BABYLON.Color3(0.1, 0.15, 0.4);

        const mat2 = new BABYLON.StandardMaterial("w2Mat", scene);
        mat2.diffuseColor = new BABYLON.Color3(1, 0.4, 0.5);
        mat2.emissiveColor = new BABYLON.Color3(0.4, 0.1, 0.15);

        for (let i = 0; i < WAVE_POINTS; i++) {
            const s1 = BABYLON.MeshBuilder.CreateSphere("w1_" + i, { diameter: 0.12, segments: 8 }, scene);
            s1.material = mat1;
            wave1Spheres.push(s1);

            const s2 = BABYLON.MeshBuilder.CreateSphere("w2_" + i, { diameter: 0.12, segments: 8 }, scene);
            s2.material = mat2;
            wave2Spheres.push(s2);
        }

        // ── Combined wave (result of interference) ─────────────
        const combinedSpheres = [];
        const matC = new BABYLON.StandardMaterial("wcMat", scene);
        matC.diffuseColor = new BABYLON.Color3(0.2, 1, 0.5);
        matC.emissiveColor = new BABYLON.Color3(0.05, 0.3, 0.1);

        for (let i = 0; i < WAVE_POINTS; i++) {
            const s = BABYLON.MeshBuilder.CreateSphere("wc_" + i, { diameter: 0.14, segments: 8 }, scene);
            s.material = matC;
            gl.addIncludedOnlyMesh(s);
            combinedSpheres.push(s);
        }

        // Labels
        const l1 = qvr.createTextPlane("Wave A", 32, 1.5, scene);
        l1.position = new BABYLON.Vector3(-4.5, 3.8, 0);
        const l2 = qvr.createTextPlane("Wave B (phase shifted)", 28, 3, scene);
        l2.position = new BABYLON.Vector3(-4.5, 2.3, 0);
        const lc = qvr.createTextPlane("A + B (interference)", 28, 3, scene);
        lc.position = new BABYLON.Vector3(-4.5, 0.5, 0);

        // ── Phase control ──────────────────────────────────────
        let phase = 0; // 0 to 2*PI
        let autoPhase = true;

        // Phase dial (clickable torus)
        const dial = BABYLON.MeshBuilder.CreateTorus("dial", { diameter: 1.2, thickness: 0.08, tessellation: 32 }, scene);
        dial.position = new BABYLON.Vector3(5, 2.5, 0);
        dial.rotation.x = Math.PI / 2;
        const dialMat = new BABYLON.StandardMaterial("dialMat", scene);
        dialMat.diffuseColor = new BABYLON.Color3(0.6, 0.5, 1);
        dialMat.emissiveColor = new BABYLON.Color3(0.2, 0.15, 0.4);
        dial.material = dialMat;

        // Dial indicator
        const indicator = BABYLON.MeshBuilder.CreateSphere("ind", { diameter: 0.15 }, scene);
        indicator.material = makeMat("indMat", new BABYLON.Color3(1, 0.8, 0.2));
        gl.addIncludedOnlyMesh(indicator);

        function makeMat(name, color) {
            const m = new BABYLON.StandardMaterial(name, scene);
            m.diffuseColor = color;
            m.emissiveColor = color.scale(0.3);
            return m;
        }

        // Phase label
        const phasePlane = BABYLON.MeshBuilder.CreatePlane("phasePlane", { width: 2, height: 0.6 }, scene);
        phasePlane.position = new BABYLON.Vector3(5, 3.5, 0);
        phasePlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        const phaseTex = new BABYLON.DynamicTexture("phaseTex", { width: 256, height: 80 }, scene);
        const phaseTexMat = new BABYLON.StandardMaterial("ptMat", scene);
        phaseTexMat.diffuseTexture = phaseTex;
        phaseTexMat.emissiveTexture = phaseTex;
        phaseTexMat.opacityTexture = phaseTex;
        phaseTexMat.disableLighting = true;
        phaseTexMat.backFaceCulling = false;
        phasePlane.material = phaseTexMat;

        // Result label
        const resultPlane = BABYLON.MeshBuilder.CreatePlane("resultPlane", { width: 2.5, height: 0.6 }, scene);
        resultPlane.position = new BABYLON.Vector3(5, 1.5, 0);
        resultPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        const resultTex = new BABYLON.DynamicTexture("resultTex", { width: 320, height: 80 }, scene);
        const resultMat = new BABYLON.StandardMaterial("rMat", scene);
        resultMat.diffuseTexture = resultTex;
        resultMat.emissiveTexture = resultTex;
        resultMat.opacityTexture = resultTex;
        resultMat.disableLighting = true;
        resultMat.backFaceCulling = false;
        resultPlane.material = resultMat;

        // Click dial to toggle auto / step phase
        dial.isPickable = true;
        dial.actionManager = new BABYLON.ActionManager(scene);
        dial.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => {
                if (autoPhase) {
                    autoPhase = false;
                    phase += Math.PI / 4;
                    if (phase > Math.PI * 2) phase -= Math.PI * 2;
                } else {
                    phase += Math.PI / 4;
                    if (phase > Math.PI * 2) {
                        phase = 0;
                        autoPhase = true;
                    }
                }
            })
        );

        // ── Animation ──────────────────────────────────────────
        let t = 0;
        scene.onBeforeRenderObservable.add(() => {
            t += 0.02;
            if (autoPhase) phase += 0.005;

            for (let i = 0; i < WAVE_POINTS; i++) {
                const x = -WAVE_LENGTH / 2 + (i / WAVE_POINTS) * WAVE_LENGTH;
                const freq = 2;

                const y1 = Math.sin(x * freq + t) * 0.5;
                const y2 = Math.sin(x * freq + t + phase) * 0.5;
                const yc = y1 + y2;

                wave1Spheres[i].position.set(x, 3.5 + y1, 0);
                wave2Spheres[i].position.set(x, 2 + y2, 0);
                combinedSpheres[i].position.set(x, 0.5 + yc * 0.5, 0);

                // Scale combined spheres by amplitude
                const amp = Math.abs(yc) / 1.0;
                combinedSpheres[i].scaling.setAll(0.5 + amp);
            }

            // Indicator on dial
            indicator.position.set(
                5 + Math.cos(phase) * 0.6,
                2.5,
                Math.sin(phase) * 0.6
            );

            // Phase label
            const ctx = phaseTex.getContext();
            ctx.clearRect(0, 0, 256, 80);
            ctx.font = "bold 22px monospace";
            ctx.fillStyle = "#bbaaff";
            ctx.textAlign = "center";
            const deg = ((phase * 180 / Math.PI) % 360).toFixed(0);
            ctx.fillText("Phase: " + deg + "\u00B0", 128, 45);
            phaseTex.update();

            // Result label
            const rCtx = resultTex.getContext();
            rCtx.clearRect(0, 0, 320, 80);
            rCtx.font = "18px sans-serif";
            rCtx.textAlign = "center";
            const normPhase = ((phase % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
            if (normPhase < 0.3 || normPhase > Math.PI * 2 - 0.3) {
                rCtx.fillStyle = "#44ff88";
                rCtx.fillText("Constructive!", 160, 45);
            } else if (Math.abs(normPhase - Math.PI) < 0.3) {
                rCtx.fillStyle = "#ff4466";
                rCtx.fillText("Destructive!", 160, 45);
            } else {
                rCtx.fillStyle = "#8899bb";
                rCtx.fillText("Partial interference", 160, 45);
            }
            resultTex.update();
        });
    }
});
