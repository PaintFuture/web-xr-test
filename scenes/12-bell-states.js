QVR.register({
    id: "bell-states",
    title: "12. Bell States",
    subtitle: "Switch between the four Bell states — measure to see correlations",
    info: "Bell states are the four maximally entangled two-qubit states, created by H then CNOT. |Φ+⟩: both same, |Φ-⟩: both same with phase flip, |Ψ+⟩: always opposite, |Ψ-⟩: always opposite with phase flip. They're the 'hello world' of entanglement, used in teleportation and cryptography.",

    async setup(scene, qvr) {
        qvr.createStarfield(scene);
        qvr.createLighting(scene);
        const gl = qvr.createGlow(scene);
        const camera = new BABYLON.ArcRotateCamera("cam", -Math.PI/2, Math.PI/3, 12, new BABYLON.Vector3(0,2.5,0), scene);
        camera.attachControl(qvr.canvas, true);
        const ground = BABYLON.MeshBuilder.CreateGround("ground", {width:20,height:20}, scene);
        ground.material = new BABYLON.StandardMaterial("gm", scene);
        ground.material.diffuseColor = new BABYLON.Color3(0.05,0.05,0.12); ground.material.alpha = 0.3;

        const bellStates = [
            { name: "|Φ+⟩", desc: "Both same: |00⟩+|11⟩", corr: "same", color: new BABYLON.Color3(0.3,0.6,1) },
            { name: "|Φ-⟩", desc: "Both same: |00⟩-|11⟩", corr: "same", color: new BABYLON.Color3(0.2,0.8,0.5) },
            { name: "|Ψ+⟩", desc: "Always opposite: |01⟩+|10⟩", corr: "opp", color: new BABYLON.Color3(1,0.5,0.2) },
            { name: "|Ψ-⟩", desc: "Always opposite: |01⟩-|10⟩", corr: "opp", color: new BABYLON.Color3(0.9,0.3,0.6) },
        ];
        let currentBell = 0;
        let stats = {same:0, opp:0, total:0};

        // Two entangled orbs
        const orbA = qvr.createQubitSphere("orbA", 0.7, bellStates[0].color, scene);
        orbA.position = new BABYLON.Vector3(-1.5, 3, 0); gl.addIncludedOnlyMesh(orbA);
        const orbB = qvr.createQubitSphere("orbB", 0.7, bellStates[0].color, scene);
        orbB.position = new BABYLON.Vector3(1.5, 3, 0); gl.addIncludedOnlyMesh(orbB);

        // Link
        const link = BABYLON.MeshBuilder.CreateCylinder("link", {diameter:0.04, height:3, tessellation:6}, scene);
        link.position = new BABYLON.Vector3(0,3,0); link.rotation.z = Math.PI/2;
        const lkMat = new BABYLON.StandardMaterial("lkm", scene);
        lkMat.emissiveColor = new BABYLON.Color3(0.5,0.3,1); lkMat.disableLighting = true; lkMat.alpha = 0.5;
        link.material = lkMat;

        // Info display
        const infoP = BABYLON.MeshBuilder.CreatePlane("info", {width:4, height:1.5}, scene);
        infoP.position = new BABYLON.Vector3(0, 5, 0);
        infoP.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        const infoTex = new BABYLON.DynamicTexture("it", {width:512, height:192}, scene);
        const infoMat = new BABYLON.StandardMaterial("im", scene);
        infoMat.diffuseTexture = infoTex; infoMat.emissiveTexture = infoTex;
        infoMat.opacityTexture = infoTex; infoMat.disableLighting = true; infoMat.backFaceCulling = false;
        infoP.material = infoMat;

        function updateInfo() {
            const bs = bellStates[currentBell];
            orbA.material.diffuseColor = bs.color; orbA.material.emissiveColor = bs.color.scale(0.3);
            orbB.material.diffuseColor = bs.color; orbB.material.emissiveColor = bs.color.scale(0.3);
            const ctx = infoTex.getContext();
            ctx.clearRect(0,0,512,192);
            ctx.textAlign = "center";
            ctx.font = "bold 28px monospace"; ctx.fillStyle = "#aabbff";
            ctx.fillText(bs.name, 256, 35);
            ctx.font = "20px sans-serif"; ctx.fillStyle = "#8899bb";
            ctx.fillText(bs.desc, 256, 70);
            ctx.font = "18px monospace"; ctx.fillStyle = "#88ddaa";
            if (stats.total > 0) {
                ctx.fillText("Measurements: " + stats.total + "  Same: " + stats.same + "  Opp: " + stats.opp, 256, 110);
                const pct = bs.corr === "same" ? (stats.same/stats.total*100).toFixed(0) : (stats.opp/stats.total*100).toFixed(0);
                ctx.fillText("Correlation: " + pct + "% " + (bs.corr === "same" ? "same" : "opposite"), 256, 140);
            }
            infoTex.update();
        }

        // Bell state selector buttons
        bellStates.forEach((bs, i) => {
            const btn = BABYLON.MeshBuilder.CreateBox("bs_"+i, {width:1, height:0.45, depth:0.2}, scene);
            btn.position = new BABYLON.Vector3(-4, 3.5 - i*0.6, 0);
            const m = new BABYLON.StandardMaterial("bsm_"+i, scene);
            m.diffuseColor = bs.color; m.emissiveColor = bs.color.scale(0.15); btn.material = m;
            qvr.createTextPlane(bs.name, 32, 0.9, scene).position = new BABYLON.Vector3(-4, 3.5 - i*0.6, 0.15);
            btn.isPickable = true;
            btn.actionManager = new BABYLON.ActionManager(scene);
            btn.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => {
                currentBell = i; stats = {same:0, opp:0, total:0}; updateInfo();
            }));
            btn.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOverTrigger, () => m.emissiveColor = bs.color.scale(0.5)));
            btn.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOutTrigger, () => m.emissiveColor = bs.color.scale(0.15)));
        });

        // Measure button
        const measBtn = BABYLON.MeshBuilder.CreateBox("meas", {width:1.4, height:0.5, depth:0.2}, scene);
        measBtn.position = new BABYLON.Vector3(0, 1.5, 0);
        const measMat = new BABYLON.StandardMaterial("mm", scene);
        measMat.diffuseColor = new BABYLON.Color3(1,0.4,0.3); measMat.emissiveColor = new BABYLON.Color3(0.3,0.1,0.08);
        measBtn.material = measMat;
        qvr.createTextPlane("MEASURE", 28, 1.3, scene).position = new BABYLON.Vector3(0, 1.5, 0.15);
        measBtn.isPickable = true;
        measBtn.actionManager = new BABYLON.ActionManager(scene);
        measBtn.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => {
            const bs = bellStates[currentBell];
            const resultA = Math.random() < 0.5 ? 0 : 1;
            const resultB = bs.corr === "same" ? resultA : 1 - resultA;
            if (resultA === resultB) stats.same++; else stats.opp++;
            stats.total++;
            // Flash orbs
            const cA = resultA === 0 ? new BABYLON.Color3(0.2,0.5,1) : new BABYLON.Color3(1,0.3,0.3);
            const cB = resultB === 0 ? new BABYLON.Color3(0.2,0.5,1) : new BABYLON.Color3(1,0.3,0.3);
            orbA.material.diffuseColor = cA; orbA.material.emissiveColor = cA.scale(0.5);
            orbB.material.diffuseColor = cB; orbB.material.emissiveColor = cB.scale(0.5);
            setTimeout(() => updateInfo(), 800);
        }));
        measBtn.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOverTrigger, () => measMat.emissiveColor = new BABYLON.Color3(0.5,0.15,0.1)));
        measBtn.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOutTrigger, () => measMat.emissiveColor = new BABYLON.Color3(0.3,0.1,0.08)));

        updateInfo();

        let t = 0;
        scene.onBeforeRenderObservable.add(() => {
            t += 0.016;
            const orbitR = 1.5;
            const speed = 1 + currentBell * 0.3;
            orbA.position.x = -Math.cos(t * speed) * orbitR;
            orbA.position.z = Math.sin(t * speed) * orbitR;
            orbB.position.x = Math.cos(t * speed) * orbitR;
            orbB.position.z = -Math.sin(t * speed) * orbitR;
            orbA.position.y = 3 + Math.sin(t*2)*0.1;
            orbB.position.y = 3 + Math.sin(t*2+Math.PI)*0.1;
            lkMat.alpha = 0.3 + Math.sin(t*4)*0.15;
        });
    }
});
