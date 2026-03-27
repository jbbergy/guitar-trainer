# Guitare Trainer

Desktop app (Electron + Vue) to practice chords and scales on guitar or ukulele, fast, keyboard-first, with or without a microphone.

## For Users

### What the App Does

- Shows random chords (guitar or ukulele)
- Changes chords from the keyboard with one key
- Includes Auto Cycle mode (tempo in BPM)
- Includes Memory mode (hide/show the diagram)
- Includes Listen mode (microphone-based chord detection)
- Includes a chord library and a scale trainer
- Works on macOS, Windows, and Linux

### Installation

1. Download the latest version from the project releases.
2. Official releases are currently available for macOS only.
	- macOS: `.dmg` file
3. For Windows and Linux, build from source (see the developer section below).
4. Launch the application.

### Quick Start (2 Minutes)

1. Open the app.
2. Press Space to show the next chord.
3. Press L to open the chord library.
4. Enable Auto Cycle to move through chords automatically.
5. Enable Listen Mode if you want to advance only when the played chord is recognized.

### Keyboard Shortcuts

| Key | Action |
|---|---|
| `SPACE` | Next chord (or pause if Auto Cycle is active) |
| `←` / `Backspace` | Previous chord |
| `→` | Next chord in history |
| `M` | Toggle Memory mode |
| `I` | Toggle Guitar/Ukulele |
| `D` | Cycle difficulty level |
| `L` | Open/close chord library |
| `S` | Open/close Scale Trainer |
| `?` | Open/close keyboard help |
| `Esc` | Close active modal/window |
| `Cmd/Ctrl + +` | Zoom in |
| `Cmd/Ctrl + -` | Zoom out |
| `Cmd/Ctrl + 0` | Reset zoom |

### Practice Tips

- Start at 40-60 BPM in Auto Cycle to build clean transitions.
- Increase gradually to 80-120 BPM for fluid chord changes.
- Use Memory Mode to test recall without visual support.
- Use Listen Mode to validate that the played chord is correct.

### Common Issue: Microphone Detects Nothing

1. Open the Listen Mode setup.
2. Select the correct audio input.
3. Click Test Input and check the signal bar.
4. Verify microphone permissions in your OS (macOS/Windows/Linux).

## For Developers

### Tech Stack

- Electron 28
- Vue 3 (Composition API)
- TypeScript 5 (strict)
- Vite 5
- Vitest (unit tests)
- Playwright (end-to-end tests)

### Prerequisites

- Node.js 18+
- npm 9+

### Setup and Run

```bash
npm install
npm run dev
```

### Useful Scripts

```bash
# Dev Electron + renderer
npm run dev

# Dev renderer only
npm run dev:web

# Build production + packaging Electron
npm run build

# Preview web build
npm run preview

# Unit tests
npm test

# E2E tests
npm run test:e2e

# Lint
npm run lint

# Type checking
npm run type-check
```

### Project Structure

```text
src/
	main.ts                 Electron main process
	preload.ts              Secure bridge
	constants/              UI constants
	data/                   Chord data
	types/                  TypeScript types
	utils/                  Business utilities
	renderer/
		App.vue               Main shell
		components/           UI components
		composables/          Reactive logic
		styles/               Theme + styles

tests/
	unit/                   Vitest
	e2e/                    Playwright
```

### Architecture Notes

- Main process: native window, lifecycle, Electron security.
- Renderer process: rendering, keyboard interactions, UI state.
- Core composable: chord cycling, auto-cycle, memory mode, listen mode.
- Static chord data per instrument, with difficulty filtering.

### Build and Packaging

The command below generates packaged desktop builds via electron-builder:

```bash
npm run build
```

Typical build outputs (when built locally):
- macOS: `.dmg` and `.app`
- Windows: `.exe`
- Linux: `.AppImage` and/or `.deb`

Release status:
- macOS: official releases available
- Windows: no official release yet
- Linux: no official release yet

### Contribution

Issues and improvement ideas are welcome. For a clean PR:

1. Create a feature/fix branch.
2. Add or update tests when needed.
3. Run lint, type-check, and tests before opening the PR.

## License

MIT
