<!--
=== SYNC IMPACT REPORT ===
Version Change: N/A → 1.0.0 (Initial Constitution)
Modified Principles: N/A (Initial creation)
Added Sections:
  - Core Principles (5 principles)
  - Technology Stack
  - Design & Accessibility Standards
  - Governance
Templates Requiring Updates:
  ✅ plan-template.md - Constitution Check section will reference these principles
  ✅ spec-template.md - User scenarios must consider accessibility requirements
  ✅ tasks-template.md - Tasks must respect accessibility and extensibility principles
Follow-up TODOs: None - all fields populated
===========================
-->

# Guitare Trainer Constitution

## Core Principles

### I. Accessibility-First (NON-NEGOTIABLE)

The application MUST be fully usable without a mouse. All functionality MUST be accessible via keyboard shortcuts. Visual information MUST NOT rely solely on color to convey meaning.

**Rationale**: Guitar practice requires hands-free operation. Users with visual impairments or motor disabilities must have equal access to the training tools.

**Specific Requirements**:
- Keyboard navigation for all interactive elements (Space bar for chord changes, Tab navigation, Enter to activate)
- WCAG AA contrast ratios minimum (4.5:1 for text, 3:1 for UI components)
- Chord diagrams MUST use shapes, labels, and size to convey information (not just color)
- Text alternatives for visual elements
- Screen reader compatibility for chord information

### II. Simplicity & Extensibility

The codebase MUST maintain clear separation between chord data, rendering logic, and application state. Adding new chords or exercises MUST require minimal code changes (ideally just data additions).

**Rationale**: The application starts with 12 chords but must easily scale to hundreds. Complex coupling makes maintenance difficult and discourages enhancement.

**Specific Requirements**:
- Chord data defined in declarative format (JSON/TypeScript objects)
- Rendering components accept chord data as props (no hardcoded chords)
- Exercise logic separated from chord display logic
- New chord types (e.g., barre chords, extended chords) require only new renderer, not core refactoring

### III. TypeScript Strictness

All code MUST use TypeScript with strict mode enabled. No `any` types except when interfacing with untyped third-party libraries (and even then, create type definitions when feasible).

**Rationale**: Electron + Vue applications can become error-prone during refactoring. Strong typing catches bugs at compile time and serves as inline documentation.

**Specific Requirements**:
- `"strict": true` in tsconfig.json
- Explicit return types for all functions
- Typed interfaces for all chord data, application state, and event handlers
- Discriminated unions for state machines or variant types

### IV. Component-Driven UI

Vue components MUST be small, focused, and reusable. Composition API preferred over Options API. Each component MUST have a single, clear responsibility.

**Rationale**: Small components are easier to test, maintain, and reason about. Composition API provides better TypeScript inference and code organization.

**Specific Requirements**:
- Components under 200 lines (extract sub-components if exceeded)
- Props and emits explicitly typed
- Composables for shared logic (useChordRandomizer, useKeyboardShortcuts)
- No direct DOM manipulation (use Vue refs and reactive state)
- Slots for flexible composition where appropriate

### V. Performance & Responsiveness

The UI MUST remain responsive during chord transitions. Chord rendering MUST complete within 100ms on mid-range hardware. Application startup MUST be under 2 seconds.

**Rationale**: Practice sessions require immediate feedback. Laggy chord changes disrupt the learning flow and frustrate users.

**Specific Requirements**:
- SVG-based chord diagrams (scalable, performant)
- Lazy-load heavy resources (e.g., chord images if used)
- Debounce rapid key presses to prevent UI thrashing
- Electron window size optimized for chord visibility (not full-screen by default)
- Use Vue's `<Transition>` for smooth chord changes

## Technology Stack

**Fixed Constraints**:
- **Platform**: Electron (desktop application for macOS, Windows, Linux)
- **UI Framework**: Vue 3 with Composition API
- **Language**: TypeScript (ES2020+ target)
- **Build Tool**: Vite (fast HMR for development)
- **Package Manager**: npm or pnpm

**Recommended Dependencies**:
- `electron-builder` for packaging
- `@vueuse/core` for common composables (keyboard shortcuts, window state)
- SVG libraries if chord diagrams require complex rendering (e.g., `d3` for advanced visualizations)

**Forbidden**:
- jQuery or similar imperative DOM libraries (conflicts with Vue reactivity)
- Inline styles in templates (use scoped CSS or CSS modules)

## Design & Accessibility Standards

**Color Palette (Dark Theme)**:
- **Background**: `#0a0a0a` to `#1a1a1a` (very dark gray/black)
- **Text**: `#ffffff` (pure white for body text)
- **Accent (Interactive)**: `#d4a574` (ochre) or `#f4c542` (yellow-gold)
- **Accent (Hover/Focus)**: `#e6b886` (lighter ochre) or `#ffda6a` (lighter yellow)
- **Muted/Disabled**: `#6a6a6a` (gray)

**Typography**:
- Sans-serif system fonts (fast, familiar): `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`
- Minimum 16px base font size
- Chord diagrams: Larger labels (18px+) for fret numbers and finger positions

**Focus Indicators**:
- 2px solid ochre/yellow outline on focused elements
- Clearly visible against dark background

**Chord Diagram Requirements**:
- Minimum 240px width for readability
- Use filled circles (●) for fretted notes, hollow circles (○) for open strings, X for muted strings
- Fret numbers displayed beside the diagram
- Finger numbers (1, 2, 3, 4) overlaid on notes (not just color-coded)

## Governance

**Amendment Process**:
1. Propose change with rationale (why current principle is blocking progress or incorrect)
2. Document impact on existing code (what needs to change)
3. Update this constitution with new version number (see versioning below)
4. Update affected templates (plan, spec, tasks) to align with new principles
5. Update runtime guidance if AI assistant behavior needs adjustment

**Versioning**:
- **MAJOR**: Backward-incompatible principle changes (e.g., removing TypeScript requirement)
- **MINOR**: New principle additions or significant expansions (e.g., adding security principle)
- **PATCH**: Clarifications, typos, wording refinements (no semantic change)

**Compliance**:
- All feature specifications MUST reference applicable principles in requirements section
- All implementation plans MUST include Constitution Check gate (blocking before Phase 0)
- Code reviews MUST verify adherence (TypeScript strictness, accessibility, component size)
- Violations MUST be justified in plan's Complexity Tracking section OR fixed

**Guidance Files**: `.specify/memory/constitution.md` (this file) serves as the primary governance document. AI assistants (GitHub Copilot, Spec Kit) MUST respect these principles when generating specs, plans, and code.

**Version**: 1.0.0 | **Ratified**: 2026-01-23 | **Last Amended**: 2026-01-23
