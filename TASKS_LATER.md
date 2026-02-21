# Quantum VR Explorer — Remaining Work

All 25 scenes are implemented. Below is polish and extension work.

## Visual Improvements
- [ ] PBR materials for more realistic lighting
- [ ] Spatial audio cues for gate applications, measurements, transitions
- [ ] Particle effects for state transitions (collapse, entanglement creation)
- [ ] Controller haptic feedback in VR
- [ ] Animated gate rotation trails with gradient colors
- [ ] Loading indicator during scene transitions

## VR Interaction Improvements
- [ ] Grab-and-drag state vector on Bloch sphere with controllers
- [ ] Point-and-click gate application in VR
- [ ] 3D spatial info panels that follow gaze
- [ ] Voice narration option (pre-recorded audio files)
- [ ] Hand tracking support (beyond controllers)

## Navigation & UX
- [ ] Warp/portal transition effects between scenes
- [ ] Progress tracker showing visited scenes
- [ ] Quiz mode: test understanding after each tier
- [ ] Concept graph view: navigate between related concepts via 3D edges
- [ ] Bookmark/share specific scenes via URL hash (#scene-id)
- [ ] Mobile touch controls for non-VR mobile browsers

## Knowledge Graph Extension
- [ ] Curated graph of quantum concepts as static JSON
- [ ] 3D force-directed graph layout
- [ ] Fly-to-node navigation with controller pointing
- [ ] Node detail panels with interactive mini-demos
- [ ] Edge labels showing relationships

## Technical Debt
- [ ] Extract shared Bloch sphere component (used in scenes 4, 5, 9, 11, 19)
- [ ] Extract shared button/status-display helpers to reduce duplication
- [ ] Lazy-load scene scripts to reduce initial page weight
- [ ] Accessibility: screen reader descriptions for each scene
- [ ] Performance profiling for scenes with many particles (7, 8)
