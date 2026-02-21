QVR.register({
    id: "qft",
    title: "18. Quantum Fourier Transform",
    subtitle: "Feed a wave pattern through the prism — see hidden frequencies revealed",
    info: "The QFT converts quantum states from time domain to frequency domain using only O(n²) gates instead of O(n·2^n) classically. It's the key subroutine in Shor's algorithm and quantum phase estimation. Think of it as a prism that splits a complex wave into its component frequencies, revealing hidden periodic patterns.",

    async setup(scene, qvr) {
        qvr.createStarfield(scene);
        qvr.createLighting(scene);
        const gl = qvr.createGlow(scene);
        const camera = new BABYLON.ArcRotateCamera("cam", -Math.PI/2, Math.PI/3, 14, new BABYLON.Vector3(0,2,0), scene);
        camera.attachControl(qvr.canvas, true);
        const ground = BABYLON.MeshBuilder.CreateGround("ground", {width:20,height:20}, scene);
        ground.material = new BABYLON.StandardMaterial("gm", scene);
        ground.material.diffuseColor = new BABYLON.Color3(0.05,0.05,0.12); ground.material.alpha = 0.3;

        // Prism (triangular)
        const prism = BABYLON.MeshBuilder.CreateCylinder("prism", {
            diameterTop:0, diameterBottom:2, height:2.5, tessellation:3
        }, scene);
        prism.position = new BABYLON.Vector3(0, 2.5, 0);
        prism.rotation.z = Math.PI/6;
        const prismMat = new BABYLON.StandardMaterial("pm", scene);
        prismMat.diffuseColor = new BABYLON.Color3(0.6,0.7,1);
        prismMat.alpha = 0.4; prismMat.specularPower = 128;
        prism.material = prismMat;
        gl.addIncludedOnlyMesh(prism);

        // Input wave (left side)
        const INPUT_PTS = 30;
        const inputSpheres = [];
        const inMat = new BABYLON.StandardMaterial("inm", scene);
        inMat.diffuseColor = new BABYLON.Color3(0.8,0.8,0.9);
        inMat.emissiveColor = new BABYLON.Color3(0.2,0.2,0.3);
        for (let i = 0; i < INPUT_PTS; i++) {
            const s = BABYLON.MeshBuilder.CreateSphere("in"+i, {diameter:0.1, segments:6}, scene);
            s.material = inMat;
            inputSpheres.push(s);
        }

        // Output frequencies (right side) — colored beams
        const freqColors = [
            new BABYLON.Color3(1,0.2,0.2),
            new BABYLON.Color3(1,0.6,0.1),
            new BABYLON.Color3(0.2,1,0.3),
            new BABYLON.Color3(0.2,0.5,1),
            new BABYLON.Color3(0.7,0.2,1),
        ];
        const outputBars = [];
        for (let i = 0; i < 5; i++) {
            const bar = BABYLON.MeshBuilder.CreateBox("out"+i, {width:0.3, height:1, depth:0.3}, scene);
            bar.position = new BABYLON.Vector3(4 + i*0.5, 0, 0);
            const m = new BABYLON.StandardMaterial("om"+i, scene);
            m.diffuseColor = freqColors[i]; m.emissiveColor = freqColors[i].scale(0.2);
            bar.material = m;
            outputBars.push(bar);

            // Frequency beam from prism
            const beam = BABYLON.MeshBuilder.CreateCylinder("beam"+i, {diameter:0.04, height:4, tessellation:6}, scene);
            beam.position = new BABYLON.Vector3(2 + i*0.3, 2.5 + (i-2)*0.3, 0);
            beam.rotation.z = Math.PI/2 + (i-2)*0.08;
            const bm = new BABYLON.StandardMaterial("bm"+i, scene);
            bm.emissiveColor = freqColors[i]; bm.disableLighting = true; bm.alpha = 0.4;
            beam.material = bm;
        }

        qvr.createTextPlane("Input Signal", 26, 2, scene).position = new BABYLON.Vector3(-4, 4.5, 0);
        qvr.createTextPlane("QFT Prism", 26, 1.5, scene).position = new BABYLON.Vector3(0, 4.5, 0);
        qvr.createTextPlane("Frequencies", 26, 2, scene).position = new BABYLON.Vector3(5, 4.5, 0);

        // Pattern selector
        let pattern = 0;
        const patterns = [
            { name: "Single freq", freqs: [0,0,1,0,0] },
            { name: "Two freqs", freqs: [0,0.7,0,0.7,0] },
            { name: "Complex", freqs: [0.3,0.5,0.8,0.2,0.6] },
            { name: "Hidden period", freqs: [0,0,0,1,0] },
        ];

        function makeBtn(label, x, y, color, fn) {
            const b = BABYLON.MeshBuilder.CreateBox("b_"+label, {width:1.3, height:0.4, depth:0.2}, scene);
            b.position = new BABYLON.Vector3(x,y,0);
            const m = new BABYLON.StandardMaterial("bm_"+label, scene);
            m.diffuseColor = color; m.emissiveColor = color.scale(0.15); b.material = m;
            qvr.createTextPlane(label, 22, 1.2, scene).position = new BABYLON.Vector3(x,y,0.15);
            b.isPickable = true;
            b.actionManager = new BABYLON.ActionManager(scene);
            b.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, fn));
            b.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOverTrigger, () => m.emissiveColor = color.scale(0.5)));
            b.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOutTrigger, () => m.emissiveColor = color.scale(0.15)));
        }

        patterns.forEach((p, i) => {
            makeBtn(p.name, -5, 3 - i*0.55, new BABYLON.Color3(0.3,0.5,0.8), () => { pattern = i; });
        });

        let t = 0;
        scene.onBeforeRenderObservable.add(() => {
            t += 0.02;
            const freqs = patterns[pattern].freqs;

            // Input wave
            for (let i = 0; i < INPUT_PTS; i++) {
                const x = -6 + (i/INPUT_PTS)*4;
                let y = 0;
                for (let f = 0; f < 5; f++) {
                    y += freqs[f] * Math.sin(x*(f+1)*2 + t*(f+1));
                }
                inputSpheres[i].position.set(x, 2.5 + y*0.3, 0);
            }

            // Output bars
            for (let i = 0; i < 5; i++) {
                const h = freqs[i] * 2.5 + 0.05;
                outputBars[i].scaling.y = h;
                outputBars[i].position.y = h * 0.5;
                outputBars[i].material.emissiveColor = freqColors[i].scale(0.1 + freqs[i]*0.4);
            }

            prism.rotation.y += 0.003;
            prismMat.emissiveColor = new BABYLON.Color3(
                0.1+Math.sin(t)*0.05, 0.12+Math.sin(t*1.3)*0.05, 0.2+Math.sin(t*0.7)*0.05
            );
        });
    }
});
