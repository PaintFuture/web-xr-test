QVR.register({
    id: "grovers-search",
    title: "16. Grover's Search",
    subtitle: "Click STEP to amplify the marked item — watch it emerge from the crowd",
    info: "Grover's algorithm finds a marked item in an unsorted database of N items in ~√N steps instead of N. It works by repeatedly applying two operations: an oracle that marks the target (phase flip), and a diffusion operator that amplifies the marked amplitude while suppressing others. After ~√N iterations, the target has nearly 100% probability.",

    async setup(scene, qvr) {
        qvr.createStarfield(scene);
        qvr.createLighting(scene);
        const gl = qvr.createGlow(scene);
        const camera = new BABYLON.ArcRotateCamera("cam", -Math.PI/2, Math.PI/3, 14, new BABYLON.Vector3(0,2,0), scene);
        camera.attachControl(qvr.canvas, true);
        const ground = BABYLON.MeshBuilder.CreateGround("ground", {width:20,height:20}, scene);
        ground.material = new BABYLON.StandardMaterial("gm", scene);
        ground.material.diffuseColor = new BABYLON.Color3(0.05,0.05,0.12); ground.material.alpha = 0.3;

        const N = 8; // 8 items (3 qubits)
        const target = Math.floor(Math.random() * N);
        let amplitudes = new Array(N).fill(1/Math.sqrt(N));
        let iteration = 0;
        const optimalIter = Math.round(Math.PI/4 * Math.sqrt(N));

        // Bars
        const bars = [];
        const bw = 0.5;
        const startX = -(N*(bw+0.1))/2;
        for (let i = 0; i < N; i++) {
            const bar = BABYLON.MeshBuilder.CreateBox("bar"+i, {width:bw, height:1, depth:bw}, scene);
            const x = startX + i*(bw+0.1) + bw/2;
            bar.position = new BABYLON.Vector3(x, 0, 2);
            const m = new BABYLON.StandardMaterial("bm"+i, scene);
            m.diffuseColor = i === target ? new BABYLON.Color3(1,0.8,0.1) : new BABYLON.Color3(0.3,0.5,0.8);
            m.emissiveColor = m.diffuseColor.scale(0.15);
            bar.material = m;
            bars.push(bar);

            const lbl = qvr.createTextPlane("|"+i.toString(2).padStart(3,"0")+"⟩", 20, bw*2, scene);
            lbl.position = new BABYLON.Vector3(x, -0.3, 2);
        }

        // Target marker
        const marker = qvr.createTextPlane("★ TARGET", 24, 1.2, scene);
        marker.position = new BABYLON.Vector3(startX + target*(bw+0.1) + bw/2, 4, 2);

        function updateBars() {
            for (let i = 0; i < N; i++) {
                const h = Math.abs(amplitudes[i]) * Math.sqrt(N) * 2;
                bars[i].scaling.y = Math.max(0.01, h);
                bars[i].position.y = h * 0.5;
                const bright = Math.abs(amplitudes[i]) * Math.sqrt(N);
                if (i === target) {
                    bars[i].material.emissiveColor = new BABYLON.Color3(bright*0.4, bright*0.3, 0);
                } else {
                    bars[i].material.emissiveColor = new BABYLON.Color3(0, bright*0.1, bright*0.2);
                }
            }
        }

        function groverStep() {
            // Oracle: flip target amplitude
            amplitudes[target] = -amplitudes[target];
            // Diffusion: reflect about mean
            const mean = amplitudes.reduce((a,b) => a+b, 0) / N;
            for (let i = 0; i < N; i++) {
                amplitudes[i] = 2 * mean - amplitudes[i];
            }
            iteration++;
        }

        // Info
        const infoP = BABYLON.MeshBuilder.CreatePlane("info", {width:4, height:1.2}, scene);
        infoP.position = new BABYLON.Vector3(0, 5.5, 2);
        infoP.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        const infoTex = new BABYLON.DynamicTexture("it", {width:512, height:150}, scene);
        const infoMat = new BABYLON.StandardMaterial("im", scene);
        infoMat.diffuseTexture = infoTex; infoMat.emissiveTexture = infoTex;
        infoMat.opacityTexture = infoTex; infoMat.disableLighting = true; infoMat.backFaceCulling = false;
        infoP.material = infoMat;

        function updateInfo() {
            const ctx = infoTex.getContext();
            ctx.clearRect(0,0,512,150);
            ctx.textAlign = "center";
            ctx.font = "bold 22px monospace"; ctx.fillStyle = "#aabbff";
            ctx.fillText("Iteration: " + iteration + " / ~" + optimalIter + " optimal", 256, 35);
            const prob = (amplitudes[target]**2 * 100).toFixed(1);
            ctx.font = "bold 20px sans-serif"; ctx.fillStyle = "#88ddaa";
            ctx.fillText("Target probability: " + prob + "%", 256, 70);
            ctx.fillStyle = "#667799"; ctx.font = "bold 16px sans-serif";
            ctx.fillText("Classical would need ~" + N + " checks on average", 256, 100);
            if (iteration >= optimalIter) {
                ctx.fillStyle = "#ffaa44";
                ctx.fillText("Optimal! Measure now for best result", 256, 130);
            }
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

        makeBtn("STEP", -5, 2.5, new BABYLON.Color3(0.2,0.8,0.4), () => {
            groverStep(); updateBars(); updateInfo();
        });
        makeBtn("AUTO RUN", -5, 1.9, new BABYLON.Color3(0.3,0.5,1), () => {
            const iv = setInterval(() => {
                if (iteration >= optimalIter + 2) { clearInterval(iv); return; }
                groverStep(); updateBars(); updateInfo();
            }, 500);
        });
        makeBtn("RESET", -5, 1.3, new BABYLON.Color3(0.5,0.5,0.5), () => {
            amplitudes = new Array(N).fill(1/Math.sqrt(N));
            iteration = 0; updateBars(); updateInfo();
        });

        updateBars(); updateInfo();
    }
});
