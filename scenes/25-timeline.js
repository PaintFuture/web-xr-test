QVR.register({
    id: "timeline",
    title: "25. Quantum Supremacy Timeline",
    subtitle: "Fly through the history and future of quantum computing",
    info: "From Feynman's 1981 proposal to today's 1000+ qubit processors, quantum computing has progressed from theory to reality. Key milestones: first quantum algorithm (1994), first quantum error correction (1995), quantum supremacy (2019), first quantum advantage for useful problems (2023). The road ahead: fault-tolerant quantum computers by ~2030, practical quantum advantage in chemistry and optimization.",

    async setup(scene, qvr) {
        qvr.createStarfield(scene);
        qvr.createLighting(scene);
        const gl = qvr.createGlow(scene);
        const camera = new BABYLON.ArcRotateCamera("cam", -Math.PI/2, Math.PI/3, 16, new BABYLON.Vector3(0,2,0), scene);
        camera.attachControl(qvr.canvas, true);
        const ground = BABYLON.MeshBuilder.CreateGround("ground", {width:30,height:20}, scene);
        ground.material = new BABYLON.StandardMaterial("gm", scene);
        ground.material.diffuseColor = new BABYLON.Color3(0.05,0.05,0.12); ground.material.alpha = 0.3;

        const milestones = [
            {year:1981, text:"Feynman proposes\nquantum simulation", qubits:0, color:new BABYLON.Color3(0.5,0.5,0.6)},
            {year:1994, text:"Shor's algorithm\nbreaks RSA", qubits:0, color:new BABYLON.Color3(0.6,0.4,0.2)},
            {year:1995, text:"First quantum\nerror correction", qubits:1, color:new BABYLON.Color3(0.4,0.5,0.7)},
            {year:1998, text:"First 2-qubit\ncomputer (NMR)", qubits:2, color:new BABYLON.Color3(0.3,0.6,0.4)},
            {year:2001, text:"Shor's algorithm\nfactors 15", qubits:7, color:new BABYLON.Color3(0.7,0.5,0.2)},
            {year:2011, text:"D-Wave One\n128 qubits", qubits:128, color:new BABYLON.Color3(0.2,0.5,0.8)},
            {year:2016, text:"IBM Quantum\ncloud access", qubits:5, color:new BABYLON.Color3(0.3,0.3,0.8)},
            {year:2019, text:"Google quantum\nsupremacy (53q)", qubits:53, color:new BABYLON.Color3(0.8,0.3,0.3)},
            {year:2021, text:"IBM Eagle\n127 qubits", qubits:127, color:new BABYLON.Color3(0.2,0.4,0.9)},
            {year:2023, text:"IBM Condor\n1121 qubits", qubits:1121, color:new BABYLON.Color3(0.3,0.7,0.9)},
            {year:2025, text:"Error-corrected\nlogical qubits", qubits:100, color:new BABYLON.Color3(0.5,0.8,0.3)},
            {year:2030, text:"Fault-tolerant QC\n(projected)", qubits:10000, color:new BABYLON.Color3(0.9,0.7,0.2)},
        ];

        const startYear = 1980;
        const endYear = 2032;
        const timelineLength = 14;

        // Timeline rail
        const rail = BABYLON.MeshBuilder.CreateCylinder("rail", {
            diameter:0.04, height:timelineLength, tessellation:6
        }, scene);
        rail.position = new BABYLON.Vector3(0, 0.5, 0);
        rail.rotation.z = Math.PI/2;
        const railMat = new BABYLON.StandardMaterial("rm", scene);
        railMat.emissiveColor = new BABYLON.Color3(0.2,0.3,0.5); railMat.disableLighting = true;
        rail.material = railMat;

        milestones.forEach((ms, i) => {
            const x = ((ms.year - startYear) / (endYear - startYear) - 0.5) * timelineLength;

            // Pillar
            const qubitScale = ms.qubits > 0 ? Math.log2(ms.qubits + 1) * 0.3 : 0.3;
            const pillar = BABYLON.MeshBuilder.CreateBox("pillar"+i, {width:0.15, height:qubitScale, depth:0.15}, scene);
            pillar.position = new BABYLON.Vector3(x, 0.5 + qubitScale/2, 0);
            const pm = new BABYLON.StandardMaterial("pm"+i, scene);
            pm.diffuseColor = ms.color; pm.emissiveColor = ms.color.scale(0.15);
            pillar.material = pm;

            // Node sphere
            const node = BABYLON.MeshBuilder.CreateSphere("node"+i, {diameter:0.3+qubitScale*0.1, segments:12}, scene);
            node.position = new BABYLON.Vector3(x, 0.5 + qubitScale + 0.2, 0);
            const nm = new BABYLON.StandardMaterial("nm"+i, scene);
            nm.diffuseColor = ms.color; nm.emissiveColor = ms.color.scale(0.25);
            node.material = nm;
            gl.addIncludedOnlyMesh(node);

            // Year label
            const yearLbl = qvr.createTextPlane(ms.year.toString(), 24, 0.8, scene);
            yearLbl.position = new BABYLON.Vector3(x, 0.1, 0);

            // Description (on hover via info panel)
            const descLbl = qvr.createTextPlane(ms.text.split("\n")[0], 18, 1.8, scene);
            descLbl.position = new BABYLON.Vector3(x, 0.5 + qubitScale + 0.7, 0);

            // Qubit count
            if (ms.qubits > 0) {
                const qLbl = qvr.createTextPlane(ms.qubits + "q", 16, 0.6, scene);
                qLbl.position = new BABYLON.Vector3(x, 0.5 + qubitScale + 1.1, 0);
            }
        });

        // Future projection line (dashed effect via segments)
        const futureStart = ((2025 - startYear) / (endYear - startYear) - 0.5) * timelineLength;
        const futureEnd = ((2032 - startYear) / (endYear - startYear) - 0.5) * timelineLength;
        for (let x = futureStart; x < futureEnd; x += 0.3) {
            const seg = BABYLON.MeshBuilder.CreateBox("fut"+x, {width:0.15, height:0.02, depth:0.02}, scene);
            seg.position = new BABYLON.Vector3(x, 0.5, 0);
            const fm = new BABYLON.StandardMaterial("fm"+x, scene);
            fm.emissiveColor = new BABYLON.Color3(0.5,0.4,0.1); fm.disableLighting = true; fm.alpha = 0.5;
            seg.material = fm;
        }

        let t = 0;
        scene.onBeforeRenderObservable.add(() => {
            t += 0.016;
        });
    }
});
