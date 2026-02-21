# Quantum VR Explorer — Remaining Work

## Scenes to Build (6–20)

See CONCEPTS.md for full descriptions. Each scene follows the same pattern:
register via `QVR.register()` in `scenes/NN-name.js`, add `<script>` tag in index.html.

### Tier 2: Core Mechanics
- [ ] **06 — Amplitudes & Phase**: Wave alignment demo, phase as hue wheel on Bloch equator
- [ ] **07 — Interference**: 3D ripple tank with two sources, constructive/destructive patterns
- [ ] **08 — Multi-Qubit Systems**: Add-a-qubit histogram showing exponential state space growth
- [ ] **09 — Entanglement**: Two linked Bloch spheres, CNOT to entangle, correlated measurements
- [ ] **10 — Quantum Circuits**: 3D circuit builder with qubit wires, draggable gates, step-through playback

### Tier 3: Gates & Protocols
- [ ] **11 — CNOT Gate**: Control/target qubit visualization, conditional flip beam
- [ ] **12 — Bell States**: H+CNOT circuit, four Bell state orbit patterns, correlation tally
- [ ] **13 — Teleportation**: Alice/Bob platforms, entangled pair, classical bit transfer, state reconstruction
- [ ] **14 — No-Cloning**: Copy machine that works for classical objects but fails on qubits

### Tier 4: Algorithms
- [ ] **15 — Hadamard Transform**: N qubits all getting H gates, 2^N histogram bars rising
- [ ] **16 — Grover's Search**: Room of doors, oracle marking, amplitude amplification iterations
- [ ] **17 — Shor's Algorithm**: RSA padlock story, periodicity visualization, QFT as prism
- [ ] **18 — QFT**: Waveform input, crystalline prism, frequency peak output

### Tier 5: Real-World
- [ ] **19 — Decoherence**: Bloch sphere under particle bombardment, coherence timer, shielding
- [ ] **20 — Error Correction**: Logical qubit protected by physical qubit formation, syndrome detection

## Visual Improvements
- [ ] PBR materials instead of StandardMaterial for more realistic lighting
- [ ] Spatial audio cues for gate applications, measurements, transitions
- [ ] Particle effects for state transitions (collapse, entanglement creation)
- [ ] Controller haptic feedback in VR for interactions
- [ ] Animated gate rotation trails with gradient colors

## VR Interaction Improvements
- [ ] Grab-and-drag state vector on Bloch sphere with controllers
- [ ] Point-and-click gate application in VR
- [ ] 3D spatial info panels that follow the user's gaze
- [ ] Voice narration option for each concept (pre-recorded audio files)
- [ ] Hand tracking support (beyond controllers)

## Navigation & UX
- [ ] Scene transition animations (warp/portal effect between concepts)
- [ ] Progress tracker showing completed/visited scenes
- [ ] Quiz mode: test understanding after each tier
- [ ] Concept graph view: navigate between related concepts via 3D edges
- [ ] Bookmark/share specific scenes via URL hash

## Knowledge Graph Extension
- [ ] Curated graph of ~50-100 quantum computing concepts as static JSON
- [ ] 3D force-directed graph layout
- [ ] Fly-to-node navigation with controller pointing
- [ ] Node detail panels with interactive mini-demos
- [ ] Edge labels showing relationships (requires, enables, related-to)

## Technical Debt
- [ ] Extract shared Bloch sphere component (used in scenes 4, 5, 9, 11, 12, 19, 20)
- [ ] Lazy-load scene scripts to reduce initial page weight
- [ ] Add loading indicator during scene transitions
- [ ] Mobile touch controls for non-VR mobile browsers
- [ ] Accessibility: screen reader descriptions for each scene
