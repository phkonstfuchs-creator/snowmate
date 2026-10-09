# Mountain coordination audit — 2026-10-09

## Decision and scope

Pistl's main job is to get a young skier together with their crew: decide, travel, find each other, ride together. Recording and social posts support that job. The owner wants all publicly documented Slopes/Shredder capabilities considered, with a measurable advantage rather than untested claims of superiority.

Three GPT-6-Luna agents audited youth usability, maps/swipes, and native location/widgets. The parent checked current primary competitor sources, inspected the supplied Slopes screenshots, and ran mobile browser checks. This is a code and automated walkthrough audit, **not interviews with real adolescents or a mountain GPS benchmark**. The screenshots are visual references, not specifications or proof of competitor accuracy. No other users were contacted.

## Primary persona: Lena, 16

Lena lives in Innsbruck, has a season pass and rides park with a mixed-ability crew. Her Saturday question is: “Wer fährt, komme ich hin und wo treffe ich die anderen?” She reads a name and one line, uses one thumb, may wear gloves, and loses signal on lifts. She should not need to understand a product name, a GPS permission model or a stats dashboard to meet her friends.

This is a hypothesis to validate. Test adjacent personas Jonas, 15 (same planning needs, no live-location/lift-status eligibility), and Amir, 22 (new in town, empty friend graph). The product currently permits accounts from 14; discovery is age-separated, under 18 limited to friends-of-friends. Location sharing and lift status require 16, checked on the server. Public group events remain the new-user entry. Do not expose birthdays or exact ages publicly to make a youth persona “visible”.

Desired first glance: **who, where, when, next action**. A profile should make riding style and compatibility visible, with friendship/context before decorative ranks. Today's crew should lead over individual achievement. Park/chill/off-piste are styles, not proficiency ratings; a future skill-level model must keep these separate.

## Measured baseline and first corrections

| Finding | Evidence | Change / status |
|---|---|---|
| “Pistl Go” needs an explanation | Owner asked what it means; descriptive name absent | Visible title now “Mitfahren, wenn’s passt”; private conditional wish and explicit joining retained |
| Crew faces appear below planning cards | FeedScreen order | Faces before cards whenever actual activity exists; Go/lift entries still near the top |
| Discover feels button-first | Source has real swipes but dominant X/heart controls | Gesture hint, literal action buttons, existing accessible alternatives retained |
| Failed swipe hides a rider | Failing component regression | Restore the same card on unavailable/rate-limited/invalid/session errors; block additional choices while saving |
| Diagonal vertical scrolling can choose a rider | Failing pointer regression | Vertical intent cancels horizontal decision; cancel/short drags keep the card |
| Initial map has an unexplained blank/shimmer phase | 320px baseline screenshot | Static status through dynamic import and base-source loading; slow-network message after 15s, no modal; optional piste/terrain tiles do not block base readiness |
| Model time is not visible | ConditionsPanel + provider DTO | Display model timestamp above conditions; preserve Open-Meteo model attribution |
| Missing birth date is a discovery dead end | DiscoverScreen only sends user to settings | Existing authenticated birth-date form available inline; existing irreversible-date explanation/server validation retained |
| Narrow date row can resist shrinking | Native date input inside flex layout | min-width:0 input and 48px nonshrinking save action |
| Whole-page horizontal scrolling | Owner report; automated baseline on five demo screens | Not reproduced at 320/390px. Assert body/document width during touch swipe. Intentionally scrollable resort galleries are separate. No universal “fixed” claim |
| Initial modal/pop-up on clean map | Source and baseline browser check | No unsolicited modal reproduced. Explicit lift deep link still opens the requested picker. Re-test signed-in active sharing and selected sheets |
| Particular pistes are not selectable | Map uses OpenSnowMap raster, not route geometry | Real gap, not solved by UI copy. Requires vector piste identities and official status adapter |

Reproduction: `tests/e2e/mountain-usability.spec.ts` opens Today, Map, Discover, Profile and Crew at 320 and 390 px, checks body/document widths, screenshots, no initial map dialog, and uses Chrome touch events to swipe an actual card. Component regressions cover failed writes, vertical/cancel/short drags and bounded map loading. Existing signed-in browser cases cover privacy, voluntary joining and location consent. A screenshot taken during initial navigation is not a measured LCP score.

