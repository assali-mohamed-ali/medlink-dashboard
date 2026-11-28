# MedLink UX V2 — implementation

Design reference: user-approved public homepage V2.3 (28 November 2026); the HTML prototype is a design specification, not executable production code.

## Phase 1 — public homepage
- Cream hero, illustrative booking calendar, three patient services, booking guide, professional entry and native FAQ.
- All links use existing routes. Patient destinations are protected by the existing role guard, which records the intended page for login. No public booking or new authentication path.
- Signup links open the existing consent-gated registration page; no registration availability is asserted or changed.
- No fake statistics, clinic contact information, certification claims, medical data or public availability search.
- Shared UX palette and contrast checks; retain existing typography and dependencies.
- Automated tests for navigation, FAQ and signed-in role behavior. Browser visual acceptance still required.

## Subsequent phases
1. Shared responsive authenticated shell, labeled role-specific navigation and page headings.
2. Patient appointment booking, history and medical record navigation, profile/security/privacy.
3. Practitioner schedule, absences, patient records and publication.
4. Staff operational dashboard, account management, reassignment, privacy, audit and statistics.
5. Authentication screens, visual regression, accessibility and cross-role acceptance.

Preserve all existing API contracts, route guards, consent, MFA, session revocation, authorization and validation. No new production signup, irreversible deletion, data exposure or deployment. Keep work on feat/ux-v2, with reviewed commits and full frontend CI.
