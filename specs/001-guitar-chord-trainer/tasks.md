# Tasks: Guitar Chord Trainer Desktop Application

**Input**: Design documents from `/specs/001-guitar-chord-trainer/`  
**Prerequisites**: plan.md ✓, spec.md ✓

**Tests**: Tests are NOT included per specification (TDD not requested for v1)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**Constitution Compliance**: All tasks align with Guitare Trainer principles:
- Accessibility-First: Keyboard shortcuts, high contrast, ARIA labels
- Simplicity & Extensibility: Chord data separate from rendering
- TypeScript Strictness: All interfaces explicitly typed
- Component-Driven UI: Single-responsibility components <150 lines
- Performance: <100ms response time for chord changes
- Styling: Plain CSS and Vue scoped styles (no CSS frameworks per user preference)

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and Electron + React + TypeScript structure

- [X] T001 Create project structure per plan.md: src/, tests/, public/ directories
- [X] T002 Initialize package.json with Electron 28+, Vue 3.4+, TypeScript 5.3+, Vite, Vitest, @vueuse/core dependencies
- [X] T003 [P] Configure tsconfig.json with strict mode enabled
- [X] T004 [P] Configure vite.config.ts for Electron main/renderer processes with Vue plugin
- [X] T005 [P] Configure electron-builder.json for macOS/Windows/Linux builds
- [X] T006 [P] Configure .eslintrc.json with TypeScript + Vue rules
- [X] T007 [P] Create src/renderer/index.html entry point with dark theme base styles
- [X] T008 Create src/constants/ui.ts with MIN_WIDTH=800, MIN_HEIGHT=600 constants

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T009 Create src/types/chord.ts with Chord interface (name: string, frets: (number|'X')[], fingers: number[], baseFret: number)
- [X] T010 [P] Create src/data/chords.ts with all 12 chord definitions (Em, E, Am, C, A, G, D, Dm, E7, D7, A7, C7)
- [X] T011 [P] Create src/utils/randomChord.ts with uniform random selection function
- [X] T012 [P] Create src/renderer/styles/theme.css with plain CSS (no frameworks): dark background (#1a1a1a), ochre accents (#d4a574), WCAG AA contrast ratios
- [X] T013 Create src/main.ts Electron main process with window creation, 800x600 minimum size, keyboard event handling
- [X] T014 Create src/preload.ts Electron preload script for secure IPC bridge
- [X] T015 Create tests/unit/randomChord.test.ts to validate uniform distribution
- [X] T016 [P] Create tests/unit/chordData.test.ts to validate all 12 chords have required fields

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Launch and Start Practicing Immediately (Priority: P1) 🎯 MVP

**Goal**: Application launches, displays random chord immediately, spacebar cycles to next random chord

**Independent Test**: Launch app → see chord name + diagram → press spacebar → new chord appears <100ms

### Implementation for User Story 1

- [X] T017 [P] [US1] Create src/renderer/components/ChordName.vue component to display chord name in large high-contrast text
- [X] T018 [P] [US1] Create src/renderer/components/ChordDiagram.vue SVG component with 6 strings, dynamic fret range (4-5 frets), numbered dots (1-4)
- [X] T019 [US1] Create src/renderer/components/ChordDisplay.tsx container combining ChordName + ChordDiagram components
- [X] T020 [US1] Create src/renderer/hooks/useChordCycle.ts custom hook with spacebar listener and random chord selection
- [X] T021 [US1] Create src/renderer/App.tsx main component using useChordCycle hook and ChordDisplay component
- [X] T022 [US1] Create src/renderer/main.tsx React root that renders App component
- [X] T023 [US1] Update src/main.ts to load initial random chord on application launch
- [X] T024 [US1] Add ARIA labels and keyboard focus management to ChordDisplay component
- [X] T025 [US1] Verify spacebar response time <100ms with performance testing
- [X] T026 [US1] Verify launch displays random chord within 2 seconds

**Checkpoint**: At this point, User Story 1 should be fully functional - app launches with chord, spacebar cycles chords

---

## Phase 4: User Story 2 - Practice with Full Chord Set (Priority: P1)

**Goal**: All 12 chords display correctly with accurate diagrams (fret positions, finger numbers, open/muted strings)

**Independent Test**: Press spacebar 100 times, verify all 12 chord types appear with legible, accurate diagrams

### Implementation for User Story 2

- [X] T027 [P] [US2] Create src/renderer/styles/chord-diagram.css with high-contrast SVG styles (strings, frets, dots, text)
- [X] T028 [US2] Enhance ChordDiagram.vue to render X/O symbols for muted/open strings above diagram
- [X] T029 [US2] Enhance ChordDiagram.vue to render fret position indicator (e.g., "3fr" for barre chords starting at fret 3)
- [X] T030 [US2] Enhance ChordDiagram.vue to dynamically calculate and display 4-5 frets starting from baseFret
- [X] T031 [US2] Enhance ChordDiagram.vue to render numbered dots (1-4) on correct string/fret positions
- [X] T032 [US2] Add colorblind-safe styling: ensure dots use shape/number, not color alone
- [X] T033 [US2] Add WCAG AA contrast validation: text 4.5:1, diagram elements 3:1 minimum
- [X] T034 [US2] Create tests/unit/components/ChordDiagram.test.ts to validate SVG rendering for all 12 chords
- [X] T035 [US2] Verify all 12 chords render correctly at 800x600 minimum window size
- [X] T036 [US2] Verify chord diagrams readable from 1 meter away (manual validation)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - all 12 chords display accurately with high accessibility

---

## Phase 5: User Story 3 - Keyboard-Only Operation (Priority: P1)

**Goal**: Entire application operable via keyboard: spacebar for next chord, keyboard shortcut for fullscreen toggle, no mouse required

**Independent Test**: Launch app without mouse, use only keyboard to cycle chords and toggle fullscreen, verify focus management

### Implementation for User Story 3

- [X] T037 [US3] Add fullscreen toggle keyboard shortcut (Cmd+F / Ctrl+F) to src/main.ts
- [X] T038 [US3] Add keyboard event handler for fullscreen shortcut in useChordCycle.ts composable
- [X] T039 [US3] Ensure window focus is automatically set on launch (no click required)
- [X] T040 [US3] Ensure spacebar works immediately after window regains focus (no click required)
- [X] T041 [US3] Add visual keyboard shortcut documentation overlay (toggle with "?" key)
- [X] T042 [US3] Ensure all interactive elements have visible focus indicators (outline styling)
- [ ] T043 [US3] Create tests/e2e/accessibility.spec.ts to validate keyboard-only operation with Playwright
- [ ] T044 [US3] Create tests/e2e/window.spec.ts to validate fullscreen toggle behavior
- [X] T045 [US3] Verify rapid spacebar presses (<100ms) don't skip or lag

**Checkpoint**: All core user stories complete - fully keyboard-accessible chord trainer ready

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and production readiness

- [X] T046 [P] Create tests/e2e/launch.spec.ts to validate 2-second launch time and initial random chord
- [X] T047 [P] Create tests/e2e/spacebar.spec.ts to validate spacebar cycling and randomness
- [X] T048 [P] Add window resize handler to maintain diagram readability with proportional scaling
- [X] T049 [P] Enforce 800x600 minimum window size in src/main.ts (prevent resize below threshold)
- [X] T050 [P] Add application icon to public/icon.png (placeholder or custom design)
- [X] T051 [P] Add Vue error handler (app.config.errorHandler) for graceful error handling
- [X] T052 [P] Optimize SVG rendering performance for 60fps smooth transitions
- [X] T053 Code review and refactoring: ensure all components <150 lines
- [X] T054 [P] Update README.md with installation, build, and usage instructions
- [ ] T055 Run all E2E tests to validate success criteria (launch time, response time, accessibility)
- [ ] T056 Build production packages for macOS/Windows/Linux with electron-builder
- [ ] T057 Manual validation of WCAG AA contrast compliance and colorblind accessibility

---

## Phase 7: Additional Features (User-Requested)

**Purpose**: Navigation history, memory training mode, and zoom functionality

- [X] T058 Add chord history tracking to useChordCycle composable with history array and index
- [X] T059 Implement previousChord() function for backward navigation
- [X] T060 Add keyboard shortcuts for previous chord (Left Arrow / Backspace)
- [X] T061 Add memory training mode toggle state (isMemoryMode) to useChordCycle
- [X] T062 Add keyboard shortcut 'M' to toggle memory training mode
- [X] T063 Update ChordCard component to accept memoryMode prop
- [X] T064 Update ChordCard to conditionally hide diagram in memory mode
- [X] T065 Update ChordCard styles for larger text in memory mode (8rem vs 4rem)
- [X] T066 Update ChordDisplay to pass memoryMode prop to ChordCard
- [X] T067 Add memory mode toggle button to App.vue with visual indicator
- [X] T068 Update App.vue hint text with new keyboard shortcuts
- [X] T069 Update KeyboardHelp component with new shortcuts documentation
- [X] T070 Verify all new features work correctly and integrate smoothly

### Zoom Feature (Added: 28 janvier 2026)

**Purpose**: Allow users to zoom the chord diagram and name for better visibility

- [X] T071 Create ZoomControls.vue component with slider positioned at bottom left
- [X] T072 Add zoom state management to App.vue (zoomLevel: 50-200%)
- [X] T073 Pass zoom level from App.vue through ChordDisplay to ChordCard
- [X] T074 Apply zoom scaling to ChordCard name font size and diagram size
- [X] T075 Add keyboard shortcuts for zoom (Ctrl/Cmd + Plus, Minus, 0)
- [X] T076 Add mouse wheel zoom support (Ctrl/Cmd + wheel)
- [X] T077 Update App.vue hint text with zoom keyboard shortcuts
- [X] T078 Style ZoomControls with high contrast and accessibility features

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User Story 1: Launch & Spacebar (MVP core)
  - User Story 2: Full Chord Set (builds on US1 ChordDiagram component)
  - User Story 3: Keyboard-Only (adds shortcuts and focus management to US1)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Depends on US1 ChordDiagram component existing - Enhances diagram with full styling
- **User Story 3 (P1)**: Depends on US1 keyboard handler existing - Adds fullscreen and focus management

### Within Each User Story

- **US1**: ChordName + ChordDiagram components (parallel) → ChordDisplay container → App integration → Performance validation
- **US2**: Diagram styling (parallel with rendering enhancements) → Accessibility validation → Visual validation
- **US3**: Fullscreen shortcut + focus management → E2E testing → Keyboard-only validation

### Parallel Opportunities

- **Phase 1**: T003, T004, T005, T006, T007 can all run in parallel (independent config files)
- **Phase 2**: T010, T011, T012, T016 can run in parallel (independent files)
- **Phase 3 (US1)**: T017, T018 can run in parallel (independent components)
- **Phase 4 (US2)**: T027, T028-T033 can run in parallel with testing tasks T034-T036
- **Phase 5 (US3)**: T041, T042, T043, T044 can run in parallel (independent features + tests)
- **Phase 6**: Most polish tasks marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch component creation in parallel:
Task T017: "Create ChordName.vue component"
Task T018: "Create ChordDiagram.vue SVG component"

# Then integrate them:
Task T019: "Create ChordDisplay.vue container" (depends on T017 + T018)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup → Project scaffolding ready
2. Complete Phase 2: Foundational → Chord data and types ready
3. Complete Phase 3: User Story 1 → **Working chord trainer with spacebar cycling**
4. **STOP and VALIDATE**: Test independently - can you practice chords?
5. Deploy/demo MVP with just spacebar-driven random chord practice

### Incremental Delivery

1. Setup + Foundational → Foundation ready (tasks T001-T016)
2. Add User Story 1 → Test independently → **MVP READY** (tasks T017-T026)
3. Add User Story 2 → Test independently → All 12 chords fully styled and accessible (tasks T027-T036)
4. Add User Story 3 → Test independently → Keyboard-only operation complete (tasks T037-T045)
5. Polish → Production ready (tasks T046-T057)

### Recommended Delivery Order

Since all three user stories have P1 priority and build on each other:
1. **US1 first** (core functionality - MVP)
2. **US2 second** (complete chord set - enhances US1)
3. **US3 third** (keyboard shortcuts - enhances US1 + US2)

This ensures each increment adds value without breaking previous functionality.

---

## Notes

- No tests in main implementation phases per spec (TDD not requested for v1)
- E2E tests included in Phase 5 & 6 to validate acceptance criteria
- All [P] tasks = different files, can run in parallel
- Each user story independently testable via acceptance scenarios
- Minimum window size enforced to maintain diagram readability
- WCAG AA compliance validated in Phase 4 (US2)
- Total tasks: 57 (8 setup + 8 foundational + 10 US1 + 10 US2 + 9 US3 + 12 polish)
