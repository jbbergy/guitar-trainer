# Implementation Plan: Guitar Chord Trainer Desktop Application

**Branch**: `001-guitar-chord-trainer` | **Date**: 23 janvier 2026 | **Spec**: [spec.md](./spec.md)

## Summary

Create a desktop application that displays guitar chord diagrams for instant practice. Users press spacebar to cycle through 12 foundational chords (Em, E, Am, C, A, G, D, Dm, E7, D7, A7, C7) with high-contrast, accessible visual diagrams suitable for colorblind and low-vision users. Zero configuration, keyboard-only operation, sub-100ms response time.

## Technical Context

**Language/Version**: Electron + TypeScript 5.3+ (HTML/CSS/JS for cross-platform desktop with native window APIs)  
**Primary Dependencies**: Electron 28+, Vue 3.4+ with Composition API for UI rendering, SVG for chord diagrams  
**Storage**: N/A (no persistence required for v1)  
**Testing**: Vitest for unit tests, Playwright for E2E testing  
**Target Platform**: macOS, Windows, Linux desktop environments  
**Project Type**: Desktop application (Electron-based single page application)  
**Performance Goals**: <100ms spacebar response, <2s application launch, 60fps diagram rendering  
**Constraints**: WCAG 2.1 AA compliance (4.5:1 contrast for text, 3:1 for diagrams), 800x600px minimum window size, keyboard-only operation  
**Scale/Scope**: 12 static chords, single window, no networking, no data persistence  
**Styling**: Plain CSS with Vue scoped styles (no CSS frameworks like Tailwind, Bootstrap, etc.)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Accessibility-First**: Keyboard-only navigation via spacebar and keyboard shortcuts (fullscreen toggle). Visual diagrams use numbered notation (1-4) not color-coding. High contrast theme (4.5:1 minimum).
- [x] **Simplicity & Extensibility**: Chord data stored as JSON configuration separate from rendering logic. New chords can be added by extending data file without code changes.
- [x] **TypeScript Strictness**: Strict mode enabled throughout. Chord interface, diagram props, and UI state all explicitly typed.
- [x] **Component-Driven UI**: Single-responsibility Vue SFC components: ChordDisplay, ChordDiagram, ChordName. Each under 150 lines. Composition API for logic reuse.
- [x] **Performance**: SVG-based chord rendering ensures sub-100ms response. Vue reactive state triggers immediate component updates.

*No violations. All constitution principles maintained.*

## Project Structure

### Documentation (this feature)

```text
specs/001-guitar-chord-trainer/
├── plan.md              # This file
├── spec.md              # Feature specification (complete)
├── checklists/
│   └── requirements.md  # Spec validation checklist
└── tasks.md             # Implementation tasks (to be generated)
```

### Source Code (repository root)

```text
src/
├── main.ts              # Electron main process (window management, IPC)
├── preload.ts           # Electron preload script (secure IPC bridge)
├── renderer/
│   ├── index.html       # Application entry point
│   ├── main.ts          # Vue app initialization and mount
│   ├── App.vue          # Main application component
│   ├── components/
│   │   ├── ChordDisplay.vue      # Container for chord name + diagram
│   │   ├── ChordName.vue         # Chord name text display
│   │   └── ChordDiagram.vue      # SVG chord diagram renderer
│   ├── composables/
│   │   └── useChordCycle.ts      # Keyboard event + random selection logic
│   ├── data/
│   │   └── chords.ts             # Chord definitions (12 chords as typed data)
│   ├── types/
│   │   └── chord.ts              # TypeScript interfaces (Chord, ChordData)
│   └── styles/
│       ├── theme.css             # Dark theme with ochre accents
│       └── chord-diagram.css     # Diagram-specific styles (high contrast)
├── utils/
│   └── randomChord.ts            # Uniform random selection utility
└── constants/
    └── ui.ts                     # Window constraints (MIN_WIDTH, MIN_HEIGHT)

tests/
├── unit/
│   ├── randomChord.test.ts       # Random selection logic
│   ├── chordData.test.ts         # Chord data validation
│   └── components/
│       ├── ChordDiagram.test.tsx # Diagram rendering
│       └── ChordDisplay.test.tsx # Integration of name + diagram
└── e2e/
    ├── launch.spec.ts            # Application launch + initial chord display
    ├── spacebar.spec.ts          # Spacebar cycling behavior
    ├── window.spec.ts            # Resizing + fullscreen behavior
    └── accessibility.spec.ts     # Keyboard-only operation + contrast validation

public/
└── icon.png                      # Application icon (placeholder)

package.json                      # Dependencies + scripts
tsconfig.json                     # TypeScript configuration (strict mode)
vite.config.ts                    # Vite bundler configuration for Electron
electron-builder.json             # Build configuration for packaged apps
.eslintrc.json                    # Linting rules
```

**Structure Decision**: Electron + Vue 3 + TypeScript desktop application. Electron provides cross-platform native window APIs (resizing, fullscreen, keyboard events). Vue 3 with Composition API + SVG enables declarative chord diagram rendering with accessibility features. Vite provides fast development builds and HMR. TypeScript ensures type safety for chord data structures and component props.

## Complexity Tracking

> No complexity violations detected. Single project, straightforward Electron/React architecture, no external services or complex state management needed.
