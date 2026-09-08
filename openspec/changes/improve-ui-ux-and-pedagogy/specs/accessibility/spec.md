## ADDED Requirements

### Requirement: Every interactive control has an accessible name
Every button, link, or icon-only control MUST have either visible text content or an `aria-label`. The `TtsService.speak` 🔊 buttons, the rating buttons in the study session, and the close/exit controls MUST each carry an explicit `aria-label`.

#### Scenario: Icon-only speak button
- **WHEN** a card renders a 🔊 icon button next to the term, definition, or example
- **THEN** the button MUST have a non-empty `aria-label` describing the action in the current locale

### Requirement: Focus styles are visible
Interactive elements MUST show a Tailwind `focus-visible:ring-2 ring-offset-2` (or equivalent) focus ring. Native browser focus rings MUST NOT be suppressed via `outline: none` without a replacement.

#### Scenario: User tabs through the study session
- **WHEN** the learner uses the Tab key to move between rating buttons
- **THEN** the focused button MUST display a visible focus ring

### Requirement: Motion respects user preference
Any celebration animation, transition, or auto-advance timer MUST be disabled when `prefers-reduced-motion: reduce` is set. Implementations MUST use a CSS media query (`@media (prefers-reduced-motion: reduce)`) or a runtime check.

#### Scenario: Reduced-motion user finishes a session
- **WHEN** the learner's OS reports `prefers-reduced-motion: reduce`
- **THEN** any end-of-session animation MUST NOT play; the summary MUST appear immediately without a fade or slide

### Requirement: Color contrast meets WCAG AA
Text rendered with `text-slate-500` or lighter MUST NOT be used for body content. Primary text MUST use `text-slate-900` or `text-slate-700`; secondary metadata MUST use `text-slate-600` minimum.

#### Scenario: Card metadata renders
- **WHEN** a card renders its "X cards" metadata
- **THEN** the color MUST be at least `text-slate-600` (contrast ratio >= 4.5:1 against `bg-white`)
