QVR.register({
    id: "quantum-ml",
    title: "23. Quantum Machine Learning",
    subtitle: "Watch data points become separable in quantum feature space",
    info: "Quantum machine learning maps classical data into a high-dimensional quantum feature space where patterns that are inseparable classically become linearly separable. A quantum kernel evaluates inner products in this exponentially large space efficiently. Applications include drug classification, financial modeling, and image recognition on data too complex for classical ML.",

    async setup(scene, qvr) {
        qvr.createStarfield(scene);
        qvr.createLighting(scene);
        const gl = qvr.createGlow(scene);
        const camera = new BABYLON.ArcRotateCamera("cam", -Math.PI/2, Math.PI/3, 14, new BABYLON.Vector3(0,2,0), scene);
        camera.attachControl(qvr.canvas, true);
        const ground = BABYLON.MeshBuilder.CreateGround("ground", {width:20,height:20}, scene);
        ground.material = new BABYLON.StandardMaterial("gm", scene);
        ground.material.diffuseColor = new BABYLON.Color3(0.05,0.05,0.12); ground.material.alpha = 0.3;

        // Generate 2D data (two interleaved spirals — not linearly separable)
        const DATA_PTS = 40;
        const dataPoints = [];
        for (let i = 0; i < DATA_PTS; i++) {
            const cls = i < DATA_PTS/2 ? 0 : 1;
            const angle = (i % (DATA_PTS/2)) / (DATA_PTS/2) * Math.PI * 2;
            const r = 0.5 + (i % (DATA_PTS/2)) / (DATA_PTS/2) * 1.5;
            const x = Math.cos(angle + cls*Math.PI) * r + (Math.random()-0.5)*0.2;
            const z = Math.sin(angle + cls*Math.PI) * r + (Math.random()-0.5)*0.2;
            dataPoints.push({x, z, cls, qx:0, qy:0, qz:0});
        }

        // Create spheres
        const spheres = [];
        dataPoints.forEach((d,i) => {
            const s = BABYLON.MeshBuilder.CreateSphere("dp"+i, {diameter:0.2, segments:8}, scene);
            s.position = new BABYLON.Vector3(d.x*2 - 3, 2.5, d.z*2);
            const m = new BABYLON.StandardMaterial("dpm"+i, scene);
            m.diffuseColor = d.cls === 0 ? new BABYLON.Color3(0.3,0.5,1) : new BABYLON.Color3(1,0.4,0.3);
            m.emissiveColor = m.diffuseColor.scale(0.2);
            s.material = m;
            spheres.push(s);
        });

        qvr.createTextPlane("Classical 2D (not separable)", 22, 3.5, scene).position = new BABYLON.Vector3(-3, 4.5, 0);

        // Quantum feature space positions (pre-computed: map to 3D where they ARE separable)
        dataPoints.forEach(d => {
            const r = Math.sqrt(d.x*d.x + d.z*d.z);
            const angle = Math.atan2(d.z, d.x);
            d.qx = Math.cos(angle*2) * r;
            d.qy = r * r * (d.cls === 0 ? 1 : -1) * 0.5 + (d.cls === 0 ? 1 : -1);
            d.qz = Math.sin(angle*2) * r;
        });

        let mapped = false;
        let transitioning = false;

        // Separator plane (only visible in quantum space)
        const separator = BABYLON.MeshBuilder.CreatePlane("sep", {width:6, height:6}, scene);
        separator.position = new BABYLON.Vector3(3, 2.5, 0);
        separator.rotation.x = Math.PI/2;
        const sepMat = new BABYLON.StandardMaterial("sepm", scene);
        sepMat.diffuseColor = new BABYLON.Color3(0.2,0.8,0.3);
        sepMat.alpha = 0; sepMat.backFaceCulling = false;
        separator.material = sepMat;

        const stP = BABYLON.MeshBuilder.CreatePlane("st", {width:4, height:0.8}, scene);
        stP.position = new BABYLON.Vector3(3, 4.5, 0);
        stP.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        const stTex = new BABYLON.DynamicTexture("stTex", {width:512, height:100}, scene);
        const stMat2 = new BABYLON.StandardMaterial("stm", scene);
        stMat2.diffuseTexture = stTex; stMat2.emissiveTexture = stTex;
        stMat2.opacityTexture = stTex; stMat2.disableLighting = true; stMat2.backFaceCulling = false;
        stP.material = stMat2;

        function updateLabel() {
            const ctx = stTex.getContext();
            ctx.clearRect(0,0,512,100);
            ctx.textAlign = "center"; ctx.font = "bold 22px sans-serif";
            ctx.fillStyle = mapped ? "#44ff88" : "#aabbff";
            ctx.fillText(mapped ? "Quantum 3D (linearly separable!)" : "", 256, 50);
            stTex.update();
        }

        function makeBtn(label, x, y, color, fn) {
            const b = BABYLON.MeshBuilder.CreateBox("b_"+label, {width:1.5, height:0.45, depth:0.2}, scene);
            b.position = new BABYLON.Vector3(x,y,0);
            const m = new BABYLON.StandardMaterial("bm_"+label, scene);
            m.diffuseColor = color; m.emissiveColor = color.scale(0.15); b.material = m;
            qvr.createTextPlane(label, 24, 1.4, scene).position = new BABYLON.Vector3(x,y,0.15);
            b.isPickable = true;
            b.actionManager = new BABYLON.ActionManager(scene);
            b.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, fn));
            b.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOverTrigger, () => m.emissiveColor = color.scale(0.5)));
            b.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOutTrigger, () => m.emissiveColor = color.scale(0.15)));
        }

        makeBtn("QUANTUM MAP", 0, 0.5, new BABYLON.Color3(0.3,0.7,1), () => {
            if (transitioning) return;
            mapped = !mapped; transitioning = true;
            setTimeout(() => { transitioning = false; }, 1500);
            sepMat.alpha = mapped ? 0.15 : 0;
            updateLabel();
        });

        updateLabel();

        let t = 0;
        scene.onBeforeRenderObservable.add(() => {
            t += 0.016;
            dataPoints.forEach((d,i) => {
                const target = mapped
                    ? new BABYLON.Vector3(d.qx*1.5 + 3, 2.5 + d.qy*0.8, d.qz*1.5)
                    : new BABYLON.Vector3(d.x*2 - 3, 2.5, d.z*2);
                spheres[i].position = BABYLON.Vector3.Lerp(spheres[i].position, target, 0.03);
            });
        });
    }
});
