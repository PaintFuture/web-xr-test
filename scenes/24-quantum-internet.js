QVR.register({
    id: "quantum-internet",
    title: "24. Quantum Internet",
    subtitle: "Click nodes to create entanglement links — build a quantum network",
    info: "The quantum internet will connect quantum computers via entangled photon links, enabling distributed quantum computing and unconditionally secure communication. Quantum repeaters use entanglement swapping to extend range beyond fiber optic limits. First quantum networks are already operational in China and Europe. The goal: a global network where any two nodes can share entanglement on demand.",

    async setup(scene, qvr) {
        qvr.createStarfield(scene);
        qvr.createLighting(scene);
        const gl = qvr.createGlow(scene);
        const camera = new BABYLON.ArcRotateCamera("cam", 0, Math.PI/3, 16, new BABYLON.Vector3(0,1,0), scene);
        camera.attachControl(qvr.canvas, true);
        const ground = BABYLON.MeshBuilder.CreateGround("ground", {width:20,height:20}, scene);
        ground.material = new BABYLON.StandardMaterial("gm", scene);
        ground.material.diffuseColor = new BABYLON.Color3(0.05,0.05,0.12); ground.material.alpha = 0.3;

        // Network nodes
        const nodePositions = [
            {x:-4, z:-3, name:"Berlin"}, {x:2, z:-4, name:"London"},
            {x:5, z:0, name:"Paris"}, {x:3, z:4, name:"Tokyo"},
            {x:-2, z:3, name:"NYC"}, {x:-5, z:1, name:"Zurich"},
            {x:0, z:0, name:"Relay"},
        ];

        const nodes = [];
        let selectedNode = null;
        const links = [];

        nodePositions.forEach((np, i) => {
            const s = qvr.createQubitSphere("node"+i, 0.5, new BABYLON.Color3(0.2,0.5,1), scene);
            s.position = new BABYLON.Vector3(np.x, 1, np.z);
            gl.addIncludedOnlyMesh(s);
            const lbl = qvr.createTextPlane(np.name, 22, 1.5, scene);
            lbl.position = new BABYLON.Vector3(np.x, 2, np.z);

            s.isPickable = true;
            s.actionManager = new BABYLON.ActionManager(scene);
            s.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => {
                if (selectedNode === null) {
                    selectedNode = i;
                    s.material.emissiveColor = new BABYLON.Color3(0.2,0.4,0.6);
                } else if (selectedNode !== i) {
                    createLink(selectedNode, i);
                    nodes[selectedNode].material.emissiveColor = new BABYLON.Color3(0.06,0.15,0.3);
                    selectedNode = null;
                } else {
                    s.material.emissiveColor = new BABYLON.Color3(0.06,0.15,0.3);
                    selectedNode = null;
                }
            }));
            nodes.push(s);
        });

        function createLink(a, b) {
            // Check if link already exists
            if (links.some(l => (l.a===a&&l.b===b)||(l.a===b&&l.b===a))) return;
            const posA = nodes[a].position;
            const posB = nodes[b].position;
            const dist = BABYLON.Vector3.Distance(posA, posB);
            const mid = BABYLON.Vector3.Center(posA, posB);

            const line = BABYLON.MeshBuilder.CreateCylinder("link"+links.length, {
                diameter:0.04, height:dist, tessellation:6
            }, scene);
            line.position = mid;
            line.lookAt(posB);
            line.rotation.x += Math.PI/2;
            const lm = new BABYLON.StandardMaterial("lm"+links.length, scene);
            lm.emissiveColor = new BABYLON.Color3(0.4,0.2,0.8); lm.disableLighting = true; lm.alpha = 0.5;
            line.material = lm;

            // Entanglement color change
            nodes[a].material.diffuseColor = new BABYLON.Color3(0.4,0.3,0.9);
            nodes[b].material.diffuseColor = new BABYLON.Color3(0.4,0.3,0.9);

            links.push({a, b, mesh:line, mat:lm});
        }

        // Status
        const stP = BABYLON.MeshBuilder.CreatePlane("st", {width:4, height:0.8}, scene);
        stP.position = new BABYLON.Vector3(0, 4, 0);
        stP.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        const stTex = new BABYLON.DynamicTexture("stTex", {width:512, height:100}, scene);
        const stMat = new BABYLON.StandardMaterial("stm", scene);
        stMat.diffuseTexture = stTex; stMat.emissiveTexture = stTex;
        stMat.opacityTexture = stTex; stMat.disableLighting = true; stMat.backFaceCulling = false;
        stP.material = stMat;

        function updateStatus() {
            const ctx = stTex.getContext();
            ctx.clearRect(0,0,512,100);
            ctx.textAlign = "center"; ctx.font = "bold 18px sans-serif"; ctx.fillStyle = "#aabbff";
            ctx.fillText("Entanglement links: " + links.length + " | Click two nodes to connect", 256, 35);
            ctx.fillStyle = "#667799"; ctx.font = "bold 14px sans-serif";
            ctx.fillText("Each link = shared entangled pair for secure communication", 256, 65);
            stTex.update();
        }

        let t = 0;
        scene.onBeforeRenderObservable.add(() => {
            t += 0.016;
            nodes.forEach((n,i) => { n.position.y = 1 + Math.sin(t*2+i)*0.05; });
            links.forEach(l => { l.mat.alpha = 0.3 + Math.sin(t*4)*0.15; });
            updateStatus();
        });
    }
});
