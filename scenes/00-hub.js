// Scene 0: Hub — Welcome portal with scene selection
QVR.register({
    id: "hub",
    title: "Quantum VR Explorer",
    subtitle: "Navigate the quantum world — select a concept to explore",
    info: "Welcome! Use the Scenes menu or Next/Prev buttons to navigate. In VR, point and trigger to interact. Each scene teaches a quantum computing concept through hands-on 3D interaction.",

    async setup(scene, qvr) {
        qvr.createStarfield(scene);
        qvr.createLighting(scene);
        const gl = qvr.createGlow(scene);

        // Camera
        const camera = new BABYLON.ArcRotateCamera("cam", -Math.PI / 2, Math.PI / 3, 12, BABYLON.Vector3.Zero(), scene);
        camera.attachControl(qvr.canvas, true);
        camera.lowerRadiusLimit = 5;
        camera.upperRadiusLimit = 25;

        // Ground (for XR teleportation)
        const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 20, height: 20 }, scene);
        const gMat = new BABYLON.StandardMaterial("gMat", scene);
        gMat.diffuseColor = new BABYLON.Color3(0.05, 0.05, 0.12);
        gMat.specularColor = new BABYLON.Color3(0.02, 0.02, 0.05);
        gMat.alpha = 0.3;
        ground.material = gMat;

        // Central qubit orb
        const orb = qvr.createQubitSphere("centralOrb", 1.5, new BABYLON.Color3(0.3, 0.5, 1.0), scene);
        orb.position.y = 2.5;
        gl.addIncludedOnlyMesh(orb);

        // Orbiting concept spheres
        const concepts = [
            { name: "Qubit", color: new BABYLON.Color3(0.2, 0.6, 1), idx: 1 },
            { name: "Superposition", color: new BABYLON.Color3(0.6, 0.2, 1), idx: 2 },
            { name: "Measurement", color: new BABYLON.Color3(1, 0.3, 0.3), idx: 3 },
            { name: "Bloch Sphere", color: new BABYLON.Color3(0.2, 1, 0.5), idx: 4 },
            { name: "Gates", color: new BABYLON.Color3(1, 0.7, 0.1), idx: 5 },
        ];

        const orbitNodes = [];
        concepts.forEach((c, i) => {
            const angle = (i / concepts.length) * Math.PI * 2;
            const radius = 4;

            const node = new BABYLON.TransformNode("orbit_" + i, scene);
            node.position.y = 2.5;

            const sphere = qvr.createQubitSphere("concept_" + i, 0.6, c.color, scene);
            sphere.parent = node;
            sphere.position.x = radius;
            gl.addIncludedOnlyMesh(sphere);

            // Label
            const label = qvr.createTextPlane(c.name, 36, 2, scene);
            label.parent = node;
            label.position.x = radius;
            label.position.y = 0.6;

            // Click to navigate
            sphere.isPickable = true;
            sphere.actionManager = new BABYLON.ActionManager(scene);
            sphere.actionManager.registerAction(
                new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => {
                    qvr.goTo(c.idx);
                })
            );
            // Hover highlight
            sphere.actionManager.registerAction(
                new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOverTrigger, () => {
                    sphere.material.emissiveColor = c.color.scale(0.6);
                })
            );
            sphere.actionManager.registerAction(
                new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOutTrigger, () => {
                    sphere.material.emissiveColor = c.color.scale(0.3);
                })
            );

            node._baseAngle = angle;
            orbitNodes.push(node);
        });

        // Animate orbits
        let t = 0;
        scene.onBeforeRenderObservable.add(() => {
            t += 0.003;
            orb.rotation.y += 0.005;
            orbitNodes.forEach((node, i) => {
                node.rotation.y = node._baseAngle + t;
            });
        });

        // Connecting beams from center to orbiting spheres
        concepts.forEach((c, i) => {
            const line = BABYLON.MeshBuilder.CreateLines("beam_" + i, {
                points: [new BABYLON.Vector3(0, 2.5, 0), new BABYLON.Vector3(4, 2.5, 0)],
                updatable: true,
            }, scene);
            line.color = c.color.scale(0.3);
            line.alpha = 0.3;
            line.parent = orbitNodes[i];
        });
    }
});
