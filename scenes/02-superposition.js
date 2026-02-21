// Scene 2: Superposition — spinning coin metaphor
QVR.register({
    id: "superposition",
    title: "2. Superposition",
    subtitle: "Click the coin to measure it — watch probabilities collapse",
    info: "A qubit in superposition is like a coin spinning in the air — it's not heads or tails, but genuinely both at once. Each state has a probability amplitude. When you measure (catch the coin), it snaps to one definite outcome. The probability of each outcome depends on the amplitudes. Try measuring many times to see the statistics build up!",

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

        // ── Coin ───────────────────────────────────────────────
        const coin = BABYLON.MeshBuilder.CreateCylinder("coin", {
            diameter: 2, height: 0.15, tessellation: 48
        }, scene);
        coin.position.y = 3;
        coin.rotation.x = Math.PI / 2;

        // Two-sided material
        const coinMat = new BABYLON.StandardMaterial("coinMat", scene);
        coinMat.diffuseColor = new BABYLON.Color3(0.9, 0.75, 0.2);
        coinMat.emissiveColor = new BABYLON.Color3(0.2, 0.15, 0.02);
        coinMat.specularColor = new BABYLON.Color3(1, 0.9, 0.5);
        coinMat.specularPower = 64;
        coin.material = coinMat;
        gl.addIncludedOnlyMesh(coin);

        // Face labels on coin
        const headsFace = BABYLON.MeshBuilder.CreatePlane("heads", { size: 1.4 }, scene);
        headsFace.parent = coin;
        headsFace.position.z = 0.08;
        const headsTex = new BABYLON.DynamicTexture("headsTex", 256, scene);
        const hCtx = headsTex.getContext();
        hCtx.fillStyle = "#1a3a8a";
        hCtx.font = "bold 100px sans-serif";
        hCtx.textAlign = "center";
        hCtx.textBaseline = "middle";
        hCtx.fillText("|0⟩", 128, 128);
        headsTex.update();
        const headsMat = new BABYLON.StandardMaterial("headsMat", scene);
        headsMat.diffuseTexture = headsTex;
        headsMat.emissiveTexture = headsTex;
        headsMat.disableLighting = true;
        headsMat.backFaceCulling = true;
        headsFace.material = headsMat;

        const tailsFace = BABYLON.MeshBuilder.CreatePlane("tails", { size: 1.4 }, scene);
        tailsFace.parent = coin;
        tailsFace.position.z = -0.08;
        tailsFace.rotation.y = Math.PI;
        const tailsTex = new BABYLON.DynamicTexture("tailsTex", 256, scene);
        const tCtx = tailsTex.getContext();
        tCtx.fillStyle = "#8a1a1a";
        tCtx.font = "bold 100px sans-serif";
        tCtx.textAlign = "center";
        tCtx.textBaseline = "middle";
        tCtx.fillText("|1⟩", 128, 128);
        tailsTex.update();
        const tailsMat = new BABYLON.StandardMaterial("tailsMat", scene);
        tailsMat.diffuseTexture = tailsTex;
        tailsMat.emissiveTexture = tailsTex;
        tailsMat.disableLighting = true;
        tailsMat.backFaceCulling = true;
        tailsFace.material = tailsMat;

        // ── State ──────────────────────────────────────────────
        let spinning = true;
        let measured = false;
        let spinSpeed = 0.15;
        let measureResult = 0;
        let stats = { zero: 0, one: 0 };
        let cooldown = false;

        // Probability bars
        const barWidth = 0.6;
        const barMaxH = 3;
        const bar0 = BABYLON.MeshBuilder.CreateBox("bar0", { width: barWidth, height: 1, depth: barWidth }, scene);
        bar0.position = new BABYLON.Vector3(-2, 0, 2);
        const b0Mat = new BABYLON.StandardMaterial("b0Mat", scene);
        b0Mat.diffuseColor = new BABYLON.Color3(0.2, 0.4, 1);
        b0Mat.emissiveColor = new BABYLON.Color3(0.05, 0.1, 0.3);
        bar0.material = b0Mat;

        const bar1 = BABYLON.MeshBuilder.CreateBox("bar1", { width: barWidth, height: 1, depth: barWidth }, scene);
        bar1.position = new BABYLON.Vector3(-0.5, 0, 2);
        const b1Mat = new BABYLON.StandardMaterial("b1Mat", scene);
        b1Mat.diffuseColor = new BABYLON.Color3(1, 0.2, 0.3);
        b1Mat.emissiveColor = new BABYLON.Color3(0.3, 0.05, 0.05);
        bar1.material = b1Mat;

        const l0 = qvr.createTextPlane("|0⟩", 36, 1, scene);
        l0.position = new BABYLON.Vector3(-2, -0.3, 2);
        const l1 = qvr.createTextPlane("|1⟩", 36, 1, scene);
        l1.position = new BABYLON.Vector3(-0.5, -0.3, 2);
        const statsLabel = qvr.createTextPlane("Measurements: 0", 28, 3, scene);
        statsLabel.position = new BABYLON.Vector3(-1.25, 4, 2);

        function updateBars() {
            const total = stats.zero + stats.one || 1;
            const h0 = (stats.zero / total) * barMaxH;
            const h1 = (stats.one / total) * barMaxH;
            bar0.scaling.y = Math.max(0.01, h0);
            bar0.position.y = h0 * 0.5;
            bar1.scaling.y = Math.max(0.01, h1);
            bar1.position.y = h1 * 0.5;

            // Update stats label
            statsLabel.dispose();
            const newLabel = qvr.createTextPlane(
                `Measurements: ${total > 1 ? total - 1 : 0}  |  |0⟩: ${stats.zero}  |1⟩: ${stats.one}`,
                24, 5, scene
            );
            newLabel.position = new BABYLON.Vector3(-1.25, 4, 2);
        }

        // ── Animation ──────────────────────────────────────────
        scene.onBeforeRenderObservable.add(() => {
            if (spinning) {
                coin.rotation.z += spinSpeed;
                coin.position.y = 3 + Math.sin(Date.now() * 0.002) * 0.3;
                // Glow while spinning
                coinMat.emissiveColor = new BABYLON.Color3(
                    0.2 + Math.sin(Date.now() * 0.003) * 0.1,
                    0.15 + Math.sin(Date.now() * 0.004) * 0.05,
                    0.3 + Math.sin(Date.now() * 0.005) * 0.1
                );
            } else if (measured) {
                // Slow down spin
                spinSpeed *= 0.92;
                coin.rotation.z += spinSpeed;
                if (spinSpeed < 0.001) {
                    // Snap to result
                    coin.rotation.z = measureResult === 0 ? 0 : Math.PI;
                    coin.position.y = 2;
                    coinMat.emissiveColor = measureResult === 0
                        ? new BABYLON.Color3(0.05, 0.1, 0.4)
                        : new BABYLON.Color3(0.4, 0.05, 0.05);
                    measured = false;
                }
            }
        });

        // ── Measure on click ───────────────────────────────────
        coin.isPickable = true;
        coin.actionManager = new BABYLON.ActionManager(scene);
        coin.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => {
                if (cooldown) return;

                if (spinning) {
                    // Measure!
                    measured = true;
                    spinning = false;
                    measureResult = Math.random() < 0.5 ? 0 : 1;
                    if (measureResult === 0) stats.zero++; else stats.one++;
                    updateBars();

                    // Collapse flash
                    const flash = BABYLON.MeshBuilder.CreateSphere("flash", { diameter: 3 }, scene);
                    flash.position = coin.position.clone();
                    const fMat = new BABYLON.StandardMaterial("fMat", scene);
                    fMat.emissiveColor = new BABYLON.Color3(1, 1, 1);
                    fMat.disableLighting = true;
                    fMat.alpha = 0.8;
                    flash.material = fMat;
                    let life = 1;
                    const obs = scene.onBeforeRenderObservable.add(() => {
                        life -= 0.05;
                        flash.scaling.setAll(1 + (1 - life) * 2);
                        fMat.alpha = life * 0.8;
                        if (life <= 0) {
                            scene.onBeforeRenderObservable.remove(obs);
                            flash.dispose();
                            fMat.dispose();
                        }
                    });

                    cooldown = true;
                    setTimeout(() => { cooldown = false; }, 1500);
                } else {
                    // Re-spin
                    spinning = true;
                    spinSpeed = 0.15;
                    measured = false;
                }
            })
        );

        updateBars();
    }
});
