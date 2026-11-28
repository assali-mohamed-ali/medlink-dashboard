# MedLink UX V2 — implementation

Design reference: user-approved public homepage V2.3 (28 November 2026); the HTML prototype is a design specification, not executable production code.

## Phase 1 — public homepage
- Cream hero, illustrative booking calendar, three patient services, booking guide, professional entry and keyboard-accessible FAQ disclosure.
- All links use existing routes. Patient destinations are protected by the existing role guard, which records the intended page for login. No public booking or new authentication path.
- Signup links open the existing consent-gated registration page; no registration availability is asserted or changed.
- No fake statistics, clinic contact information, certification claims, medical data or public availability search.
- Shared UX palette and contrast checks; retain existing typography and dependencies.
- Automated tests for navigation, FAQ and signed-in role behavior. Browser visual acceptance still required.

## Integrated implementation
- Responsive authenticated navigation, grouped by role and task, with active page state and mobile menu.
- Patient: booking calendar/list and progress, appointments, results/documents shortcuts, results retry, profile sections.
- Practitioner: daily/weekly schedule, absences, patient directory, medical record section links and publication review.
- Staff: operational dashboard shortcuts, guided patient booking, reassignment selection and review.
- Shared auth and registration styling, readable consent, common cards and buttons.
- Secondary pages retain working API-backed forms and tables with the shared shell; exact screen-by-screen parity with the prototype still requires browser acceptance.

## Acceptance
Run repository pre-commit, lint, unit/component tests, TypeScript/build, bundle budget, contrast, dependency audit and security workflows on the final head. Then review responsive behavior, keyboard navigation and live API workflows using synthetic accounts in a non-production environment. Do not mark browser acceptance complete on component tests alone.

Preserve all existing API contracts, route guards, consent, MFA, session revocation, authorization and validation. No new production signup, irreversible deletion, data exposure or deployment. Keep work on feat/ux-v2, with reviewed commits and full frontend CI.
