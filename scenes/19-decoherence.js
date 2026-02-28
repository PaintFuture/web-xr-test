QVR.register({
    id: "decoherence",
    title: "19. Decoherence & Noise",
    subtitle: "Watch the qubit lose coherence — click SHIELD to protect it",
    info: "Decoherence is the enemy of quantum computing. Environmental noise (heat, radiation, vibrations) causes qubits to lose their quantum properties over time. The Bloch sphere vector shrinks toward the center as the qubit becomes a classical mixture. Real quantum computers operate near absolute zero and use electromagnetic shielding to slow decoherence. Coherence times range from microseconds to seconds depending on the technology.",

    async setup(scene, qvr) {
        qvr.createStarfield(scene);
        qvr.createLighting(scene);
        const gl = qvr.createGlow(scene);
        const camera = new BABYLON.ArcRotateCamera("cam", -Math.PI/2, Math.PI/3, 10, new BABYLON.Vector3(0,2.5,0), scene);
        camera.attachControl(qvr.canvas, true);
        const ground = BABYLON.MeshBuilder.CreateGround("ground", {width:20,height:20}, scene);
        ground.material = new BABYLON.StandardMaterial("gm", scene);
        ground.material.diffuseColor = new BABYLON.Color3(0.05,0.05,0.12); ground.material.alpha = 0.3;

        const center = new BABYLON.Vector3(0, 2.5, 0);
        const R = 1.8;

        // Bloch sphere
        const wire = BABYLON.MeshBuilder.CreateSphere("wire", {diameter:R*2, segments:16}, scene);
        wire.position = center.clone();
        const wm = new BABYLON.StandardMaterial("wm", scene);
        wm.wireframe = true; wm.emissiveColor = new BABYLON.Color3(0.12,0.15,0.3);
        wm.disableLighting = true; wm.alpha = 0.2; wire.material = wm;

        const tip = BABYLON.MeshBuilder.CreateSphere("tip", {diameter:0.18, segments:12}, scene);
        const tipMat = new BABYLON.StandardMaterial("tm", scene);
        tipMat.diffuseColor = new BABYLON.Color3(1,0.8,0.2);
        tipMat.emissiveColor = new BABYLON.Color3(0.5,0.4,0.1);
        tip.material = tipMat; gl.addIncludedOnlyMesh(tip);

        // Noise particles
        const noiseParticles = [];
        for (let i = 0; i < 30; i++) {
            const p = BABYLON.MeshBuilder.CreateSphere("np"+i, {diameter:0.08, segments:4}, scene);
            const m = new BABYLON.StandardMaterial("npm"+i, scene);
            m.emissiveColor = new BABYLON.Color3(1,0.3,0.2); m.disableLighting = true; m.alpha = 0.6;
            p.material = m;
            p._angle = Math.random()*Math.PI*2;
            p._speed = 1+Math.random()*2;
            p._radius = R+0.5+Math.random()*2;
            p._tilt = (Math.random()-0.5)*Math.PI;
            noiseParticles.push(p);
        }

        // Shield (transparent sphere)
        const shield = BABYLON.MeshBuilder.CreateSphere("shield", {diameter:R*2+1, segments:24}, scene);
        shield.position = center.clone();
        const shieldMat = new BABYLON.StandardMaterial("sm", scene);
        shieldMat.diffuseColor = new BABYLON.Color3(0.2,0.5,1);
        shieldMat.alpha = 0; shieldMat.specularPower = 128;
        shield.material = shieldMat;
        shield.isVisible = false;

        let coherence = 1.0;
        let shielded = false;
        let theta = Math.PI/4;
        let phi = 0;

        // Info
        const infoP = BABYLON.MeshBuilder.CreatePlane("info", {width:3, height:1}, scene);
        infoP.position = new BABYLON.Vector3(3.5, 4, 0);
        infoP.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        const infoTex = new BABYLON.DynamicTexture("it", {width:384, height:128}, scene);
        const infoMat = new BABYLON.StandardMaterial("im", scene);
        infoMat.diffuseTexture = infoTex; infoMat.emissiveTexture = infoTex;
        infoMat.opacityTexture = infoTex; infoMat.disableLighting = true; infoMat.backFaceCulling = false;
        infoP.material = infoMat;

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

        makeBtn("SHIELD", -3.5, 2, new BABYLON.Color3(0.2,0.5,1), () => {
            shielded = !shielded;
            shield.isVisible = shielded;
            shieldMat.alpha = shielded ? 0.15 : 0;
        });
        makeBtn("RESET", -3.5, 1.4, new BABYLON.Color3(0.5,0.5,0.5), () => {
            coherence = 1; theta = Math.PI/4; phi = 0;
        });

        let t = 0; let arrowLine = null;
        scene.onBeforeRenderObservable.add(() => {
            t += 0.016;
            phi += 0.01;

            // Decoherence
            const decayRate = shielded ? 0.0002 : 0.002;
            coherence = Math.max(0.05, coherence - decayRate);

            // State vector shrinks with coherence
            const r = R * coherence;
            const pos = new BABYLON.Vector3(
                r*Math.sin(theta)*Math.cos(phi),
                r*Math.cos(theta),
                r*Math.sin(theta)*Math.sin(phi)
            );
            tip.position = pos.add(center);

            if (arrowLine) arrowLine.dispose();
            arrowLine = BABYLON.MeshBuilder.CreateLines("arr", {points:[center, tip.position]}, scene);
            arrowLine.color = new BABYLON.Color3(coherence, coherence*0.8, 0.2);

            tipMat.diffuseColor = new BABYLON.Color3(coherence, coherence*0.8, 0.2);
            tipMat.emissiveColor = tipMat.diffuseColor.scale(0.4);

            // Noise particles
            noiseParticles.forEach(p => {
                p._angle += p._speed * 0.016;
                const nr = shielded ? R+2+Math.random() : p._radius;
                p.position.set(
                    center.x + Math.cos(p._angle)*nr*Math.cos(p._tilt),
                    center.y + Math.sin(p._angle*0.7)*nr*0.5,
                    center.z + Math.sin(p._angle)*nr
                );
                p.material.alpha = shielded ? 0.2 : 0.6;
            });

            // Info
            const ctx = infoTex.getContext();
            ctx.clearRect(0,0,384,128);
            ctx.textAlign = "center"; ctx.font = "bold 20px monospace";
            ctx.fillStyle = coherence > 0.5 ? "#44ff88" : coherence > 0.2 ? "#ffaa44" : "#ff4444";
            ctx.fillText("Coherence: " + (coherence*100).toFixed(1) + "%", 192, 35);
            ctx.fillStyle = "#8899bb"; ctx.font = "bold 16px sans-serif";
            ctx.fillText(shielded ? "Shield active — decay slowed" : "Exposed to noise", 192, 65);
            ctx.fillText("Vector length = coherence", 192, 90);
            infoTex.update();
        });
    }
});
