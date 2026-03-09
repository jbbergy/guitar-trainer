# Guitare Trainer 🎸

A minimalist desktop application for guitar chord practice. Instantly display random chords and cycle through them with a single keypress.

## Features

- **Instant Practice**: Launch and start practicing immediately with a random chord displayed
- **12 Essential Chords**: Em, E, Am, A, C, G, D, Dm, E7, D7, A7, C7
- **Auto-Cycle Mode**: Automatically change chords at a set tempo (BPM) for hands-free practice
- **Keyboard-Driven**: Spacebar for next chord, no mouse required
- **High Contrast UI**: Dark theme with ochre accents optimized for readability
- **Accessible Design**: WCAG AA compliant, keyboard-only operation, colorblind-safe
- **Cross-Platform**: Works on macOS, Windows, and Linux

## Quick Start

```bash
# Install dependencies
npm install

# Run development version
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `SPACE` | Next random chord (or pause auto-cycle if active) |
| `L` | Open chord library |
| `ESC` | Close chord library |

## Auto-Cycle Mode

The auto-cycle feature allows you to practice chords hands-free by automatically changing to a new random chord at a set tempo:

- **Start/Stop**: Click the play/pause button in the top-left corner
- **Adjust Tempo**: Use the +/- buttons or type a BPM value (range: 20-240 BPM)
- **Default**: 60 BPM (one chord per second)
- **Pause with Spacebar**: Press spacebar during auto-cycle to pause and resume manual mode

**Practice Tips**:
- Start slow (40-60 BPM) to build muscle memory
- Increase tempo (80-120 BPM) as you improve
- Use faster tempos (140-180 BPM) for chord recognition training

## Requirements

- **Node.js**: 18.x or higher
- **npm**: 9.x or higher

## Development

### Project Structure

```
guitare-trainer/
├── src/
│   ├── main.ts                 # Electron main process
│   ├── preload.ts              # Secure IPC bridge
│   ├── constants/              # UI constants
│   ├── types/                  # TypeScript interfaces
│   ├── data/                   # Chord definitions
│   ├── utils/                  # Utility functions
│   └── renderer/               # Vue application
│       ├── App.vue             # Root component
│       ├── components/         # Vue components
│       ├── composables/        # Vue composables
│       └── styles/             # CSS stylesheets
├── tests/
│   ├── unit/                   # Unit tests (Vitest)
│   └── e2e/                    # End-to-end tests (Playwright)
└── public/                     # Static assets
```

### Tech Stack

- **Electron**: 28+ for cross-platform desktop
- **Vue 3**: 3.4+ with Composition API
- **TypeScript**: 5.3+ with strict mode
- **Vite**: 5.x for fast development
- **Vitest**: Unit testing framework
- **Playwright**: E2E testing framework

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- tests/unit/chordData.test.ts

# Run E2E tests
npm run test:e2e
```

### Code Quality

- **TypeScript Strict Mode**: All code is strictly typed
- **Component Size**: Components kept under 150 lines for maintainability
- **Test Coverage**: 105+ unit tests covering core functionality
- **Accessibility**: WCAG 2.1 AA compliant

## Performance Targets

✅ **Launch Time**: < 2 seconds from click to first chord display  
✅ **Chord Change**: < 100ms response time for spacebar press  
✅ **Rendering**: 60fps smooth transitions  
✅ **Memory**: Lightweight Electron app, minimal memory footprint

## Accessibility Features

- **Keyboard-Only Operation**: No mouse required
- **High Contrast**: 4.5:1 text contrast ratio, 3:1 UI elements
- **ARIA Labels**: Full screen reader support
- **Focus Management**: Clear visual focus indicators
- **Colorblind-Safe**: Shapes and numbers, not color alone
- **Responsive Text**: Maintains readability at all window sizes

## Building for Production

```bash
# Build for current platform
npm run build

# The built application will be in the dist/ directory
```

Electron Builder will create installers/packages for your platform:
- **macOS**: `.dmg` and `.app`
- **Windows**: `.exe` installer
- **Linux**: `.AppImage` and `.deb`

## Configuration

### Window Size

Default window size is 1024x768 with a minimum of 800x600. These are defined in `src/constants/ui.ts`.

### Chord Data

All chord definitions are in `src/data/chords.ts`. Each chord specifies:
- `name`: Display name (e.g., "Em", "C7")
- `frets`: Fret positions for 6 strings (0=open, X=muted, 1-12=fret number)
- `fingers`: Finger numbers for each string (0=open/muted, 1-4=fingers)
- `baseFret`: Starting fret for diagram display

### Styling

- **Theme**: Dark background (#1a1a1a) with ochre accents (#d4a574)
- **CSS**: Plain CSS, no frameworks (per design requirements)
- **Customization**: Edit `src/renderer/styles/theme.css` and `chord-diagram.css`

## Architecture

### Electron Main Process (`src/main.ts`)
- Window management and lifecycle
- Minimum size enforcement (800x600)
- Fullscreen toggle keyboard handling
- Native menu and system integration

### Vue Renderer Process (`src/renderer/`)
- Chord display and cycling logic
- SVG chord diagram rendering
- Keyboard event handling
- User interface components

### Data Layer
- Static chord definitions
- Uniform random selection algorithm
- Type-safe interfaces

## Troubleshooting

### Development Server Won't Start

```bash
# Kill any existing processes
pkill -f "vite|electron"

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Try again
npm run dev
```

### Build Fails

Ensure you have the required native dependencies:
```bash
# macOS
xcode-select --install

# Ubuntu/Debian
sudo apt-get install build-essential

# Windows
npm install --global windows-build-tools
```

## Contributing

This is a personal practice tool, but suggestions and improvements are welcome!

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Chord data based on standard guitar chord fingerings
- Built with Electron, Vue 3, and TypeScript
- Designed for guitarists who value focused, distraction-free practice

---

**Made with ♥ for guitar players everywhere**
