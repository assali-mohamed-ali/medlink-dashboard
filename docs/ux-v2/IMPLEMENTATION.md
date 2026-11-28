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

## Browser smoke coverage
The production bundle is served on loopback by `python scripts/ci/browser-smoke.py` (Python Playwright 1.57.0 with Chromium). The CI check covers desktop (1440px) and mobile (390px), the anonymous homepage FAQ keyboard interaction and protected-route login redirect, all three authenticated homes, navigation, mobile disclosure and Escape focus restoration, page-level overflow and uncaught JavaScript errors. Fixtures are synthetic and read-only; external requests are blocked. The check is not an exact visual comparison with the prototype or a live API test.

## Consolidated V2.3 implementation batch

- Public/authentication/error views: approved homepage, consistent recovery and status surfaces; existing account activation, MFA and password flows preserved.
- Patient: unified dossier and appointment navigation, API-derived booking selection, filter reset, confirmation destination, prioritized next visit and direct settings/proposal shortcuts.
- Practitioner: daily/weekly agenda, availability and absence actions, patient record identity, directory and report/result/document workflows.
- Staff: operations home, clinic activity, booking, reassignment, account management with explicitly page-scoped role filter, assignment review, patient documents, retention review, audit and completed-calendar-month selector with privacy rules.
- All routes remain on the original guard and API implementation; semantic clinical/status colours, validation and permission checks are preserved. Existing pages that already support a workflow are restyled, not replaced with demo data.
- The prototype is a UX target, not a contract for invented functionality or data. Pixel-by-pixel parity and browser/live API acceptance require verification; the implementation does not invent appointment availability, counts, record data or compliance approvals.

CI browser execution uses the explicit Ubuntu 24.04 runner, supported by the pinned Playwright version. The Ubuntu 26.04 `ubuntu-latest` image rejected the browser installer in run 46093825651; all 612 component/unit tests and the preceding build, lint, budget and contrast checks passed. Browser execution and dependency audit were skipped by that failure and must pass on the corrected head.
