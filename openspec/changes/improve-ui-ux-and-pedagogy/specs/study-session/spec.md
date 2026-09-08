## ADDED Requirements

### Requirement: Study session renders focused card UI
The `/study/:id` route MUST hide the application header and main navigation while a session is in progress, MUST centre a single card in the viewport, and MUST show a small "Exit" pill in the top-left corner to return to the lesson detail page.

#### Scenario: User enters study mode
- **WHEN** the learner navigates to `/study/:id` with at least one due card
- **THEN** the page MUST hide the header navigation, MUST show the first card term in the centre, and MUST render an exit pill that navigates back to `/lessons/:id`

#### Scenario: User exits the session
- **WHEN** the learner taps the exit pill
- **THEN** the application MUST cancel any in-flight TTS, MUST stop session progress, and MUST navigate to the lesson detail page

### Requirement: Session ends with retention summary
When all due cards have been rated, the study page MUST display a summary view with the total reviewed, breakdown by rating, retention rate computed as `(good + easy) / total`, streak increment message (if `currentStreak` increased during the session), and any newly awarded achievements.

#### Scenario: All cards reviewed
- **WHEN** the learner rates the last card in the queue
- **THEN** the summary MUST show counts for each rating, retention percentage rounded to the nearest integer, and MUST NOT auto-redirect away from the summary

#### Scenario: Streak increments mid-session
- **WHEN** the first review of the day completes
- **THEN** the summary MUST show "Streak: N day(s)" reflecting the new `currentStreak`

### Requirement: Card hint is opt-in
On the back of each flipped card, the Spanish translation and explanation MUST be available behind a collapsed "Hint" expandable. The rating row MUST always be visible.

#### Scenario: Learner sees the back of the card
- **WHEN** the learner taps "Show answer"
- **THEN** the rating row MUST appear immediately and the hint MUST be collapsed by default

#### Scenario: Learner opens the hint
- **WHEN** the learner expands the hint
- **THEN** the Spanish translation and explanation MUST render; the rating row MUST remain visible and functional
