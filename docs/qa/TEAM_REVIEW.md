# Team review 2026-10-07

A simulated team tested Pistl: six user personas and five team roles. It
ran on the production build (`npm run build && next start`, iPhone 13
viewport, `/demo/*` plus `/signup`, `/login`, legal pages) and read the
code. The evaluation and the plan are below.

**Read this with care.** The testers were simulated (Haiku subagents
following a script), not people. Their quotes are written in character;
they are not real reactions. Seconds are machine time plus an estimate.
The grades are an opinion, not a measurement. Use this page to decide
what to fix first, never as proof that real users like or dislike
something.

**What could not be tested.** The local Supabase stack could not start:
the session's network policy blocks the container registry
(`d2glxqk2uabbnd.cloudfront.net`, HTTP 403). So nothing signed-in ran in
a browser:

- Sign-up and login were tested up to the final submit.
- Ski-day tracking (task 6) and the push switch (task 8) exist only
  signed in, so they come from reading the code.
- The database checks ran on a plain local Postgres 16 with pgTAP
  (`scripts/test-db-local.sh`): 38 files plus the join race test, all
  green before any change.

Labels on each finding:

- **verified**: seen in the running app, or read in code at the cited
  line, and re-checked by the evaluator.
- **assumed**: plausible, not proven. All load and cost figures are
  assumed.

## Baseline before changes

| Check | Result |
|---|---|
| lint, typecheck | pass |
| `test:coverage` | 143 files, 869 tests, 86.5 % statements |
| build | pass |
| pgTAP (local Postgres 16) | 38 files, all plans complete; race: 3 of 12 joined, 3 spots |
| QA sweep (`scripts/qa/sweep.mjs`) | 0 serious axe violations, 0 horizontal scroll; small targets: wordmark link 43×44, login "Privacy" 43×44 (labels are not targets) |

## Top 20

