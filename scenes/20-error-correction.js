QVR.register({
    id: "error-correction",
    title: "20. Quantum Error Correction",
    subtitle: "Watch errors hit — the code detects and fixes them automatically",
    info: "Quantum error correction encodes one logical qubit across multiple physical qubits. When noise corrupts one physical qubit, the others detect the error via syndrome measurements and correct it without disturbing the encoded information. The simplest code uses 3 qubits to protect 1. Real systems like Google's surface code use hundreds of physical qubits per logical qubit.",

    async setup(scene, qvr) {
        qvr.createStarfield(scene);
        qvr.createLighting(scene);
        const gl = qvr.createGlow(scene);
        const camera = new BABYLON.ArcRotateCamera("cam", -Math.PI/2, Math.PI/3, 12, new BABYLON.Vector3(0,2.5,0), scene);
        camera.attachControl(qvr.canvas, true);
        const ground = BABYLON.MeshBuilder.CreateGround("ground", {width:20,height:20}, scene);
        ground.material = new BABYLON.StandardMaterial("gm", scene);
        ground.material.diffuseColor = new BABYLON.Color3(0.05,0.05,0.12); ground.material.alpha = 0.3;

        // 5 physical qubits in a ring protecting 1 logical qubit
        const PHYS = 5;
        const physQubits = [];
        const physR = 2;

        for (let i = 0; i < PHYS; i++) {
            const angle = (i/PHYS)*Math.PI*2 - Math.PI/2;
            const s = qvr.createQubitSphere("pq"+i, 0.5, new BABYLON.Color3(0.2,0.6,1), scene);
            s.position = new BABYLON.Vector3(
                Math.cos(angle)*physR, 2.5, Math.sin(angle)*physR
            );
            gl.addIncludedOnlyMesh(s);
            physQubits.push({mesh:s, errored:false, angle});
        }

        // Logical qubit in center
        const logical = qvr.createQubitSphere("logical", 0.8, new BABYLON.Color3(0.2,1,0.5), scene);
        logical.position = new BABYLON.Vector3(0, 2.5, 0);
        gl.addIncludedOnlyMesh(logical);
        qvr.createTextPlane("Logical Qubit", 24, 2, scene).position = new BABYLON.Vector3(0, 4, 0);

        // Connecting lines
        for (let i = 0; i < PHYS; i++) {
            const next = (i+1)%PHYS;
            const line = BABYLON.MeshBuilder.CreateLines("conn"+i, {
                points: [physQubits[i].mesh.position, physQubits[next].mesh.position]
            }, scene);
            line.color = new BABYLON.Color3(0.15,0.25,0.5);
            line.alpha = 0.4;
        }

        // Status
        const stP = BABYLON.MeshBuilder.CreatePlane("st", {width:4, height:1.2}, scene);
        stP.position = new BABYLON.Vector3(0, 5, 0);
        stP.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        const stTex = new BABYLON.DynamicTexture("stTex", {width:512, height:150}, scene);
        const stMat = new BABYLON.StandardMaterial("stm", scene);
        stMat.diffuseTexture = stTex; stMat.emissiveTexture = stTex;
        stMat.opacityTexture = stTex; stMat.disableLighting = true; stMat.backFaceCulling = false;
        stP.material = stMat;

        let errorsFixed = 0;
        let errorsPending = 0;

        function setStatus(line1, line2, color) {
            const ctx = stTex.getContext();
            ctx.clearRect(0,0,512,150);
            ctx.textAlign = "center";
            ctx.font = "bold 20px sans-serif"; ctx.fillStyle = color || "#aabbff";
            ctx.fillText(line1, 256, 40);
            ctx.fillStyle = "#8899bb"; ctx.font = "bold 16px sans-serif";
            ctx.fillText(line2, 256, 70);
            ctx.fillStyle = "#88ddaa"; ctx.font = "bold 16px monospace";
            ctx.fillText("Errors corrected: " + errorsFixed, 256, 105);
            stTex.update();
        }

        function injectError() {
            const idx = Math.floor(Math.random()*PHYS);
            if (physQubits[idx].errored) return;
            physQubits[idx].errored = true;
            physQubits[idx].mesh.material.diffuseColor = new BABYLON.Color3(1,0.2,0.2);
            physQubits[idx].mesh.material.emissiveColor = new BABYLON.Color3(0.5,0.05,0.05);
            errorsPending++;
            setStatus("Error detected on qubit " + idx + "!", "Syndrome measurement in progress...", "#ff4444");

            // Auto-correct after delay
            setTimeout(() => {
                physQubits[idx].errored = false;
                physQubits[idx].mesh.material.diffuseColor = new BABYLON.Color3(0.2,0.6,1);
                physQubits[idx].mesh.material.emissiveColor = new BABYLON.Color3(0.06,0.18,0.3);
                errorsPending--;
                errorsFixed++;

                // Flash green
                physQubits[idx].mesh.material.emissiveColor = new BABYLON.Color3(0.1,0.5,0.2);
                setTimeout(() => {
                    physQubits[idx].mesh.material.emissiveColor = new BABYLON.Color3(0.06,0.18,0.3);
                }, 300);

                if (errorsPending === 0) {
                    setStatus("Error corrected! Logical qubit intact.", "The code detected and fixed the error automatically.", "#44ff88");
                }
            }, 1500);
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

        makeBtn("INJECT ERROR", -4, 1.5, new BABYLON.Color3(1,0.3,0.3), injectError);
        makeBtn("AUTO ERRORS", -4, 0.9, new BABYLON.Color3(0.8,0.5,0.2), () => {
            const iv = setInterval(() => injectError(), 2000);
            setTimeout(() => clearInterval(iv), 12000);
        });

        setStatus("Click INJECT ERROR to corrupt a physical qubit", "The code will detect and fix it automatically", "#aabbff");

        let t = 0;
        scene.onBeforeRenderObservable.add(() => {
            t += 0.016;
            logical.rotation.y += 0.005;
            logical.position.y = 2.5 + Math.sin(t*2)*0.05;
            physQubits.forEach((q,i) => {
                q.mesh.position.y = 2.5 + Math.sin(t*2+i)*0.05;
            });
        });
    }
});
