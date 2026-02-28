QVR.register({
    id: "drug-discovery",
    title: "21. Drug Discovery",
    subtitle: "Dock the drug molecule — quantum simulation reveals binding energy",
    info: "Simulating molecular interactions is one of the most promising near-term applications. Classical computers can't accurately model molecules beyond ~50 atoms because the quantum state space grows exponentially. Quantum computers can simulate quantum systems natively. This could revolutionize drug design: instead of years of trial and error, simulate millions of molecular interactions to find the perfect drug candidate.",

    async setup(scene, qvr) {
        qvr.createStarfield(scene);
        qvr.createLighting(scene);
        const gl = qvr.createGlow(scene);
        const camera = new BABYLON.ArcRotateCamera("cam", -Math.PI/2, Math.PI/3, 14, new BABYLON.Vector3(0,2.5,0), scene);
        camera.attachControl(qvr.canvas, true);
        const ground = BABYLON.MeshBuilder.CreateGround("ground", {width:20,height:20}, scene);
        ground.material = new BABYLON.StandardMaterial("gm", scene);
        ground.material.diffuseColor = new BABYLON.Color3(0.05,0.05,0.12); ground.material.alpha = 0.3;

        // Protein (target) — cluster of spheres
        const proteinParent = new BABYLON.TransformNode("protein", scene);
        proteinParent.position = new BABYLON.Vector3(2, 2.5, 0);
        const proteinAtoms = [];
        const proteinPositions = [
            [0,0,0],[0.6,0.3,0],[0.3,0.6,0.2],[-0.3,0.4,0.1],[0.1,-0.5,0.3],
            [0.5,-0.2,0.4],[-0.4,-0.3,0.2],[0.2,0.2,-0.4],[-0.2,0.5,-0.2],[0.4,0.1,0.5]
        ];
        const proteinColors = [
            new BABYLON.Color3(0.8,0.2,0.2), new BABYLON.Color3(0.2,0.2,0.8),
            new BABYLON.Color3(0.7,0.7,0.2), new BABYLON.Color3(0.2,0.7,0.3),
        ];
        proteinPositions.forEach((p,i) => {
            const s = BABYLON.MeshBuilder.CreateSphere("pa"+i, {diameter:0.35+Math.random()*0.15, segments:12}, scene);
            s.parent = proteinParent;
            s.position = new BABYLON.Vector3(p[0],p[1],p[2]);
            const m = new BABYLON.StandardMaterial("pam"+i, scene);
            m.diffuseColor = proteinColors[i%proteinColors.length];
            m.specularPower = 32; s.material = m;
            proteinAtoms.push(s);
        });
        qvr.createTextPlane("Target Protein", 24, 2, scene).position = new BABYLON.Vector3(2, 4, 0);

        // Drug molecule — smaller cluster
        const drugParent = new BABYLON.TransformNode("drug", scene);
        drugParent.position = new BABYLON.Vector3(-3, 2.5, 0);
        const drugPositions = [[0,0,0],[0.3,0.2,0],[-0.2,0.3,0.1],[0.1,-0.3,0.2]];
        drugPositions.forEach((p,i) => {
            const s = BABYLON.MeshBuilder.CreateSphere("da"+i, {diameter:0.3, segments:12}, scene);
            s.parent = drugParent;
            s.position = new BABYLON.Vector3(p[0],p[1],p[2]);
            const m = new BABYLON.StandardMaterial("dam"+i, scene);
            m.diffuseColor = new BABYLON.Color3(0.2,0.8,0.9);
            m.emissiveColor = new BABYLON.Color3(0.05,0.2,0.25); s.material = m;
            gl.addIncludedOnlyMesh(s);
        });
        qvr.createTextPlane("Drug Candidate", 24, 2, scene).position = new BABYLON.Vector3(-3, 4, 0);

        // Energy display
        const enP = BABYLON.MeshBuilder.CreatePlane("en", {width:4, height:1.2}, scene);
        enP.position = new BABYLON.Vector3(0, 5.5, 0);
        enP.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        const enTex = new BABYLON.DynamicTexture("enTex", {width:512, height:150}, scene);
        const enMat = new BABYLON.StandardMaterial("enm", scene);
        enMat.diffuseTexture = enTex; enMat.emissiveTexture = enTex;
        enMat.opacityTexture = enTex; enMat.disableLighting = true; enMat.backFaceCulling = false;
        enP.material = enMat;

        let docked = false;
        let docking = false;
        let energy = 0;

        function updateEnergy() {
            const dist = BABYLON.Vector3.Distance(drugParent.position, proteinParent.position);
            energy = dist < 1.5 ? -(3 - dist*2) * 42.5 : 0;
            const ctx = enTex.getContext();
            ctx.clearRect(0,0,512,150);
            ctx.textAlign = "center";
            ctx.font = "bold 22px monospace"; ctx.fillStyle = docked ? "#44ff88" : "#aabbff";
            ctx.fillText("Binding Energy: " + energy.toFixed(1) + " kcal/mol", 256, 35);
            ctx.font = "bold 16px sans-serif"; ctx.fillStyle = "#8899bb";
            ctx.fillText(docked ? "Strong binding! Drug candidate viable." : "Click DOCK to simulate quantum binding", 256, 70);
            ctx.fillText("Classical: ~months | Quantum: ~minutes", 256, 100);
            enTex.update();
        }

        function makeBtn(label, x, y, color, fn) {
            const b = BABYLON.MeshBuilder.CreateBox("b_"+label, {width:1.3, height:0.45, depth:0.2}, scene);
            b.position = new BABYLON.Vector3(x,y,0);
            const m = new BABYLON.StandardMaterial("bm_"+label, scene);
            m.diffuseColor = color; m.emissiveColor = color.scale(0.15); b.material = m;
            qvr.createTextPlane(label, 26, 1.2, scene).position = new BABYLON.Vector3(x,y,0.15);
            b.isPickable = true;
            b.actionManager = new BABYLON.ActionManager(scene);
            b.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, fn));
            b.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOverTrigger, () => m.emissiveColor = color.scale(0.5)));
            b.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOutTrigger, () => m.emissiveColor = color.scale(0.15)));
        }

        makeBtn("DOCK", 0, 0.8, new BABYLON.Color3(0.2,0.8,0.5), () => {
            if (docking) return;
            if (docked) { docked = false; docking = true; drugParent.position.x = -3; setTimeout(()=>{docking=false;},500); return; }
            docking = true;
            let prog = 0;
            const obs = scene.onBeforeRenderObservable.add(() => {
                prog += 0.01;
                drugParent.position.x = -3 + prog * 4.2;
                if (prog >= 1) {
                    scene.onBeforeRenderObservable.remove(obs);
                    drugParent.position.x = 1.2;
                    docked = true; docking = false;
                }
                updateEnergy();
            });
        });
        makeBtn("RESET", 0, 0.2, new BABYLON.Color3(0.5,0.5,0.5), () => {
            docked = false; drugParent.position.x = -3; updateEnergy();
        });

        updateEnergy();

        let t = 0;
        scene.onBeforeRenderObservable.add(() => {
            t += 0.016;
            proteinParent.rotation.y += 0.003;
            if (!docked && !docking) drugParent.rotation.y += 0.008;
            if (docked) {
                // Vibrate slightly
                drugParent.position.x = 1.2 + Math.sin(t*10)*0.02;
                drugParent.position.y = 2.5 + Math.sin(t*8)*0.02;
            }
        });
    }
});
