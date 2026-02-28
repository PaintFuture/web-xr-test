QVR.register({
    id: "cnot-gate",
    title: "11. The CNOT Gate",
    subtitle: "Set the control qubit, then apply CNOT — watch the target flip",
    info: "The Controlled-NOT gate flips the target qubit only when the control qubit is |1⟩. It's the fundamental two-qubit gate that creates entanglement. CNOT plus single-qubit gates form a universal gate set — you can build any quantum computation from them. When the control is in superposition, CNOT creates entanglement between the two qubits.",

    async setup(scene, qvr) {
        qvr.createStarfield(scene);
        qvr.createLighting(scene);
        const gl = qvr.createGlow(scene);

        const camera = new BABYLON.ArcRotateCamera("cam", -Math.PI/2, Math.PI/3, 12, new BABYLON.Vector3(0,2,0), scene);
        camera.attachControl(qvr.canvas, true);
        const ground = BABYLON.MeshBuilder.CreateGround("ground", {width:20,height:20}, scene);
        ground.material = new BABYLON.StandardMaterial("gm", scene);
        ground.material.diffuseColor = new BABYLON.Color3(0.05,0.05,0.12);
        ground.material.alpha = 0.3;

        // Control qubit (top)
        const ctrlSphere = qvr.createQubitSphere("ctrl", 0.8, new BABYLON.Color3(0.3,0.5,1), scene);
        ctrlSphere.position = new BABYLON.Vector3(-2, 3.5, 0);
        gl.addIncludedOnlyMesh(ctrlSphere);

        // Target qubit (bottom)
        const targetSphere = qvr.createQubitSphere("target", 0.8, new BABYLON.Color3(0.3,0.5,1), scene);
        targetSphere.position = new BABYLON.Vector3(2, 3.5, 0);
        gl.addIncludedOnlyMesh(targetSphere);

        const ctrlLabel = qvr.createTextPlane("Control", 30, 1.5, scene);
        ctrlLabel.position = new BABYLON.Vector3(-2, 4.5, 0);
        const targetLabel = qvr.createTextPlane("Target", 30, 1.5, scene);
        targetLabel.position = new BABYLON.Vector3(2, 4.5, 0);

        let ctrlState = 0; // 0 or 1
        let targetState = 0;
        let superposition = false;

        // State labels
        const stPlane = BABYLON.MeshBuilder.CreatePlane("stP", {width:4, height:1}, scene);
        stPlane.position = new BABYLON.Vector3(0, 1.5, 0);
        stPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        const stTex = new BABYLON.DynamicTexture("stTex", {width:512, height:128}, scene);
        const stMat = new BABYLON.StandardMaterial("stMat", scene);
        stMat.diffuseTexture = stTex; stMat.emissiveTexture = stTex;
        stMat.opacityTexture = stTex; stMat.disableLighting = true;
        stMat.backFaceCulling = false;
        stPlane.material = stMat;

        function updateDisplay() {
            ctrlSphere.material.diffuseColor = ctrlState ? new BABYLON.Color3(1,0.3,0.3) : new BABYLON.Color3(0.3,0.5,1);
            ctrlSphere.material.emissiveColor = ctrlSphere.material.diffuseColor.scale(0.3);
            targetSphere.material.diffuseColor = targetState ? new BABYLON.Color3(1,0.3,0.3) : new BABYLON.Color3(0.3,0.5,1);
            targetSphere.material.emissiveColor = targetSphere.material.diffuseColor.scale(0.3);
            if (superposition) {
                ctrlSphere.material.diffuseColor = new BABYLON.Color3(0.6,0.3,0.9);
                ctrlSphere.material.emissiveColor = new BABYLON.Color3(0.3,0.15,0.45);
            }
            const ctx = stTex.getContext();
            ctx.clearRect(0,0,512,128);
            ctx.textAlign = "center"; ctx.font = "bold 24px monospace"; ctx.fillStyle = "#aabbff";
            if (superposition) {
                ctx.fillText("Control: |0⟩+|1⟩  (superposition)", 256, 40);
                ctx.fillText("State: |00⟩+|11⟩  (entangled!)", 256, 80);
            } else {
                ctx.fillText("Control: |"+ctrlState+"⟩   Target: |"+targetState+"⟩", 256, 40);
                ctx.fillText("State: |"+ctrlState+""+targetState+"⟩", 256, 80);
            }
            stTex.update();
        }

        // Beam between qubits
        let beam = null;
        function fireBeam() {
            if (beam) beam.dispose();
            beam = BABYLON.MeshBuilder.CreateCylinder("beam", {diameter:0.08, height:4, tessellation:8}, scene);
            beam.position = new BABYLON.Vector3(0, 3.5, 0);
            beam.rotation.z = Math.PI/2;
            const bm = new BABYLON.StandardMaterial("bm", scene);
            bm.emissiveColor = new BABYLON.Color3(0.8,0.5,1);
            bm.disableLighting = true; bm.alpha = 0.8;
            beam.material = bm;
            gl.addIncludedOnlyMesh(beam);
            let life = 1;
            const obs = scene.onBeforeRenderObservable.add(() => {
                life -= 0.03;
                bm.alpha = life * 0.8;
                if (life <= 0) { scene.onBeforeRenderObservable.remove(obs); beam.dispose(); beam = null; }
            });
        }

        // Buttons
        function makeBtn(label, x, y, color, fn) {
            const b = BABYLON.MeshBuilder.CreateBox("b_"+label, {width:1.4, height:0.45, depth:0.2}, scene);
            b.position = new BABYLON.Vector3(x, y, 0);
            const m = new BABYLON.StandardMaterial("bm_"+label, scene);
            m.diffuseColor = color; m.emissiveColor = color.scale(0.15); b.material = m;
            qvr.createTextPlane(label, 26, 1.3, scene).position = new BABYLON.Vector3(x, y, 0.15);
            b.isPickable = true;
            b.actionManager = new BABYLON.ActionManager(scene);
            b.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, fn));
            b.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOverTrigger, () => m.emissiveColor = color.scale(0.5)));
            b.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOutTrigger, () => m.emissiveColor = color.scale(0.15)));
        }

        makeBtn("Toggle Control", -3, 2.5, new BABYLON.Color3(0.3,0.5,1), () => {
            superposition = false;
            ctrlState = 1 - ctrlState;
            updateDisplay();
        });
        makeBtn("Superpose Ctrl", -3, 1.9, new BABYLON.Color3(0.6,0.3,0.9), () => {
            superposition = true;
            ctrlState = 0; targetState = 0;
            updateDisplay();
        });
        makeBtn("Apply CNOT", 0, 2.5, new BABYLON.Color3(0.8,0.5,1), () => {
            fireBeam();
            if (!superposition) {
                if (ctrlState === 1) targetState = 1 - targetState;
            }
            updateDisplay();
        });
        makeBtn("Reset", 3, 2.5, new BABYLON.Color3(0.5,0.5,0.5), () => {
            ctrlState = 0; targetState = 0; superposition = false;
            updateDisplay();
        });

        updateDisplay();

        let t = 0;
        scene.onBeforeRenderObservable.add(() => {
            t += 0.016;
            ctrlSphere.position.y = 3.5 + Math.sin(t*2)*0.08;
            targetSphere.position.y = 3.5 + Math.sin(t*2+1)*0.08;
            if (superposition) {
                ctrlSphere.rotation.y += 0.02;
                targetSphere.rotation.y += 0.02;
            }
        });
    }
});
