QVR.register({
    id: "no-cloning",
    title: "14. No-Cloning Theorem",
    subtitle: "Try to copy a quantum state — watch it fail every time",
    info: "It is physically impossible to create an exact copy of an unknown quantum state. Classical data can be copied perfectly, but quantum states cannot — measurement disturbs them, and you can't read without destroying. This is why quantum teleportation destroys the original, why quantum cryptography works (eavesdroppers can't copy), and why quantum error correction is so hard.",

    async setup(scene, qvr) {
        qvr.createStarfield(scene);
        qvr.createLighting(scene);
        const gl = qvr.createGlow(scene);
        const camera = new BABYLON.ArcRotateCamera("cam", -Math.PI/2, Math.PI/3, 12, new BABYLON.Vector3(0,2,0), scene);
        camera.attachControl(qvr.canvas, true);
        const ground = BABYLON.MeshBuilder.CreateGround("ground", {width:20,height:20}, scene);
        ground.material = new BABYLON.StandardMaterial("gm", scene);
        ground.material.diffuseColor = new BABYLON.Color3(0.05,0.05,0.12); ground.material.alpha = 0.3;

        // Copy machine
        const machine = BABYLON.MeshBuilder.CreateBox("machine", {width:2.5, height:1.5, depth:1.5}, scene);
        machine.position = new BABYLON.Vector3(0, 1.5, 0);
        const macMat = new BABYLON.StandardMaterial("macm", scene);
        macMat.diffuseColor = new BABYLON.Color3(0.2,0.2,0.25); macMat.specularPower = 32;
        machine.material = macMat;
        qvr.createTextPlane("COPY MACHINE", 28, 2.5, scene).position = new BABYLON.Vector3(0, 2.5, 0);

        // Input slot (left)
        const slotIn = BABYLON.MeshBuilder.CreateBox("slotIn", {width:0.6, height:0.6, depth:0.1}, scene);
        slotIn.position = new BABYLON.Vector3(-1.3, 1.5, 0);
        const siMat = new BABYLON.StandardMaterial("sim", scene);
        siMat.diffuseColor = new BABYLON.Color3(0.1,0.1,0.15); siMat.emissiveColor = new BABYLON.Color3(0.05,0.1,0.05);
        slotIn.material = siMat;

        // Output slot (right)
        const slotOut = BABYLON.MeshBuilder.CreateBox("slotOut", {width:0.6, height:0.6, depth:0.1}, scene);
        slotOut.position = new BABYLON.Vector3(1.3, 1.5, 0);
        slotOut.material = siMat.clone("som");

        // Classical object
        const classical = BABYLON.MeshBuilder.CreateBox("classical", {size:0.5}, scene);
        classical.position = new BABYLON.Vector3(-3, 1.5, 0);
        const clMat = new BABYLON.StandardMaterial("clm", scene);
        clMat.diffuseColor = new BABYLON.Color3(0.2,0.8,0.3); clMat.emissiveColor = new BABYLON.Color3(0.05,0.2,0.08);
        classical.material = clMat;
        qvr.createTextPlane("Classical", 26, 1.2, scene).position = new BABYLON.Vector3(-3, 2.2, 0);

        // Quantum object
        const quantum = qvr.createQubitSphere("quantum", 0.5, new BABYLON.Color3(0.5,0.3,1), scene);
        quantum.position = new BABYLON.Vector3(-3, 3.5, 0); gl.addIncludedOnlyMesh(quantum);
        qvr.createTextPlane("Quantum", 26, 1.2, scene).position = new BABYLON.Vector3(-3, 4.3, 0);

        // Status
        const stP = BABYLON.MeshBuilder.CreatePlane("st", {width:5, height:0.8}, scene);
        stP.position = new BABYLON.Vector3(0, 4.5, 0);
        stP.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        const stTex = new BABYLON.DynamicTexture("stTex", {width:640, height:100}, scene);
        const stMat = new BABYLON.StandardMaterial("stm", scene);
        stMat.diffuseTexture = stTex; stMat.emissiveTexture = stTex;
        stMat.opacityTexture = stTex; stMat.disableLighting = true; stMat.backFaceCulling = false;
        stP.material = stMat;

        function setStatus(text, color) {
            const ctx = stTex.getContext();
            ctx.clearRect(0,0,640,100);
            ctx.textAlign = "center"; ctx.font = "20px sans-serif"; ctx.fillStyle = color || "#aabbff";
            ctx.fillText(text, 320, 55);
            stTex.update();
        }
        setStatus("Click an object to try copying it");

        let busy = false;

        function tryCopy(isQuantum) {
            if (busy) return;
            busy = true;
            const src = isQuantum ? quantum : classical;
            const srcColor = isQuantum ? new BABYLON.Color3(0.5,0.3,1) : new BABYLON.Color3(0.2,0.8,0.3);

            setStatus("Inserting into copy machine...", "#ffaa44");

            // Animate source into machine
            let prog = 0;
            const startX = src.position.x;
            const obs = scene.onBeforeRenderObservable.add(() => {
                prog += 0.02;
                src.position.x = startX + prog * (0 - startX);
                if (prog >= 1) {
                    scene.onBeforeRenderObservable.remove(obs);
                    src.position.x = 0;

                    if (!isQuantum) {
                        // Classical: success!
                        setStatus("Classical copy: SUCCESS! Perfect duplicate.", "#44ff88");
                        const copy = BABYLON.MeshBuilder.CreateBox("copy", {size:0.5}, scene);
                        copy.position = new BABYLON.Vector3(3, 1.5, 0);
                        const cm = new BABYLON.StandardMaterial("cm", scene);
                        cm.diffuseColor = srcColor; cm.emissiveColor = srcColor.scale(0.2);
                        copy.material = cm;
                        setTimeout(() => {
                            src.position.x = startX;
                            copy.dispose(); cm.dispose();
                            busy = false;
                            setStatus("Now try the quantum object!");
                        }, 2000);
                    } else {
                        // Quantum: FAIL!
                        setStatus("Copying quantum state...", "#ffaa44");
                        // Machine shakes
                        let shake = 0;
                        const shakeObs = scene.onBeforeRenderObservable.add(() => {
                            shake += 0.1;
                            machine.position.x = Math.sin(shake * 20) * 0.05;
                            macMat.emissiveColor = new BABYLON.Color3(
                                Math.sin(shake*5)*0.3, 0, 0
                            );
                            if (shake > 2) {
                                scene.onBeforeRenderObservable.remove(shakeObs);
                                machine.position.x = 0;
                                macMat.emissiveColor = BABYLON.Color3.Black();

                                // Produce wrong copy
                                const badCopy = qvr.createQubitSphere("bad", 0.5,
                                    new BABYLON.Color3(Math.random(), Math.random(), Math.random()), scene);
                                badCopy.position = new BABYLON.Vector3(3, 3.5, 0);

                                setStatus("FAILED! Copy is wrong color — can't duplicate unknown quantum state", "#ff4444");

                                setTimeout(() => {
                                    src.position.x = startX;
                                    badCopy.dispose();
                                    busy = false;
                                    setStatus("Click an object to try again");
                                }, 2500);
                            }
                        });
                    }
                }
            });
        }

        classical.isPickable = true;
        classical.actionManager = new BABYLON.ActionManager(scene);
        classical.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => tryCopy(false)));

        quantum.isPickable = true;
        quantum.actionManager = new BABYLON.ActionManager(scene);
        quantum.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => tryCopy(true)));

        let t = 0;
        scene.onBeforeRenderObservable.add(() => {
            t += 0.016;
            quantum.rotation.y += 0.01;
            quantum.material.emissiveColor = new BABYLON.Color3(
                0.2 + Math.sin(t*3)*0.1, 0.1 + Math.sin(t*4)*0.05, 0.4 + Math.sin(t*2)*0.1
            );
        });
    }
});
