QVR.register({
    id: "teleportation",
    title: "13. Quantum Teleportation",
    subtitle: "Watch Alice transfer a quantum state to Bob using entanglement",
    info: "Quantum teleportation transfers a qubit's state using one entangled pair and two classical bits. Alice measures her qubit and half of the entangled pair, getting two classical bits. She sends these to Bob, who applies correction gates to reconstruct the original state. The original is destroyed in the process (no cloning!). This is real physics, demonstrated in labs worldwide.",

    async setup(scene, qvr) {
        qvr.createStarfield(scene);
        qvr.createLighting(scene);
        const gl = qvr.createGlow(scene);
        const camera = new BABYLON.ArcRotateCamera("cam", -Math.PI/2, Math.PI/3.5, 16, new BABYLON.Vector3(0,2,0), scene);
        camera.attachControl(qvr.canvas, true);
        const ground = BABYLON.MeshBuilder.CreateGround("ground", {width:20,height:20}, scene);
        ground.material = new BABYLON.StandardMaterial("gm", scene);
        ground.material.diffuseColor = new BABYLON.Color3(0.05,0.05,0.12); ground.material.alpha = 0.3;

        // Platforms
        function makePlatform(name, x, color) {
            const p = BABYLON.MeshBuilder.CreateCylinder(name, {diameter:3, height:0.2, tessellation:32}, scene);
            p.position = new BABYLON.Vector3(x, 0.1, 0);
            const m = new BABYLON.StandardMaterial(name+"m", scene);
            m.diffuseColor = color; m.emissiveColor = color.scale(0.1); p.material = m;
            return p;
        }
        makePlatform("alicePlat", -5, new BABYLON.Color3(0.15,0.15,0.3));
        makePlatform("bobPlat", 5, new BABYLON.Color3(0.15,0.3,0.15));

        qvr.createTextPlane("Alice", 36, 1.5, scene).position = new BABYLON.Vector3(-5, 4.5, 0);
        qvr.createTextPlane("Bob", 36, 1.5, scene).position = new BABYLON.Vector3(5, 4.5, 0);

        // Mystery qubit (Alice's)
        const mystery = qvr.createQubitSphere("mystery", 0.7, new BABYLON.Color3(1,0.6,0.1), scene);
        mystery.position = new BABYLON.Vector3(-5, 2.5, 0); gl.addIncludedOnlyMesh(mystery);

        // Entangled pair
        const entA = qvr.createQubitSphere("entA", 0.5, new BABYLON.Color3(0.6,0.3,1), scene);
        entA.position = new BABYLON.Vector3(-5, 1.5, 0); gl.addIncludedOnlyMesh(entA);
        const entB = qvr.createQubitSphere("entB", 0.5, new BABYLON.Color3(0.6,0.3,1), scene);
        entB.position = new BABYLON.Vector3(5, 1.5, 0); gl.addIncludedOnlyMesh(entB);

        // Entanglement link
        const entLink = BABYLON.MeshBuilder.CreateCylinder("entLink", {diameter:0.03, height:10, tessellation:6}, scene);
        entLink.position = new BABYLON.Vector3(0,1.5,0); entLink.rotation.z = Math.PI/2;
        const elMat = new BABYLON.StandardMaterial("elm", scene);
        elMat.emissiveColor = new BABYLON.Color3(0.4,0.2,0.8); elMat.disableLighting = true; elMat.alpha = 0.4;
        entLink.material = elMat;

        // Bob's result qubit (hidden initially)
        const result = qvr.createQubitSphere("result", 0.7, new BABYLON.Color3(0.5,0.5,0.5), scene);
        result.position = new BABYLON.Vector3(5, 2.5, 0); result.isVisible = false; gl.addIncludedOnlyMesh(result);

        // Status
        const statusP = BABYLON.MeshBuilder.CreatePlane("st", {width:5, height:0.8}, scene);
        statusP.position = new BABYLON.Vector3(0, 5.5, 0);
        statusP.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        const stTex = new BABYLON.DynamicTexture("stTex", {width:640, height:100}, scene);
        const stMat = new BABYLON.StandardMaterial("stm", scene);
        stMat.diffuseTexture = stTex; stMat.emissiveTexture = stTex;
        stMat.opacityTexture = stTex; stMat.disableLighting = true; stMat.backFaceCulling = false;
        statusP.material = stMat;

        function setStatus(text, color) {
            const ctx = stTex.getContext();
            ctx.clearRect(0,0,640,100);
            ctx.textAlign = "center"; ctx.font = "22px sans-serif"; ctx.fillStyle = color || "#aabbff";
            ctx.fillText(text, 320, 55);
            stTex.update();
        }

        let step = 0;
        let classicalBits = [];
        let animating = false;

        function resetProtocol() {
            step = 0; animating = false; classicalBits = [];
            mystery.position = new BABYLON.Vector3(-5,2.5,0); mystery.isVisible = true;
            mystery.material.diffuseColor = new BABYLON.Color3(1,0.6,0.1);
            mystery.material.emissiveColor = new BABYLON.Color3(0.5,0.3,0.05);
            entA.position = new BABYLON.Vector3(-5,1.5,0); entA.isVisible = true;
            entB.position = new BABYLON.Vector3(5,1.5,0); entB.isVisible = true;
            entLink.isVisible = true;
            result.isVisible = false;
            setStatus("Step 1: Click TELEPORT to begin");
        }

        // Teleport button
        const tBtn = BABYLON.MeshBuilder.CreateBox("tBtn", {width:1.6, height:0.5, depth:0.2}, scene);
        tBtn.position = new BABYLON.Vector3(0, 0.8, 2);
        const tMat = new BABYLON.StandardMaterial("tbm", scene);
        tMat.diffuseColor = new BABYLON.Color3(0.3,0.7,1); tMat.emissiveColor = new BABYLON.Color3(0.1,0.2,0.3);
        tBtn.material = tMat;
        qvr.createTextPlane("TELEPORT", 28, 1.5, scene).position = new BABYLON.Vector3(0, 0.8, 2.15);
        tBtn.isPickable = true;
        tBtn.actionManager = new BABYLON.ActionManager(scene);
        tBtn.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => {
            if (animating) return;
            if (step >= 3) { resetProtocol(); return; }
            animating = true;
            step++;

            if (step === 1) {
                // Alice measures: mystery + entA collapse
                setStatus("Alice measures her qubits...", "#ffaa44");
                setTimeout(() => {
                    classicalBits = [Math.random()<0.5?0:1, Math.random()<0.5?0:1];
                    mystery.material.diffuseColor = new BABYLON.Color3(0.3,0.3,0.3);
                    mystery.material.emissiveColor = new BABYLON.Color3(0.1,0.1,0.1);
                    entA.isVisible = false;
                    setStatus("Measured! Classical bits: " + classicalBits[0] + "," + classicalBits[1] + " — sending to Bob", "#88ddaa");
                    animating = false;
                }, 1000);
            } else if (step === 2) {
                // Classical bits fly to Bob
                setStatus("Sending classical bits to Bob...", "#ffaa44");
                const bits = [];
                for (let i = 0; i < 2; i++) {
                    const bit = BABYLON.MeshBuilder.CreateBox("bit"+i, {size:0.25}, scene);
                    bit.position = new BABYLON.Vector3(-3+i*0.4, 3.5, 0);
                    const bm = new BABYLON.StandardMaterial("bitm"+i, scene);
                    bm.emissiveColor = new BABYLON.Color3(1,1,0.5); bm.disableLighting = true;
                    bit.material = bm;
                    bits.push(bit);
                }
                let prog = 0;
                const obs = scene.onBeforeRenderObservable.add(() => {
                    prog += 0.01;
                    bits.forEach((b,i) => { b.position.x = -3 + i*0.4 + prog*8; });
                    if (prog >= 1) {
                        scene.onBeforeRenderObservable.remove(obs);
                        bits.forEach(b => b.dispose());
                        entLink.isVisible = false;
                        setStatus("Bob applies corrections based on bits " + classicalBits[0]+","+classicalBits[1], "#88ddaa");
                        animating = false;
                    }
                });
            } else if (step === 3) {
                // Bob reconstructs
                setStatus("Bob applies correction gates...", "#ffaa44");
                setTimeout(() => {
                    result.isVisible = true;
                    result.material.diffuseColor = new BABYLON.Color3(1,0.6,0.1);
                    result.material.emissiveColor = new BABYLON.Color3(0.5,0.3,0.05);
                    entB.isVisible = false;
                    mystery.isVisible = false;
                    setStatus("Teleportation complete! State transferred to Bob. Click to reset.", "#44ff88");
                    animating = false;
                }, 1000);
            }
        }));
        tBtn.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOverTrigger, () => tMat.emissiveColor = new BABYLON.Color3(0.2,0.35,0.5)));
        tBtn.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOutTrigger, () => tMat.emissiveColor = new BABYLON.Color3(0.1,0.2,0.3)));

        resetProtocol();

        let t = 0;
        scene.onBeforeRenderObservable.add(() => {
            t += 0.016;
            if (mystery.isVisible) mystery.position.y = 2.5 + Math.sin(t*2)*0.1;
            if (result.isVisible) result.position.y = 2.5 + Math.sin(t*2)*0.1;
            if (entLink.isVisible) elMat.alpha = 0.3 + Math.sin(t*4)*0.15;
        });
    }
});
