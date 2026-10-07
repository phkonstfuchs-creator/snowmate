# App Store and Play Store readiness

This is the checklist for the first submission. The shell is described in
[ADR 0031](adr/0031-native-apps-with-capacitor.md) (Accepted).
Each line marked **open** needs code or an owner action before submitting.

## Apple review guidelines

| Guideline | What Apple checks | Pistl today | Status |
|---|---|---|---|
| 1.2 User-generated content | Filter for objectionable content, report, block, a contact for abuse, and acting within 24 h | Report and block (`features/safety`, ADR 0010); word filter in the database for posts, chat, profiles, rides and carpools (`20261027090000_blocked_terms.sql`); abuse e-mail and the 24 h promise in the report sheet | done in code. **Owner:** actually check `public.reports` and the inbox every day |
| 1.3 Kids / age | Honest age rating; no targeting of under-13s | Sign-up from 14; age bands (ADR 0028); live location from 16 (ADR 0019) | **open:** answer the age-rating questionnaire (expect 12+ or higher for chat and user content) |
| 2.1 Completeness | Reviewer can sign in and use every feature | Needs a working account | **open:** demo account with a friend, a ride and a chat, credentials in App Store Connect only |
| 3.1.1 Payments | Digital goods only through in-app purchase; no links to outside payment | Season Pass appears only in `/demo`; the native app is redirected away from `/demo` and the map hides the demo link (`lib/native-app.ts`) | done in code |
| 4.2 Minimum functionality | More than a website in a frame | Shell in `native/`: own offline screen, splash, swipe-back, portrait, keyboard handling. Planned: background GPS, native push, share, haptics | **open:** native push and background GPS |
| 4.8 Sign in with Apple | Required only when other social logins are offered | E-mail and password only | not needed |
| 5.1.1 Privacy | Privacy policy link; data collected only with purpose strings; account deletion in the app | `/datenschutz`; deletion in Profile (`delete_my_account`) | **open:** usage strings for location (when in use and always), camera and photos |
| 5.1.2 Data use | App Privacy labels match reality; no tracking | No ads, no analytics SDK, no tracking | **open:** fill App Privacy labels (below) |

## App Privacy labels (draft)

| Data | Collected | Linked to the user | Purpose |
|---|---|---|---|
| Name, e-mail | yes | yes | App functionality (account) |
| Date of birth | yes | yes | App functionality (age rules) |
| Precise location | yes, only while sharing or tracking | yes | App functionality |
| Photos | yes, profile and post photos | yes | App functionality |
| Messages, posts | yes | yes | App functionality |
| Device ID / push token | yes | yes | App functionality (notifications) |
| Tracking across apps | **no** | | |

The labels must change when the code changes. Anything new that touches
data updates this table in the same PR.

## Owner actions

- [ ] **Apple Developer Program** (99 €/year). Under 18, a parent or
      guardian usually has to create the account or agree to it. Start
      this early, because verification can take days.
- [ ] **Google Play Console** (one-time 25 $). Same rule for minors.
- [ ] Bundle ID `app.pistl` (iOS) and application ID (Android).
- [ ] App icon, screenshots for 6.7" and 6.1" iPhones, a short
      description, a support URL and a privacy policy URL.
- [ ] Demo account for App Review (never in the repo).
- [ ] A TestFlight build on your own iPhone. Check that sign-in, tracking
      with the screen locked, push, report and block, and account deletion
      all work.

## Before every release

- [ ] CI green on `main`. The native app shows whatever `main` deployed.
- [ ] No new data type without updating the privacy labels above and
      [SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md).
- [ ] No secret in the native project or the web bundle.
