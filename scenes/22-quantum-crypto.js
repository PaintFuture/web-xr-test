QVR.register({
    id: "quantum-crypto",
    title: "22. Quantum Cryptography",
    subtitle: "Exchange a quantum key — try eavesdropping to see it detected",
    info: "Quantum Key Distribution (QKD) uses quantum mechanics to create provably secure encryption keys. Alice sends photons in random bases; Bob measures in random bases. When their bases match, they share a secret bit. Any eavesdropper (Eve) must measure the photons, disturbing them. Alice and Bob detect Eve by comparing a subset of their key — if error rate is too high, Eve is present.",

    async setup(scene, qvr) {
        qvr.createStarfield(scene);
        qvr.createLighting(scene);
        const gl = qvr.createGlow(scene);
        const camera = new BABYLON.ArcRotateCamera("cam", -Math.PI/2, Math.PI/3, 14, new BABYLON.Vector3(0,2,0), scene);
        camera.attachControl(qvr.canvas, true);
        const ground = BABYLON.MeshBuilder.CreateGround("ground", {width:20,height:20}, scene);
        ground.material = new BABYLON.StandardMaterial("gm", scene);
        ground.material.diffuseColor = new BABYLON.Color3(0.05,0.05,0.12); ground.material.alpha = 0.3;

        // Alice (left)
        const alice = BABYLON.MeshBuilder.CreateBox("alice", {width:1.5, height:2, depth:1}, scene);
        alice.position = new BABYLON.Vector3(-5, 1.5, 0);
        const am = new BABYLON.StandardMaterial("am", scene);
        am.diffuseColor = new BABYLON.Color3(0.2,0.3,0.7); am.emissiveColor = new BABYLON.Color3(0.05,0.08,0.2);
        alice.material = am;
        qvr.createTextPlane("Alice", 32, 1.2, scene).position = new BABYLON.Vector3(-5, 3, 0);

        // Bob (right)
        const bob = BABYLON.MeshBuilder.CreateBox("bob", {width:1.5, height:2, depth:1}, scene);
        bob.position = new BABYLON.Vector3(5, 1.5, 0);
        const bm = new BABYLON.StandardMaterial("bm", scene);
        bm.diffuseColor = new BABYLON.Color3(0.2,0.6,0.3); bm.emissiveColor = new BABYLON.Color3(0.05,0.15,0.08);
        bob.material = bm;
        qvr.createTextPlane("Bob", 32, 1.2, scene).position = new BABYLON.Vector3(5, 3, 0);

        // Eve (middle, hidden initially)
        const eve = BABYLON.MeshBuilder.CreateBox("eve", {width:1, height:1.5, depth:0.8}, scene);
        eve.position = new BABYLON.Vector3(0, 1.5, 2);
        const em = new BABYLON.StandardMaterial("em", scene);
        em.diffuseColor = new BABYLON.Color3(0.7,0.2,0.2); em.emissiveColor = new BABYLON.Color3(0.2,0.05,0.05);
        eve.material = em;
        eve.isVisible = false;
        qvr.createTextPlane("Eve", 32, 1, scene).position = new BABYLON.Vector3(0, 3.5, 2);

        // Quantum channel
        const channel = BABYLON.MeshBuilder.CreateCylinder("channel", {diameter:0.05, height:10, tessellation:6}, scene);
        channel.position = new BABYLON.Vector3(0, 2.5, 0); channel.rotation.z = Math.PI/2;
        const chMat = new BABYLON.StandardMaterial("chm", scene);
        chMat.emissiveColor = new BABYLON.Color3(0.2,0.3,0.6); chMat.disableLighting = true; chMat.alpha = 0.4;
        channel.material = chMat;

        let eveActive = false;
        let keyBits = [];
        let errors = 0;
        let photons = [];

        // Status
        const stP = BABYLON.MeshBuilder.CreatePlane("st", {width:5, height:1.5}, scene);
        stP.position = new BABYLON.Vector3(0, 5, 0);
        stP.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        const stTex = new BABYLON.DynamicTexture("stTex", {width:640, height:192}, scene);
        const stMat = new BABYLON.StandardMaterial("stm", scene);
        stMat.diffuseTexture = stTex; stMat.emissiveTexture = stTex;
        stMat.opacityTexture = stTex; stMat.disableLighting = true; stMat.backFaceCulling = false;
        stP.material = stMat;

        function updateStatus() {
            const ctx = stTex.getContext();
            ctx.clearRect(0,0,640,192);
            ctx.textAlign = "center";
            ctx.font = "bold 20px monospace"; ctx.fillStyle = "#aabbff";
            ctx.fillText("Key bits exchanged: " + keyBits.length, 320, 30);
            const errRate = keyBits.length > 0 ? (errors/keyBits.length*100).toFixed(1) : "0.0";
            ctx.fillStyle = errors > keyBits.length*0.15 ? "#ff4444" : "#44ff88";
            ctx.fillText("Error rate: " + errRate + "%", 320, 60);
            ctx.fillStyle = "#8899bb"; ctx.font = "bold 16px sans-serif";
            if (errors > keyBits.length * 0.15 && keyBits.length > 5) {
                ctx.fillStyle = "#ff4444";
                ctx.fillText("HIGH ERROR RATE — Eavesdropper detected!", 320, 95);
                ctx.fillText("Key compromised. Abort and retry.", 320, 120);
            } else if (keyBits.length > 5) {
                ctx.fillStyle = "#44ff88";
                ctx.fillText("Channel secure. Key is safe to use.", 320, 95);
            }
            ctx.fillStyle = "#667799"; ctx.font = "bold 14px sans-serif";
            ctx.fillText("Eve: " + (eveActive ? "ACTIVE (intercepting)" : "inactive"), 320, 150);
            stTex.update();
        }

        function sendPhoton() {
            const photon = BABYLON.MeshBuilder.CreateSphere("ph", {diameter:0.2, segments:8}, scene);
            photon.position = new BABYLON.Vector3(-5, 2.5, 0);
            const pm = new BABYLON.StandardMaterial("phm", scene);
            pm.emissiveColor = new BABYLON.Color3(0.5,0.7,1); pm.disableLighting = true;
            photon.material = pm; gl.addIncludedOnlyMesh(photon);

            const aliceBasis = Math.random() < 0.5 ? 0 : 1;
            const aliceBit = Math.random() < 0.5 ? 0 : 1;
            const bobBasis = Math.random() < 0.5 ? 0 : 1;

            let corrupted = false;
            if (eveActive) {
                // Eve measures in random basis — 50% chance of corruption
                corrupted = Math.random() < 0.5;
            }

            photons.push({mesh:photon, mat:pm, progress:0, aliceBasis, aliceBit, bobBasis, corrupted});
        }

        function makeBtn(label, x, y, color, fn) {
            const b = BABYLON.MeshBuilder.CreateBox("b_"+label, {width:1.4, height:0.45, depth:0.2}, scene);
            b.position = new BABYLON.Vector3(x,y,0);
            const m = new BABYLON.StandardMaterial("bm_"+label, scene);
            m.diffuseColor = color; m.emissiveColor = color.scale(0.15); b.material = m;
            qvr.createTextPlane(label, 24, 1.3, scene).position = new BABYLON.Vector3(x,y,0.15);
            b.isPickable = true;
            b.actionManager = new BABYLON.ActionManager(scene);
            b.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, fn));
            b.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOverTrigger, () => m.emissiveColor = color.scale(0.5)));
            b.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOutTrigger, () => m.emissiveColor = color.scale(0.15)));
        }

        makeBtn("SEND KEY", -5, 0.3, new BABYLON.Color3(0.3,0.5,1), () => {
            for (let i = 0; i < 8; i++) setTimeout(() => sendPhoton(), i*200);
        });
        makeBtn("TOGGLE EVE", 0, 0.3, new BABYLON.Color3(0.8,0.3,0.3), () => {
            eveActive = !eveActive; eve.isVisible = eveActive; updateStatus();
        });
        makeBtn("RESET", 5, 0.3, new BABYLON.Color3(0.5,0.5,0.5), () => {
            keyBits = []; errors = 0; eveActive = false; eve.isVisible = false; updateStatus();
        });

        updateStatus();

        scene.onBeforeRenderObservable.add(() => {
            for (let i = photons.length-1; i >= 0; i--) {
                const p = photons[i];
                p.progress += 0.012;
                p.mesh.position.x = -5 + p.progress * 10;
                if (eveActive && Math.abs(p.mesh.position.x) < 0.5) {
                    p.mat.emissiveColor = new BABYLON.Color3(1,0.3,0.3);
                }
                if (p.progress >= 1) {
                    p.mesh.dispose(); p.mat.dispose();
                    // Only keep bits where bases match
                    if (p.aliceBasis === p.bobBasis) {
                        keyBits.push(p.aliceBit);
                        if (p.corrupted) errors++;
                    }
                    photons.splice(i, 1);
                    updateStatus();
                }
            }
        });
    }
});