## Competitor capability map

“Present” below means code exists, not that it has been proven superior on snow. Sources are current public product descriptions; no access to competitors' private code, full authenticated products or their measurement datasets. Platform-specific differences matter. Public listings are the feature-catalog boundary; undocumented functionality is unknown. Where official copy is vague, parity remains unverified.

| Capability | Public competitor evidence | Pistl today | Better outcome to build / validate |
|---|---|---|---|
| Ride/group coordination | Shredder events and social sessions [S1] | Friend rides, public events, explicit join/request | One plan states crew, transport, meet place and acknowledgment |
| Carpool | Shredder [S1] | Offer/request/accept and conditional ride wish | Group readiness based on an actually accepted seat, clear request vs confirmation |
| Compatible riders | Shredder [S1] | Age-separated opt-in deck, riding styles | “Same pace today” without confusing style with skill; gesture + accessible actions |
| Community photos and clips | Shredder [S1] | Private crew photo/text posts; no comparable clip flow | Short clip upload with progress, moderation and private audience; later, after rendezvous works |
| Friends on mountain | Slopes [S2,S3] | Opt-in latest locations, timestamps, lift estimates | Rendezvous acknowledgment and freshness-aware arrival range, not just moving dots |
| Interactive piste maps | Slopes [S2] | Raster piste overlay, terrain, known resort/lift coordinates | Search/select a named or numbered piste; difficulty + status/source/time in same card |
| 3D maps / replays | Slopes [S2] | Terrain shading and track polyline; no 3D replay | Navigable terrain only if it helps orientation; shared-day replay later |
| Offline maps | Slopes [S2,S4] | No downloaded resort package | Explicit licensed offline pack with route/meet-point data and age of cached status |
| Weather/snow | Slopes [S5]; Shredder forecast not verified in current listing | Open-Meteo top/base models and 3-day outlook | Model vs measured snow distinguished; source/time, pinned resort, crew planning beside it |
| Lift/piste opening | Slopes at supported resorts [S5] | No live opening source; no invented live counts | Official resort adapter with real piste/lift IDs; unknown never shown as open |
| Automatic run/lift recognition | Slopes [S5] | Native recording and derived totals; inspect classifier/ground truth gap | Reference-labelled lifts/runs, waiting vs movement, no car-drive inflation |
| Speed/vertical/distance/history | Slopes [S2,S5], Shredder [S1] | Recorder, stats and ski-day history | Accuracy/quality indicators and real-device benchmark before “more accurate” copy |
| Detailed run analysis / heatmap | Slopes [S2] | Limited day-level analysis | Run-level comparison, gaps labelled; avoid rewarding risky maximum speeds |
| Season/lifetime recaps | Slopes [S5], Shredder [S1] | Ski days/stats/leaderboard | Crew memories and meaningful shared days; annual recap with verified data |
| Fitness/heart rate/Health | Slopes [S2,S5] | No equivalent Health/watch integration | Native Health permissions and Watch client as a later dedicated workstream |
| Watch/control widgets/shortcuts | Slopes iOS notes [S4] | Native shell, no widget extension | iOS Live Activity + Android status widget for an active crew session |
| Avalanche overlay / patrol info | Shredder [S1], Slopes [S5] | No equivalent official advisory/patrol integration | Official local advisory, region and timestamp, clear source; no route-safety guarantee |
| GPX/import/export/editing | Slopes iOS notes [S4] | Account export and saved day data, not equivalent track editor | Portable track import/export, edit corrupted segments and preserve original evidence |

Slopes' newer iOS release notes describe offline day-pass support, superseding older blog copy that excluded day passes. Do not use old screenshots/pricing prose as the current feature contract. An app-store age rating is not a claim about the precise in-app youth model; Shredder's iOS listing and Android rating differ.

## Interaction direction from Twitter/X

Borrow interaction conventions: clear persistent navigation, short action labels, a stable reading surface, immediate local feedback, a visible retry, and swipeable tabs with matching tap controls where there are actual alternate timelines. X documents tap **or swipe** between “For you” and “Following”, and remembers the selected timeline [S7]. Do not conflate that tab gesture with a like/pass profile gesture. Keep map panning, vertical feed scrolling and horizontal card decisions in different surfaces. No X name, logo, proprietary illustrations or pixel-identical assets are needed.

