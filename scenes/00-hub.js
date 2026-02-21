// Scene 0: Hub — Welcome portal with representative 3D objects
QVR.register({
    id: "hub",
    title: "Quantum VR Explorer",
    subtitle: "Click any object to explore that concept",
    info: "Welcome! Each floating object represents a quantum computing concept. Click one to dive in, or use the Scenes menu. In VR, point and trigger to interact.",

    async setup(scene, qvr) {
        qvr.createStarfield(scene);
        qvr.createLighting(scene);
        const gl = qvr.createGlow(scene);

        const camera = new BABYLON.ArcRotateCamera("cam", -Math.PI / 2, Math.PI / 3.5, 14, new BABYLON.Vector3(0, 1.5, 0), scene);
        camera.attachControl(qvr.canvas, true);
        camera.lowerRadiusLimit = 6;
        camera.upperRadiusLimit = 25;

        const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 20, height: 20 }, scene);
        const gMat = new BABYLON.StandardMaterial("gMat", scene);
        gMat.diffuseColor = new BABYLON.Color3(0.05, 0.05, 0.12);
        gMat.alpha = 0.3;
        ground.material = gMat;

        // Central atom-like orb
        const core = qvr.createQubitSphere("core", 1.2, new BABYLON.Color3(0.3, 0.5, 1.0), scene);
        core.position.y = 2.5;
        gl.addIncludedOnlyMesh(core);

        // Electron rings around core
        for (let i = 0; i < 3; i++) {
            const ring = BABYLON.MeshBuilder.CreateTorus("coreRing" + i, {
                diameter: 2.2 + i * 0.3, thickness: 0.02, tessellation: 48
            }, scene);
            ring.position.y = 2.5;
            ring.rotation.x = Math.PI / 3 * i;
            ring.rotation.z = Math.PI / 5 * i;
            const rMat = new BABYLON.StandardMaterial("crMat" + i, scene);
            rMat.emissiveColor = new BABYLON.Color3(0.2, 0.35, 0.8);
            rMat.disableLighting = true;
            rMat.alpha = 0.3;
            ring.material = rMat;
        }

        // Helper: make a mesh clickable and hoverable for scene navigation
        function makeNavigable(mesh, sceneIdx, glowColor) {
            mesh.isPickable = true;
            mesh.actionManager = new BABYLON.ActionManager(scene);
            mesh.actionManager.registerAction(
                new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => qvr.goTo(sceneIdx))
            );
            mesh.actionManager.registerAction(
                new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOverTrigger, () => {
                    mesh.material.emissiveColor = glowColor.scale(0.7);
                    mesh.scaling.setAll(1.15);
                })
            );
            mesh.actionManager.registerAction(
                new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOutTrigger, () => {
                    mesh.material.emissiveColor = glowColor.scale(0.25);
                    mesh.scaling.setAll(1);
                })
            );
        }

        function makeMat(name, color) {
            const m = new BABYLON.StandardMaterial(name, scene);
            m.diffuseColor = color;
            m.emissiveColor = color.scale(0.25);
            m.specularColor = new BABYLON.Color3(0.4, 0.4, 0.5);
            m.specularPower = 48;
            return m;
        }

        // ── Concept objects arranged in a circle ───────────────
        const concepts = [];
        const R = 5; // orbit radius

        // 1: Bit vs Qubit — light switch + sphere pair
        (function () {
            const parent = new BABYLON.TransformNode("c1", scene);
            const sw = BABYLON.MeshBuilder.CreateBox("sw1", { width: 0.3, height: 0.6, depth: 0.15 }, scene);
            sw.parent = parent; sw.position.x = -0.3;
            sw.material = makeMat("swMat", new BABYLON.Color3(0.8, 0.3, 0.3));
            const orb = BABYLON.MeshBuilder.CreateSphere("orb1", { diameter: 0.5, segments: 16 }, scene);
            orb.parent = parent; orb.position.x = 0.3;
            orb.material = makeMat("orbMat1", new BABYLON.Color3(0.3, 0.5, 1));
            gl.addIncludedOnlyMesh(orb);
            // Use orb as click target
            makeNavigable(orb, 1, new BABYLON.Color3(0.3, 0.5, 1));
            makeNavigable(sw, 1, new BABYLON.Color3(0.8, 0.3, 0.3));
            concepts.push(parent);
        })();

        // 2: Superposition — spinning coin (flat cylinder)
        (function () {
            const coin = BABYLON.MeshBuilder.CreateCylinder("coin2", { diameter: 0.7, height: 0.06, tessellation: 32 }, scene);
            coin.rotation.x = Math.PI / 2;
            coin.material = makeMat("coinMat", new BABYLON.Color3(0.9, 0.75, 0.2));
            gl.addIncludedOnlyMesh(coin);
            makeNavigable(coin, 2, new BABYLON.Color3(0.9, 0.75, 0.2));
            concepts.push(coin);
        })();

        // 3: Measurement — eye shape (torus squished)
        (function () {
            const eye = BABYLON.MeshBuilder.CreateTorus("eye3", { diameter: 0.6, thickness: 0.15, tessellation: 24 }, scene);
            eye.scaling.y = 0.5;
            eye.material = makeMat("eyeMat", new BABYLON.Color3(1, 0.3, 0.3));
            const pupil = BABYLON.MeshBuilder.CreateSphere("pupil3", { diameter: 0.2, segments: 12 }, scene);
            pupil.parent = eye;
            pupil.material = makeMat("pupilMat", new BABYLON.Color3(0.1, 0.1, 0.3));
            gl.addIncludedOnlyMesh(eye);
            makeNavigable(eye, 3, new BABYLON.Color3(1, 0.3, 0.3));
            concepts.push(eye);
        })();

        // 4: Bloch Sphere — wireframe sphere with arrow
        (function () {
            const parent = new BABYLON.TransformNode("c4", scene);
            const ws = BABYLON.MeshBuilder.CreateSphere("ws4", { diameter: 0.7, segments: 12 }, scene);
            ws.parent = parent;
            const wsMat = new BABYLON.StandardMaterial("wsMat4", scene);
            wsMat.wireframe = true;
            wsMat.emissiveColor = new BABYLON.Color3(0.15, 0.4, 0.25);
            wsMat.disableLighting = true;
            ws.material = wsMat;
            // Arrow as thin cylinder
            const arrow = BABYLON.MeshBuilder.CreateCylinder("arr4", { diameter: 0.04, height: 0.6, tessellation: 6 }, scene);
            arrow.parent = parent;
            arrow.rotation.z = -Math.PI / 4;
            arrow.position.y = 0.1;
            arrow.material = makeMat("arrMat", new BABYLON.Color3(1, 0.8, 0.2));
            makeNavigable(ws, 4, new BABYLON.Color3(0.2, 0.8, 0.4));
            concepts.push(parent);
        })();

        // 5: Quantum Gates — gate block with letter
        (function () {
            const gate = BABYLON.MeshBuilder.CreateBox("gate5", { width: 0.5, height: 0.5, depth: 0.15 }, scene);
            gate.material = makeMat("gateMat5", new BABYLON.Color3(1, 0.6, 0.1));
            gl.addIncludedOnlyMesh(gate);
            makeNavigable(gate, 5, new BABYLON.Color3(1, 0.6, 0.1));
            concepts.push(gate);
        })();

        // 6: Amplitudes & Phase — two sine waves (stacked tori)
        (function () {
            const parent = new BABYLON.TransformNode("c6", scene);
            const w1 = BABYLON.MeshBuilder.CreateTorus("w6a", { diameter: 0.5, thickness: 0.04, tessellation: 24 }, scene);
            w1.parent = parent; w1.position.y = 0.12;
            w1.material = makeMat("w6aMat", new BABYLON.Color3(0.4, 0.6, 1));
            const w2 = BABYLON.MeshBuilder.CreateTorus("w6b", { diameter: 0.5, thickness: 0.04, tessellation: 24 }, scene);
            w2.parent = parent; w2.position.y = -0.12; w2.rotation.y = Math.PI / 3;
            w2.material = makeMat("w6bMat", new BABYLON.Color3(1, 0.4, 0.6));
            makeNavigable(w1, 6, new BABYLON.Color3(0.4, 0.6, 1));
            makeNavigable(w2, 6, new BABYLON.Color3(1, 0.4, 0.6));
            concepts.push(parent);
        })();

        // 7: Interference — ripple (concentric tori)
        (function () {
            const parent = new BABYLON.TransformNode("c7", scene);
            for (let i = 0; i < 3; i++) {
                const ring = BABYLON.MeshBuilder.CreateTorus("rip7_" + i, {
                    diameter: 0.3 + i * 0.25, thickness: 0.025, tessellation: 24
                }, scene);
                ring.parent = parent;
                ring.rotation.x = Math.PI / 2;
                const m = makeMat("ripMat7_" + i, new BABYLON.Color3(0.2, 0.7, 1));
                m.alpha = 0.9 - i * 0.2;
                ring.material = m;
                if (i === 0) makeNavigable(ring, 7, new BABYLON.Color3(0.2, 0.7, 1));
            }
            // Make parent area clickable via invisible sphere
            const click = BABYLON.MeshBuilder.CreateSphere("click7", { diameter: 0.8 }, scene);
            click.parent = parent; click.isVisible = false; click.isPickable = true;
            makeNavigable(click, 7, new BABYLON.Color3(0.2, 0.7, 1));
            concepts.push(parent);
        })();

        // 8: Multi-Qubit — stacked cubes (exponential)
        (function () {
            const parent = new BABYLON.TransformNode("c8", scene);
            const colors = [
                new BABYLON.Color3(0.3, 0.8, 0.4),
                new BABYLON.Color3(0.5, 0.7, 0.3),
                new BABYLON.Color3(0.7, 0.6, 0.2),
                new BABYLON.Color3(0.9, 0.5, 0.2),
            ];
            for (let i = 0; i < 4; i++) {
                const s = 0.15 + i * 0.05;
                const b = BABYLON.MeshBuilder.CreateBox("mb8_" + i, { size: s }, scene);
                b.parent = parent;
                b.position.y = -0.3 + i * 0.22;
                b.position.x = (Math.random() - 0.5) * 0.1;
                b.rotation.y = i * 0.3;
                b.material = makeMat("mbMat8_" + i, colors[i]);
            }
            const click = BABYLON.MeshBuilder.CreateSphere("click8", { diameter: 0.9 }, scene);
            click.parent = parent; click.isVisible = false; click.isPickable = true;
            makeNavigable(click, 8, new BABYLON.Color3(0.5, 0.8, 0.3));
            concepts.push(parent);
        })();

        // 9: Entanglement — two linked spheres
        (function () {
            const parent = new BABYLON.TransformNode("c9", scene);
            const s1 = BABYLON.MeshBuilder.CreateSphere("ent9a", { diameter: 0.3, segments: 12 }, scene);
            s1.parent = parent; s1.position.x = -0.25;
            s1.material = makeMat("ent9aMat", new BABYLON.Color3(0.8, 0.3, 0.9));
            gl.addIncludedOnlyMesh(s1);
            const s2 = BABYLON.MeshBuilder.CreateSphere("ent9b", { diameter: 0.3, segments: 12 }, scene);
            s2.parent = parent; s2.position.x = 0.25;
            s2.material = makeMat("ent9bMat", new BABYLON.Color3(0.3, 0.8, 0.9));
            gl.addIncludedOnlyMesh(s2);
            // Link beam
            const link = BABYLON.MeshBuilder.CreateCylinder("link9", { diameter: 0.03, height: 0.5, tessellation: 6 }, scene);
            link.parent = parent; link.rotation.z = Math.PI / 2;
            link.material = makeMat("linkMat9", new BABYLON.Color3(0.6, 0.5, 1));
            makeNavigable(s1, 9, new BABYLON.Color3(0.8, 0.3, 0.9));
            makeNavigable(s2, 9, new BABYLON.Color3(0.3, 0.8, 0.9));
            concepts.push(parent);
        })();

        // 10: Quantum Circuits — horizontal rails with gate blocks
        (function () {
            const parent = new BABYLON.TransformNode("c10", scene);
            for (let i = 0; i < 2; i++) {
                const rail = BABYLON.MeshBuilder.CreateCylinder("rail10_" + i, {
                    diameter: 0.025, height: 0.8, tessellation: 6
                }, scene);
                rail.parent = parent;
                rail.rotation.z = Math.PI / 2;
                rail.position.y = -0.12 + i * 0.24;
                rail.material = makeMat("railMat10_" + i, new BABYLON.Color3(0.4, 0.4, 0.6));
            }
            // Gate blocks on rails
            const gateColors = [new BABYLON.Color3(0.2, 0.6, 1), new BABYLON.Color3(1, 0.4, 0.2)];
            for (let i = 0; i < 2; i++) {
                const g = BABYLON.MeshBuilder.CreateBox("gb10_" + i, { width: 0.15, height: 0.45, depth: 0.1 }, scene);
                g.parent = parent;
                g.position.x = -0.15 + i * 0.3;
                g.material = makeMat("gbMat10_" + i, gateColors[i]);
            }
            const click = BABYLON.MeshBuilder.CreateSphere("click10", { diameter: 0.9 }, scene);
            click.parent = parent; click.isVisible = false; click.isPickable = true;
            makeNavigable(click, 10, new BABYLON.Color3(0.4, 0.5, 0.8));
            concepts.push(parent);
        })();

        // ── Position all concepts in a circle ──────────────────
        const count = concepts.length;
        concepts.forEach((obj, i) => {
            const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
            obj.position = new BABYLON.Vector3(
                Math.cos(angle) * R,
                2.5,
                Math.sin(angle) * R
            );
        });

        // Connecting beams from center to each concept
        concepts.forEach((obj, i) => {
            const target = obj.position || obj.getAbsolutePosition();
            const line = BABYLON.MeshBuilder.CreateLines("beam_" + i, {
                points: [new BABYLON.Vector3(0, 2.5, 0), target]
            }, scene);
            line.color = new BABYLON.Color3(0.15, 0.2, 0.4);
            line.alpha = 0.2;
        });

        // ── Animate: gentle bob and slow orbit ─────────────────
        let t = 0;
        scene.onBeforeRenderObservable.add(() => {
            t += 0.008;
            core.rotation.y += 0.005;
            concepts.forEach((obj, i) => {
                const baseY = 2.5;
                // Each object bobs at a slightly different rate
                if (obj.position) {
                    obj.position.y = baseY + Math.sin(t + i * 1.2) * 0.15;
                }
                // Gentle self-rotation
                if (obj.rotation) {
                    obj.rotation.y += 0.003 + i * 0.001;
                }
            });
        });
    }
});
