QVR.register({
    id: "shors-algorithm",
    title: "17. Shor's Algorithm",
    subtitle: "Watch quantum beat classical at breaking a lock",
    info: "Shor's algorithm factors large numbers exponentially faster than any known classical method. It works by finding the period of a modular function using quantum Fourier transform. This threatens RSA encryption — a 2048-bit key that would take classical computers millions of years could be broken by a sufficiently large quantum computer in hours. This is why post-quantum cryptography is being developed now.",

    async setup(scene, qvr) {
        qvr.createStarfield(scene);
        qvr.createLighting(scene);
        const gl = qvr.createGlow(scene);
        const camera = new BABYLON.ArcRotateCamera("cam", -Math.PI/2, Math.PI/3, 14, new BABYLON.Vector3(0,2.5,0), scene);
        camera.attachControl(qvr.canvas, true);
        const ground = BABYLON.MeshBuilder.CreateGround("ground", {width:20,height:20}, scene);
        ground.material = new BABYLON.StandardMaterial("gm", scene);
        ground.material.diffuseColor = new BABYLON.Color3(0.05,0.05,0.12); ground.material.alpha = 0.3;

        // Giant padlock
        const lockBody = BABYLON.MeshBuilder.CreateBox("lock", {width:2.5, height:2, depth:0.8}, scene);
        lockBody.position = new BABYLON.Vector3(0, 2, 0);
        const lockMat = new BABYLON.StandardMaterial("lm", scene);
        lockMat.diffuseColor = new BABYLON.Color3(0.7, 0.6, 0.2);
        lockMat.specularColor = new BABYLON.Color3(0.8,0.7,0.3);
        lockBody.material = lockMat;

        const shackle = BABYLON.MeshBuilder.CreateTorus("shackle", {diameter:1.5, thickness:0.2, tessellation:24}, scene);
        shackle.position = new BABYLON.Vector3(0, 3.3, 0);
        shackle.scaling.y = 0.7;
        shackle.material = lockMat;

        qvr.createTextPlane("RSA-2048", 32, 2, scene).position = new BABYLON.Vector3(0, 2, 0.5);

        // Classical computer (left)
        const classicalBox = BABYLON.MeshBuilder.CreateBox("classical", {width:1.2, height:0.8, depth:0.8}, scene);
        classicalBox.position = new BABYLON.Vector3(-4, 1, 0);
        const cbMat = new BABYLON.StandardMaterial("cbm", scene);
        cbMat.diffuseColor = new BABYLON.Color3(0.3,0.3,0.35); classicalBox.material = cbMat;
        qvr.createTextPlane("Classical", 26, 1.5, scene).position = new BABYLON.Vector3(-4, 2, 0);

        // Quantum computer (right)
        const quantumBox = BABYLON.MeshBuilder.CreateBox("quantum", {width:1.2, height:0.8, depth:0.8}, scene);
        quantumBox.position = new BABYLON.Vector3(4, 1, 0);
        const qbMat = new BABYLON.StandardMaterial("qbm", scene);
        qbMat.diffuseColor = new BABYLON.Color3(0.2,0.3,0.6); qbMat.emissiveColor = new BABYLON.Color3(0.05,0.08,0.2);
        quantumBox.material = qbMat;
        gl.addIncludedOnlyMesh(quantumBox);
        qvr.createTextPlane("Quantum", 26, 1.5, scene).position = new BABYLON.Vector3(4, 2, 0);

        // Progress bars
        let classicalProgress = 0;
        let quantumProgress = 0;
        let running = false;

        const cpBar = BABYLON.MeshBuilder.CreateBox("cpb", {width:0.3, height:1, depth:0.3}, scene);
        cpBar.position = new BABYLON.Vector3(-4, 0, 1.5);
        const cpbMat = new BABYLON.StandardMaterial("cpbm", scene);
        cpbMat.diffuseColor = new BABYLON.Color3(0.8,0.3,0.3); cpbMat.emissiveColor = new BABYLON.Color3(0.2,0.05,0.05);
        cpBar.material = cpbMat;

        const qpBar = BABYLON.MeshBuilder.CreateBox("qpb", {width:0.3, height:1, depth:0.3}, scene);
        qpBar.position = new BABYLON.Vector3(4, 0, 1.5);
        const qpbMat = new BABYLON.StandardMaterial("qpbm", scene);
        qpbMat.diffuseColor = new BABYLON.Color3(0.2,0.8,0.4); qpbMat.emissiveColor = new BABYLON.Color3(0.05,0.2,0.1);
        qpBar.material = qpbMat;

        qvr.createTextPlane("Classical", 20, 1.2, scene).position = new BABYLON.Vector3(-4, -0.3, 1.5);
        qvr.createTextPlane("Quantum", 20, 1.2, scene).position = new BABYLON.Vector3(4, -0.3, 1.5);

        // Status
        const stP = BABYLON.MeshBuilder.CreatePlane("st", {width:5, height:1}, scene);
        stP.position = new BABYLON.Vector3(0, 5.5, 0);
        stP.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        const stTex = new BABYLON.DynamicTexture("stTex", {width:640, height:128}, scene);
        const stMat = new BABYLON.StandardMaterial("stm", scene);
        stMat.diffuseTexture = stTex; stMat.emissiveTexture = stTex;
        stMat.opacityTexture = stTex; stMat.disableLighting = true; stMat.backFaceCulling = false;
        stP.material = stMat;

        function updateStatus() {
            const ctx = stTex.getContext();
            ctx.clearRect(0,0,640,128);
            ctx.textAlign = "center";
            ctx.font = "bold 20px monospace"; ctx.fillStyle = "#aabbff";
            ctx.fillText("Classical: " + (classicalProgress*100).toFixed(1) + "% (est: millions of years)", 320, 35);
            ctx.fillStyle = "#88ddaa";
            ctx.fillText("Quantum: " + (quantumProgress*100).toFixed(1) + "% (est: hours)", 320, 65);
            if (quantumProgress >= 1) {
                ctx.fillStyle = "#44ff88"; ctx.font = "bold 22px sans-serif";
                ctx.fillText("Quantum wins! Lock broken via period-finding.", 320, 105);
            }
            stTex.update();
        }

        // Race button
        const rBtn = BABYLON.MeshBuilder.CreateBox("race", {width:1.4, height:0.5, depth:0.2}, scene);
        rBtn.position = new BABYLON.Vector3(0, 0.5, 3);
        const rMat = new BABYLON.StandardMaterial("rm", scene);
        rMat.diffuseColor = new BABYLON.Color3(0.3,0.7,1); rMat.emissiveColor = new BABYLON.Color3(0.1,0.2,0.3);
        rBtn.material = rMat;
        qvr.createTextPlane("START RACE", 26, 1.3, scene).position = new BABYLON.Vector3(0, 0.5, 3.15);
        rBtn.isPickable = true;
        rBtn.actionManager = new BABYLON.ActionManager(scene);
        rBtn.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => {
            if (running) return;
            running = true; classicalProgress = 0; quantumProgress = 0;
        }));
        rBtn.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOverTrigger, () => rMat.emissiveColor = new BABYLON.Color3(0.2,0.35,0.5)));
        rBtn.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOutTrigger, () => rMat.emissiveColor = new BABYLON.Color3(0.1,0.2,0.3)));

        updateStatus();

        let t = 0;
        scene.onBeforeRenderObservable.add(() => {
            t += 0.016;
            if (running) {
                classicalProgress += 0.00005; // Glacially slow
                quantumProgress += 0.003; // Fast
                if (quantumProgress >= 1) { quantumProgress = 1; running = false; }
                cpBar.scaling.y = Math.max(0.01, classicalProgress * 3);
                cpBar.position.y = classicalProgress * 1.5;
                qpBar.scaling.y = Math.max(0.01, quantumProgress * 3);
                qpBar.position.y = quantumProgress * 1.5;
                updateStatus();

                if (quantumProgress >= 1) {
                    // Unlock animation
                    lockMat.emissiveColor = new BABYLON.Color3(0.3,0.2,0);
                    shackle.position.y = 3.8;
                    shackle.rotation.z = 0.3;
                }
            }
            quantumBox.material.emissiveColor = new BABYLON.Color3(
                0.05+Math.sin(t*3)*0.03, 0.08+Math.sin(t*4)*0.03, 0.2+Math.sin(t*2)*0.05
            );
        });
    }
});