The next feed concept is “Meine Crew / Heute am Berg” with an obvious selected tab and preserved scroll position. Wider public visibility must come from existing authorized public group content, not a cosmetic tab bypassing minor/friend rules. Prototype/test before changing the live audience contract.

## Differentiator: one crew rendezvous

A strong candidate is **“Nächste gemeinsame Runde”**: choose a known lift/station, say when, friends acknowledge, and one compact card answers who is already there and who is still coming. It connects planning, transport and mountain navigation; a tracker alone does not complete this job. Validate demand with real crews before treating it as a moat.

Proposed active mode: **“Skitag mit Crew”**. Starting recording and sharing location remain independent choices. Each person explicitly opts in; an active session has a visible end, stop action and expiry. Begin with the existing confirmed/unblocked friend audience, not a new unchecked group distributor. Under 16 retain planning/chat/manual meeting-place features; don't silently relax live-sharing eligibility. A new manual rendezvous/acknowledgment status requires its own schema/privacy contract.

A friend card might say “Lena · Seegrube · zuletzt vor 40 s” or “Lena · Nordkettenbahn · oben in etwa 3–5 Min. · Schätzung”. The arrival range is a **proposal**: current lift ETA uses static reference information, not measured queue times. Coarse fixes, stale data, changed destination or unknown route must remove/reduce the prediction. Never say a stale location means somebody is there now.

Useful additions to test:

- “Bin da” / “Warte oben” acknowledgments, visible to the intended crew.
- An agreed next lift/meeting station with shared countdown and change notification.
- Mixed-ability crews split for a few laps and regroup at a common lift.
- Poor-signal meetup card with last received time, offline status and the agreed place still readable.
- A saved local mountain pack before leaving Wi-Fi.
- “Zusammen los?” readiness based on group acknowledgment and confirmed transport; no automatic join/payment.

## Native widget contract (planned, not implemented)

Existing native background sharing is tied to explicit 1/4/12-hour consent. Browser sharing lasts while the page is open. Upload throttling is at least 15s, with 20m movement or 60s heartbeat; the native watcher requests high accuracy with a 5m filter. Battery cost has not been measured.

There are no widget targets/extensions in this repository. A PWA is not a native lock/home-screen widget. iOS needs an ActivityKit/WidgetKit extension and Capacitor bridge; Android needs an AppWidget provider/Glance component and supported foreground-location service. An iOS Live Activity does not itself fetch location/network data [S8]; normal widget updates are budgeted [S9]. Android periodic widget updates are at least 30 minutes apart, so that mechanism cannot represent a live ETA [S10]. Current native background permissions/service declarations must be checked against supported Android versions [S11].

Start with iOS Live Activity for an ongoing day and Android ongoing notification + companion home widget. Widget data should be a minimal session snapshot: status, agreed place, display name if allowed, generatedAt/expiresAt, explicitly estimated ETA and deep link. Avoid storing friends' raw coordinate histories in shared widget storage. Logout/session expiry must end/redact the activity and clear shared snapshots. Stop/unfriend/block/consent withdrawal must be reflected promptly; stale/offline snapshots need a short expiry and must not imply current access. Lock-screen name visibility should be configurable. Test these semantics on devices before release.

## Order of work

| Order | Outcome | Dependencies / completion gate |
|---|---|---|
| P0 — this audit/fix | Clear names, reliable gesture/error handling, stable loading, no unexplained width | Unit/component, narrow touch browser, signed-in regressions, actual screenshots |
| P1 — useful mountain map | Searchable identified pistes/lifts, official status, model time, offline pack | Licensed dataset/provider terms, resort source adapter, provenance and unknown/stale tests |
| P1 — rendezvous | Next shared lift/place + acknowledgment + freshness-aware arrival | Explicit audience/schema/expiry; test 15/16/17-year-old journeys; physical-device location trial |
| P2 — outside the app | Live Activity + Android notification/widget | Native extension/bridge and release signing; foreground/background/network/lock tests |
| P2 — trustworthy recording | Run/lift segmentation, drive rejection, recovery, battery/accuracy results | Same-device reference-labelled ski days and playback fixtures; no claimed superiority before evidence |
| P3 — parity expansion | Watch/Health, 3D replay, clips, recap, GPX editing, advisory/patrol integration | Capability-specific tests and actual need; each checked against competitor catalog |

