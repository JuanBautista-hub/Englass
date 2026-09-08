## ADDED Requirements

### Requirement: My lessons grouped by CEFR
The `/lessons` page SHALL render the user's enrolled lessons grouped by CEFR level inside the "My lessons" section. The groups MUST appear in canonical order `A1, A2, B1, B2` and each group MUST show its level label and the count of lessons in that group. Each lesson inside a group MUST link to `/lessons/:id`.

#### Scenario: User with lessons across A1 and A2
- **WHEN** the authenticated user opens `/lessons`
- **THEN** the page shows two sections: "A1" and "A2"
- **AND** each section lists the user's lessons in that level with title and card count

#### Scenario: User with no lessons
- **WHEN** the authenticated user opens `/lessons` for the first time
- **THEN** the page shows a loading state while the backend auto-enrolls
- **AND** once loaded, at least the "A1" section is populated

### Requirement: One-click study access
The `/lessons` page MUST offer a primary "Study" action on every lesson in the user's grouped list. Clicking "Study" navigates directly to `/study/:id` and the backend MUST be able to resolve the lesson by id (no 404 because the lesson belongs to the user).

#### Scenario: Click Study on A1 lesson
- **WHEN** the user clicks "Study" on any lesson in the A1 group
- **THEN** the app navigates to `/study/:id` where `:id` is the user-owned lesson id
- **AND** `/study/:id` loads due cards successfully

### Requirement: No "Add" button for catalog lessons in My lessons
The `/lessons` page SHALL NOT render an "Add" button on lessons in the grouped My-lessons section. The "Add" / "Enroll" CTA MAY remain visible only inside the "Catalog preview" section (separate collapsible area) for users who want to opt-in to higher-level lessons.

#### Scenario: Lesson in A1 group
- **WHEN** the page renders an A1 lesson in the grouped My-lessons section
- **THEN** it shows "Study" and "Open" buttons but no "Add" button

#### Scenario: Catalog preview entry for B2
- **WHEN** the page renders a catalog lesson in the B2 group of the preview section
- **THEN** it may show an "Add" button to manually opt in

### Requirement: Lesson detail without Add banner
The `/lessons/:id` page SHALL NOT show the "Preview from the catalogue. Add it to start tracking your progress" banner for lessons that belong to the authenticated user.

#### Scenario: Owned lesson detail
- **WHEN** the user opens `/lessons/:id` for a lesson they own
- **THEN** the page shows the regular detail view (mastery chip, cards list, Add Card form, study summary)
- **AND** no preview banner is visible

#### Scenario: Catalog-only lesson (manual preview)
- **WHEN** the user opens `/lessons/:id` for a catalog lesson they haven't enrolled in
- **THEN** the preview banner MAY be shown with an "Add" CTA (legacy behavior)