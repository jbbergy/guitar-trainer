# Release Notes

## [1.5.0] - 2026-11-11

### Added
- Repeat signs (`|:` `:|`, play count) and alternate endings (1st / 2nd time): shown and editable in the Compose editor, followed by playback.
- Repeats are read from text tabs (`|:`, `:|`, `*` dots, `x2`), Guitar Pro, MusicXML, alphaTex and engraved PDFs, and written to text tabs, Guitar Pro, MusicXML and alphaTex. MIDI files contain the repeated sections written out in full.
- Engraved PDFs: note lengths are now read from the stems, flags, beams and dots under the tab staff, or from the notation staff above it, together with the time signature and the tempo. Measures that cannot be read fall back to the spacing of the numbers, fitted to the measure length.

## [1.4.0] - 2026-11-11

### Added
- Tablature library: tablatures are stored on the device, saved automatically, searchable, and can be backed up to a single file. Drafts of the previous Compose editor are brought into the library.
- Import of text / ASCII tabs, PDF (text or engraved with real text; scans are not supported), Guitar Pro 3–8, MusicXML, alphaTex and Guitare Trainer JSON, with tuning detection and a preview.
- Conversion between guitar, ukulele (high / low G), baritone ukulele (DGBE) and alternate tunings, keeping either the key or the fingerings.
- Export to text tab, Guitar Pro (.gp), MusicXML, MIDI, alphaTex, JSON and Print / PDF.

### Changed
- Compose editor rebuilt: cursor-based grid, two-digit frets, techniques (h p / \\ b r ~), muted notes, selection, copy/paste, undo/redo, step and measure editing, chord stamping, triplet grids, capo, loop playback.
- Compose shortcuts: `⌘/Ctrl + I` now opens Import and `⌘/Ctrl + P` prints; the tablature's instrument is chosen per tablature instead of following the instrument toggle.

### Dependencies
- Added `@coderline/alphatab` (MPL-2.0) to read and write Guitar Pro / MusicXML files; it is loaded only when such a file is used.
- Added `pdfjs-dist` (Apache-2.0) to read PDF tablatures, also loaded on demand.

## [1.3.1] - 2026-04-07

### Fixed
- Listen mode now correctly detects notes played on tin whistle (monophonic single-note detection).
- Pitch comparison for tin whistle uses pitch class matching to avoid sharp/flat name mismatches (e.g. A# vs Bb).

## [1.2.0] - 2026-04-02

### Added
- New Compose tab with chord progression tooling and related tablature typing support.

### Changed
- Updated cycle controls and settings flows to support the Compose workflow.
- Refined keyboard help and bottom bar interactions for better navigation.

### Tests
- Added and updated unit tests for the Compose tab and chord cycle behavior.

## [1.1.1] - 2026-03-27

### Changed
- Renamed the **Accessibility** menu to **Settings** for clearer navigation.
- Improved user and developer documentation (installation, keyboard shortcuts, scripts, architecture).
- Configuration adjustments for the 1.1.1 release.

### Maintenance
- Cleaned the source repository by removing compiled JavaScript artifacts from TypeScript folders.
- Updated dependencies and build files related to the release.

## [1.1.0] - 2026-03-27

### Added
- New **Listen** mode with microphone-based chord detection.
- Audio setup window to select the microphone input and verify signal level.
- New audio detection composable and chord detection utilities.
- New control bar (top/bottom layout) to speed up practice flow.
- New centralized **Settings** menu.

### Changed
- Major visual redesign of the interface (liquid glass style).
- Reorganized Auto Cycle controls for better ergonomics.
- Integrated Listen mode into the main training flow.
- Removed the standalone Ear feature in favor of a unified Listen mode.

### Tests
- Updated unit tests around Auto Cycle controls and related UI.

## Scope
These notes cover changes between **v1.0.5** and **v1.2.0**.