No date or effort estimate is asserted before dataset and native-platform spikes. “Every feature better” is the comparison backlog, not a statement about the current build.

## Real-user and field acceptance tests

Recruit with the owner's authorization; no participants have been contacted. Use the protocol in `USABILITY_PROTOCOL.md`, with 15-, 16- and 17-year-olds as the primary cohort plus new arrivals. Record help requests and hesitation verbatim. A persona walkthrough does not replace this.

1. **Five-second meaning:** show each feature name/action once; ≥80% of participants explain what it does without help. Especially distinguish joining, wishing, sharing and recording.
2. **Morning:** identify which confirmed friends are going today within 3s, then join/request in ≤2 taps; pending vs confirmed correctly understood.
3. **Conditions:** select their resort, find model/official source and freshness within 2 taps; pick a concrete named piste once the vector layer exists. Unknown opening data never inferred open.
4. **Meetup:** from Today get to agreed place/friend in ≤2 taps; no instruction needed; “last seen” vs current/estimated arrival correctly understood. Under-16 path doesn't request ineligible GPS consent.
5. **Touch:** 320/390px, one thumb, no whole-page x-scroll during drag; scroll/cancel/short gestures do not like a rider; buttons remain operable; all primary targets ≥48px.
6. **Bad signal:** delay/drop provider and API responses; last usable data has time and retry, failed actions retain their target, no indefinite spinner or silent success.
7. **Location/device:** locked phone, cold start, permissions revoked, battery saver, 5/15-minute signal gaps, logout/unfriend/block and expired sessions. No silent recording/share start.
8. **Comparative field trial:** same phone model/settings, reference-labelled routes, counterbalanced Slopes/Shredder/Pistl days. Measure location error (median/P95), usable-fix freshness, run/lift classification error, spurious speed spikes, ETA absolute error, reunion time, completion rate and battery drain against idle. Account for OS/phone/terrain differences. Separate reference GNSS uncertainty from app error. Publish sample size and failures, not just averages.

Proposed targets to validate: ≥90% unassisted reunion-task completion, median reunion-task completion ≤10s in-app, usable-fix age ≤60s when online, no ETA on stale positions, and zero accidental consent/joins. These are targets, not achieved mountain results. GPS accuracy and battery targets must be set after collecting hardware/terrain baseline distributions. A superiority claim requires a comparative confidence interval, not a screenshot or passing unit test.

## Primary sources (checked 2026-10-09)

- S1 [Shredder developer listing / Android](https://play.google.com/store/apps/details?id=com.tryshredderapp.android)
- S2 [Slopes Premium capabilities](https://getslopes.com/premium)
- S3 [Slopes location-sharing privacy](https://getslopes.com/privacy)
- S4 [Slopes iOS release notes](https://getslopes.com/whatsnew_ios)
- S5 [Slopes official FAQ](https://news.getslopes.com/f-a-q/)
- S6 [Shredder developer listing / iOS](https://apps.apple.com/us/app/shredder-ski-snowboard/id6749258218)
- S7 [X: timeline switching](https://help.x.com/en/using-x/x-timeline)
- S8 [Apple: Live Activities](https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities)
- S9 [Apple: keeping widgets up to date](https://developer.apple.com/documentation/widgetkit/keeping-a-widget-up-to-date)
- S10 [Android: advanced widgets](https://developer.android.com/develop/ui/views/appwidgets/advanced)
- S11 [Android: location foreground services](https://developer.android.com/develop/background-work/services/fgs/service-types)
- S12 [OpenSnowMap data/map explanation](https://www.opensnowmap.org/)

Implementation references: `features/location/{useLiveLocation,background-sharing,location,whereabouts}.ts`, `features/tracking/position-source.ts`, `components/map/{SkiMap,map-style}.tsx/ts`, `features/conditions/conditions.ts`, `features/resorts/MapScreen.tsx`, `features/discovery/DiscoverScreen.tsx`, existing feature specs and `SECURITY_AND_PRIVACY.md`.
