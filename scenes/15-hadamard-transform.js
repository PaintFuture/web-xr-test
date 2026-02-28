QVR.register({
    id: "hadamard-transform",
    title: "15. Hadamard Transform",
    subtitle: "Apply H to all qubits — watch all inputs load simultaneously",
    info: "Applying Hadamard gates to N qubits in |0⟩ creates an equal superposition of all 2^N inputs at once. This is the starting gun of most quantum algorithms — it's how you load all possible inputs simultaneously, enabling quantum parallelism. Classical computers check inputs one by one; quantum computers process them all at once.",

    async setup(scene, qvr) {
        qvr.createStarfield(scene);
        qvr.createLighting(scene);
        const gl = qvr.createGlow(scene);
        const camera = new BABYLON.ArcRotateCamera("cam", -Math.PI/2, Math.PI/3, 14, new BABYLON.Vector3(0,2,0), scene);
        camera.attachControl(qvr.canvas, true);
        const ground = BABYLON.MeshBuilder.CreateGround("ground", {width:20,height:20}, scene);
        ground.material = new BABYLON.StandardMaterial("gm", scene);
        ground.material.diffuseColor = new BABYLON.Color3(0.05,0.05,0.12); ground.material.alpha = 0.3;

        let N = 3;
        let applied = false;
        let qubitMeshes = [];
        let barMeshes = [];

        function rebuild() {
            qubitMeshes.forEach(m => m.dispose());
            barMeshes.forEach(m => m.dispose());
            qubitMeshes = []; barMeshes = [];

            // Qubit spheres (left)
            for (let i = 0; i < N; i++) {
                const s = qvr.createQubitSphere("qb"+i, 0.5, applied ? new BABYLON.Color3(0.2,0.8,0.5) : new BABYLON.Color3(0.3,0.5,1), scene);
                s.position = new BABYLON.Vector3(-5, 3.5 - i*0.8, 0);
                gl.addIncludedOnlyMesh(s);
                qubitMeshes.push(s);
                const lbl = qvr.createTextPlane(applied ? "|+⟩" : "|0⟩", 28, 0.5, scene);
                lbl.position = new BABYLON.Vector3(-4.2, 3.5 - i*0.8, 0);
                qubitMeshes.push(lbl);
            }

            // Histogram bars
            const states = Math.pow(2, N);
            const maxW = 8;
            const bw = Math.min(0.35, maxW/states - 0.02);
            const total = states * (bw + 0.02);
            const startX = -total/2;

            for (let i = 0; i < states; i++) {
                const bar = BABYLON.MeshBuilder.CreateBox("bar"+i, {width:bw, height:1, depth:bw}, scene);
                const x = startX + i*(bw+0.02) + bw/2;
                bar.position = new BABYLON.Vector3(x, 0, 3);
                const m = new BABYLON.StandardMaterial("bm"+i, scene);
                const t = i/Math.max(states-1,1);
                m.diffuseColor = new BABYLON.Color3(0.2+t*0.6, 0.7-t*0.3, 1-t*0.7);
                m.emissiveColor = m.diffuseColor.scale(0.15);
                bar.material = m;
                const h = applied ? 1.5 : (i === 0 ? 3 : 0.01);
                bar.scaling.y = h;
                bar.position.y = h * 0.5;
                barMeshes.push(bar);

                if (states <= 16) {
                    const lbl = qvr.createTextPlane("|"+i.toString(2).padStart(N,"0")+"⟩", 18, bw*3, scene);
                    lbl.position = new BABYLON.Vector3(x, -0.3, 3);
                    barMeshes.push(lbl);
                }
            }
        }

        // Info
        const infoP = BABYLON.MeshBuilder.CreatePlane("info", {width:4, height:1}, scene);
        infoP.position = new BABYLON.Vector3(0, 5, 3);
        infoP.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        const infoTex = new BABYLON.DynamicTexture("it", {width:512, height:128}, scene);
        const infoMat = new BABYLON.StandardMaterial("im", scene);
        infoMat.diffuseTexture = infoTex; infoMat.emissiveTexture = infoTex;
        infoMat.opacityTexture = infoTex; infoMat.disableLighting = true; infoMat.backFaceCulling = false;
        infoP.material = infoMat;

        function updateInfo() {
            const ctx = infoTex.getContext();
            ctx.clearRect(0,0,512,128);
            ctx.textAlign = "center"; ctx.font = "bold 24px monospace"; ctx.fillStyle = "#aabbff";
            ctx.fillText(N + " qubits → " + Math.pow(2,N) + " states", 256, 40);
            ctx.font = "bold 18px sans-serif"; ctx.fillStyle = applied ? "#44ff88" : "#8899bb";
            ctx.fillText(applied ? "All states loaded simultaneously!" : "All qubits in |0⟩ — only one state", 256, 75);
            infoTex.update();
        }

        function makeBtn(label, x, y, color, fn) {
            const b = BABYLON.MeshBuilder.CreateBox("b_"+label, {width:1.2, height:0.45, depth:0.2}, scene);
            b.position = new BABYLON.Vector3(x,y,0);
            const m = new BABYLON.StandardMaterial("bm_"+label, scene);
            m.diffuseColor = color; m.emissiveColor = color.scale(0.15); b.material = m;
            qvr.createTextPlane(label, 26, 1.1, scene).position = new BABYLON.Vector3(x,y,0.15);
            b.isPickable = true;
            b.actionManager = new BABYLON.ActionManager(scene);
            b.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, fn));
            b.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOverTrigger, () => m.emissiveColor = color.scale(0.5)));
            b.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOutTrigger, () => m.emissiveColor = color.scale(0.15)));
        }

        makeBtn("Apply H⊗N", -5, 1, new BABYLON.Color3(0.2,0.8,0.4), () => { applied = true; rebuild(); updateInfo(); });
        makeBtn("+ Qubit", -5, 0.4, new BABYLON.Color3(0.3,0.5,1), () => { if(N<6){N++; applied=false; rebuild(); updateInfo();} });
        makeBtn("− Qubit", -5, -0.2, new BABYLON.Color3(0.8,0.3,0.3), () => { if(N>1){N--; applied=false; rebuild(); updateInfo();} });
        makeBtn("Reset", -5, -0.8, new BABYLON.Color3(0.5,0.5,0.5), () => { applied=false; rebuild(); updateInfo(); });

        rebuild(); updateInfo();

        let t = 0;
        scene.onBeforeRenderObservable.add(() => {
            t += 0.016;
            if (applied) {
                barMeshes.forEach((b,i) => {
                    if (b.scaling) b.scaling.y = 1.5 + Math.sin(t*2+i*0.2)*0.15;
                });
            }
        });
    }
});