Order: impact × effort. W is impact (5 = high), A is effort (1 = small).
"Owner" means the item needs a decision only the owner can make (see
[Questions for the owner](#questions-for-the-owner)).

| # | Finding | Where | Who found it | W | A | Status |
|---|---|---|---|---|---|---|
| 1 | Group and ride chats have no report or block. Co-riders cannot be reported from the ride, only the host. A stranger in a ride chat cannot be reported. App Store 1.2. | `app/(app)/crew/chat/[id]/page.tsx:29`, `features/rides/FeedScreen.tsx:224`, `components/feed/RideDetailSheet.tsx:276` | App Store, mother | 5 | 2 | verified |
| 2 | The start screen does not say which friends are out today. It shows unnamed initials and, in the demo, a fixed "174 heute am Berg". The faces include people who are not friends. | `features/rides/FeedScreen.tsx:79-82, 120-127` | all 6 personas, founder | 5 | 2 | verified |
| 3 | UI copy promises what the rules do not do. (a) "Friends and their friends" also shows for minor hosts; for them friends of friends see nothing. (b) Ski day: "only you see the numbers", but the friends leaderboard shows season totals by default. (c) Empty feed: "your crew sees it at once", even with no crew. (d) The privacy policy's summary is English only. (e) The deletion warning misses chats, posts, ski days and devices. | `de.ts` `post.friendsDesc`, `track.privacy`, `next.feed`, `profile.deleteWarning`; `app/datenschutz/page.tsx:10` | Lena, mother, Marco, App Store | 4 | 1 | verified |
| 4 | The word filter is bypassed with a zero-width character: `Ne​ger` passes, `Neger` is blocked (run on local Postgres). A ride with a filtered word shows "try again" instead of "please rephrase". | `supabase/migrations/20261027090000_blocked_terms.sql:35-58`, `features/rides/actions.ts:66-74` | Tim | 4 | 1 | verified |
| 5 | Four identical "Bin dabei" buttons. Three testers first joined the wrong ride. A second tap on "Dabei" leaves the ride without asking. | `components/feed/RideCard.tsx:104-113`, `features/rides/useRideBoard.ts:127` | Jonas, Lena, Sophie, mother | 4 | 1 | verified |
| 6 | Every open tab reloads the whole page every 60 s. The layout makes three counting calls on each load, and `refresh_my_age()` is a write on every page. Estimate at 1,500 active users: about 7,000 requests a minute. | `components/RefreshOnResume.tsx:7`, `app/(app)/layout.tsx:28` | backend | 4 | 1 | verified; costs assumed |
| 7 | Offline, switching tabs shows the browser's error page; the tab bar is gone (web). The service worker has no fetch handler. | `public/sw.js` | Jonas | 4 | 2 | verified (web; the store app has `offline.html`) |
| 8 | Notifications are hidden at the bottom of Settings. On an iPhone browser you must first add Pistl to the home screen. The planned one-time ask after the first ride or friend does not exist. | `features/profile/ProfileScreen.tsx:601`, `features/notifications/PushSettings.tsx` | all personas, founder | 4 | 2 | verified |
| 9 | Finishing a ski day takes 5 taps, including a browser `window.confirm`. "Keep Pistl open" shows only after the start. | `features/tracking/TrackPanel.tsx:45, 70` | Jonas, Sophie, Tim, Lena | 3 | 1 | verified (code) |
| 10 | The demo mixes languages and has dead ends. English on German screens (Discover, chat, profile, carpool "Today"). "Share invite link · +200 XP" does nothing. Event weekdays are wrong. Discover lists a stranger marked U18 with "Request". | `features/crew/PeopleScreen.tsx:122-349`, `features/demo/ConversationThread.tsx:40-163`, `ProfileScreen.tsx` demo branch, `lib/data/mock-data.ts` | all | 3 | 3 | verified |
| 11 | Sign-up friction. (a) Under 14 is refused only at the final submit. (b) "Next" is greyed out without a reason. (c) The password is typed twice. (d) Any server error says "check your details". (e) An invite goes through the marketing intro. (f) "Ich habe schon ein Konto" is 20 px high. | `features/auth/SignupFlow.tsx:181, 366, 394`, `features/auth/actions.ts:58-63`, `features/crew/InviteScreen.tsx:76-83` | all personas | 3 | 2 | verified |
| 12 | The unread count scans every conversation on every page (`list_my_conversations` with `can_use_conversation` per row). Indexes are missing on `conversations(user_high)` and `push_outbox(actor_id)`. | `supabase/migrations/20261006090000_crew_chat.sql:254-327` | backend | 4 | 3 | verified; costs assumed |
| 13 | The iOS "Always" location text names only ski days, but live sharing also runs in the background. The permission texts are English only. | `native/ios/App/App/Info.plist:70-75` | App Store | 3 | 1 | verified |
| 14 | The chat location pin is active under 16. The age rule is explained only after the failed send. | `features/chat/ChatThread.tsx:199-207` | Lena | 2 | 1 | verified |
| 15 | The ride form has no length limit (meeting point 120, note 280). The error comes only on publish. Limit messages are wrong: "Morgen wieder" for a 24-hour window; "enough days" without the number. | `components/feed/PostRideModal.tsx:230-255`, `de.ts:536, 651` | Tim | 2 | 1 | verified |
| 16 | Dead ends for newcomers. Discover under 18 offers only "reload". The events empty state has no action. The crew empty state does not say how to add someone. | `features/discovery/DiscoverScreen.tsx:98-104`, `features/rides/EventsScreen.tsx:400-411`, `de.ts:398` | Marco, founder | 3 | 1 | verified |
| 17 | Leftovers against ADR 0033 and the protocol. 12 black action buttons; Instagram tag contrast 1.76:1. Weak input focus (outline: none). Ride-sheet close 32 px; crew "⋯" 32 px wide. Primary actions 44 px, not 48. | `t10` list, `RideDetailSheet.tsx:106`, `LiveCrewScreen.tsx:63`, `globals.css:566-583` | frontend, Jonas, mother | 2 | 2 | verified |
| 18 | Any auth error in the app layout, including a network failure, redirects to `/login`. That looks like a sign-out. | `app/(app)/layout.tsx:22-24` | App Store | 2 | 1 | verified |
| 19 | `private.push_outbox` has no RLS (defence in depth). Equal regional leaderboard totals are sorted by the hidden minors' names. | `20261012090000_push_notifications.sql:37-53`, `20261014090000_leaderboards.sql:96` | security | 2 | 1 | verified |
| 20 | Map: the trial card (4 lines) sits above the map. Friends are not shown first. In the demo, "your crew on the mountain" never appears. | `features/demo/DemoLiftMeetupTryout.tsx`, `features/resorts/MapScreen.tsx:379` | founder, Jonas | 2 | 2 | verified |

### Larger findings that need the owner first

| Finding | Where | Who found it | Status |
|---|---|---|---|
| An adult can friend-request any 14-year-old by handle. A decline deletes the row, so the request can be sent again at once. An accepted request opens direct chat. | `20261001090000_blocks_and_reports.sql:168-240` | security, mother | verified |
| Minors can see and join adults' public events, and then share a ride chat with strangers. The participant list shows minors' handles to adult co-riders. | `20261001090000_blocks_and_reports.sql:112-140` (`can_see_ride`), `20260925100000_…:527-545` | mother, security | verified |
| No terms of use with zero tolerance for objectionable content; nobody accepts any at sign-up (App Store 1.2). | `features/auth/SignupFlow.tsx:406`, `de.ts:251` | App Store | verified |
| Photos (avatar, post) are not screened before others see them. | specs `profile-pictures.md:22` | App Store | verified |
| "Under 18? You need your parents' consent." There is no consent step behind it; ADR 0012 rejected one. | `de.ts:251` | Lena, Tim, mother, App Store | verified |
| "We review every report within 24 hours." Reports are only visible in the Supabase dashboard; nobody is alerted. | `de.ts:427`, `docs/APP_STORE.md` | App Store, mother | verified |
| The friends leaderboard is on by default for minors (incl. top speed). | `20261014090000_leaderboards.sql:13` | Lena, Tim | verified |
| `handle_available()` is open to anonymous callers without a limit, so handles can be enumerated. | `20261005090000_reserve_pistl_handle.sql:30` | security | verified |
| Growth: invite preview without a name, no share image for a ski day, no weekend push "3 of your crew are out", streak only in the demo. | founder F8–F11 | founder | verified (code) |

## Personas

Grades are the simulated testers' opinions (1–10).

| Persona | Grade | Open it again tomorrow? | Most stuck |
|---|---|---|---|
| Jonas, 19, lazy, gloves, bad signal | 4 | no | "174 heute am Berg? Wer davon is mei Freund?" Offline, a tab switch is a dead end |
| Lena, 14, privacy-minded | 6 | not yet | "Im Profil steht 'nur du siehst sie', und in der Rangliste steht sie doch." |
| Marco, 23, seasonal worker, no friends | 5 | maybe | "Events und Mitfahren gehen. Der Rest will einen Kumpel, den ich nicht habe." |
| Sophie, 21, exchange student, English | 4 | no | "I don't know any of these mountain names." German words in the English chat |
| Tim, 17, power user | 6 | yes | Dead invite button. Filter and limit messages are wrong. Leaderboard empty until the crew tracks. |
| Mother of a 14-year-old | 3 | no (would not allow it) | Adults' public events plus group chat with no report button. Privacy summary in English. |

Average 4.7 of 10. Earlier estimate in `USABILITY_PROTOCOL.md`: 4 of 10.

**Jonas.** Joining (1 tap) works. Who's out today: 0 taps, but no
answer. He first joined the wrong ride. In demo, the invite button does
nothing; live it is 3 taps. Chat: 4 taps. Ski day: 5 taps from code.
Notifications are out of reach in a phone browser.

**Lena.** Sign-up: 5 taps. Discovery and live location are explained
well where they appear. She stops at two contradictions: the ride
visibility text for minors, and "only you" for ski days next to the
friends leaderboard. The parental-consent sentence has nothing behind
it.

**Marco.** Carpool: 3 taps (+, Mitfahren, Platz anfragen). There is no
"tomorrow" filter. An event as a newcomer: 4 taps. "Entdecken" leads to
people, not events. The empty feed, by design, shows only friends' rides
and points to events. Its copy promises a crew he does not have.

**Sophie.** The English UI mostly works. German slips into the chat
("Ausfahrtskontext", "Jetzt"). Resort names have no context: altitude
and location are in `lib/resorts.ts` but are never shown. There is no
dark mode (`color-scheme: light`).

**Tim.** Leaderboard: 1 tap plus scrolling; the demo calls it "Season
ranking", the live app "Rangliste" and "Abzeichen". The word filter can
be bypassed. Rides have no daily limit. The ride form accepts 2,200
characters. Limit messages are inaccurate.

**Mother.** The legal pages are complete but long, and the summary is in
English. Reporting takes 4 taps from a person or a post. A ride chat has
no report button. Contact is a private mailbox. Adults can contact minors
through public events and friend requests (owner decision).

## Team roles in brief

- **Founder.** The core loop is: see your crew today, join with one tap.
  Joining works, seeing the crew does not. Too much before the first
  ride; profile overloaded in the demo. Growth: invite preview,
  share-out, push for the core loop, empty states.
- **Security.** RLS is forced on every public table. All definer
  functions have `search_path = ''`. Redirects are allow-listed, no
  secrets or XSS sinks. Open: minor contact by handle and events (owner),
  handle oracle, `push_outbox` RLS, per-instance rate limits (documented
  in `SECURITY_AUDIT.md`, item 4).
- **Backend.** The biggest lever is the 60 s refresh plus the layout
  calls, then the unread count. Feed, rides and discovery scan too much
  as they grow. Purges need pg_cron. Every figure is assumed until
  `EXPLAIN ANALYZE` runs on the dev project.
- **Frontend.** No all-caps; every icon button has a name;
  reduced-motion is respected; the map loads lazily. Black buttons,
  focus, contrast and a few targets remain.
- **App Store.** Likely rejected under 1.2 (terms, photos, reporting in
  chats). Questions likely under 4.2 (native value) and 5.1.1 (location
  text, policy language). Passes 4.8 (no third-party login) and
  5.1.1(v) (deletion in the app).

## Rejected findings

| Finding | Reason |
|---|---|
| The invite token is lost during sign-up (Marco) | Wrong: `InviteScreen` stores it and `PendingInviteSync` opens the invite after login. Only the extra intro screen is real (#11e). |
| "Critical: the feed shows only friends' rides" (Marco) | By design (`FeedScreen.tsx:72`: "Public events have their own screen"). The empty state links to events. Only the false copy remains (#3c). |
| "(unter 18)" on anonymous leaderboard rows reveals the age (Lena) | Only minors are anonymous, so "anonymous" alone says the same. No gain. |
| The `--font-mono` ambiguity sets numbers in Space Mono (frontend) | `globals.css:186-188` maps `font-mono` to the body face on purpose. |
| Labels under 44 px on login (sweep) | A label is not a tap target. The inputs are large enough. |
| Replace `getUser()` with `getClaims()` in proxy and layout (backend) | Against ARCHITECTURE.md ("the proxy and protected layout verify `auth.getUser()`"). Needs its own ADR, not this pass. |
| The join error banner is too far up (Jonas, assumed) | Not provable without a backend. Kept for the retest. |
| Rate limits per instance (security) | Already documented as residual risk (`SECURITY_AUDIT.md`, item 4); an operations task. |
| Self-declared birth date (security) | Accepted in ADR 0012. |
| Missing `isUuid` in several actions (security) | Not exploitable (parameters are bound, the cast fails); hardening for later. |
| `Cross-Origin-Resource-Policy`, diagnostics in `/api/resort-photos` (security) | Low; noted for later. |
| Lift operating hours missing from the estimate (Tim) | Verified, but there is no data source for opening hours yet. Later. |
| Resort context, carpool date filter, events in the tab bar (Sophie, Marco) | Verified, outside the top 20; next pass. |
| Realtime instead of chat polling, rewrites of feed, rides and discovery (backend) | Verified direction, larger work; after measuring. |
| `@capacitor/share` and `haptics` unused (App Store) | Verified; 4.2 strategy is an owner topic. |

## Questions for the owner

Answers from 2026-10-07. The owner's guiding rule: young people should be
able to use the whole app wherever the law and the App Store allow it.

| # | Question | Answer | Consequence |
|---|---|---|---|
| 1 | Strangers and minors (requests, public events) | No age gate. Repeated requests after declines get a growing pause, then a block | Pause after 2 declines (7/14/28 days), no more requests after 5. Public events stay open from 14; everyone there can be reported (ADR 0034) |
| 2 | Terms of use with zero tolerance | Yes, if needed | `/nutzungsbedingungen` plus a required box at sign-up; wording awaits legal review |
| 3 | Photo screening | No external service; hide on report | A reported post is hidden for the reporter at once and for everyone after two reporters, until review |
| 4 | "Every report within 24 hours" | Keep if the App Store or the law needs it | Kept: Apple expects action on reported content within 24 hours for apps with user content. The daily check stays an owner action |
| 5 | Parental consent | Parental consent is a bad fit; unsure about 16+ | Sentence removed (no mechanism stood behind it). Minimum age stays 14; legal review of 14 vs. 16 open in ADR 0034 |
| 6 | Friends leaderboard for minors on by default | Undecided | Kept on, copy made honest; the switch is in the profile |
| 7 | Handle check open to signed-out visitors | Undecided | Kept for an easier sign-up; recorded as an accepted risk in ADR 0034 |
| 8 | Growth (invite preview name, share image, weekend push, streak, dark mode) | Not now | Not in this pass |

## Implementation

| PR | Contents | Status |
|---|---|---|
| 1 | Safety and honesty: #1, #3, #4, #14, #15 (messages and limits), #19, #13; terms, held posts, pause after declines | merged ([#74](https://github.com/phkonstfuchs-creator/snowmate/pull/74)) |
| 2 | Core flow and UX: #2, #5, #7, #8, #9, #10, #11, #16, #17, #20 | PR open |
| 3 | Scale: #6, #12 | open |

#18 (layout redirect) is not changed. The proxy already sends any failed
identity check to `/login` on purpose ("fail closed"). Showing an error
page instead would change security code and needs its own decision.
