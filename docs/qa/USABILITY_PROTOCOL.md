# Usability protocol: "Jonas, 19"

Tests whether Pistl works for its laziest real user. Run it with the
current TestFlight build, or app.pistl.app on a phone, never an old local
checkout. Run it with a real person when possible, otherwise as a careful
walkthrough. Count taps, time each task and note where he hesitates.

## Persona

Jonas is 19, a student, and rides mostly park. He skims and does not read.
He holds his phone in one thumb, often with gloves, at the lift or with one
bar of signal. He gives up when something needs more than two taps or a
paragraph of text. He would open Pistl again tomorrow only if it showed
him something useful in the first three seconds: who is out today.

## Rules every screen is checked against

- One primary action per screen, at the bottom, within thumb reach.
- No text longer than two lines before the first action.
- Tap targets at least 48 px; nothing important behind a long press.
- Every tap gives visible feedback within 100 ms. Saves show "saved" or
  "not sent – retry" and never fail silently.
- Bad signal: the last known state stays visible with "updated 3 min ago";
  no endless spinner.
- No dead ends: every empty state says the next step.

## Tasks

| # | Task (said to Jonas) | Target | Budget |
|---|---|---|---|
| 1 | "Mach dir einen Account." | ≤ 8 taps plus typing | 60 s |
| 2 | "Füg deinen Kumpel hinzu." (by link) | ≤ 3 taps | 20 s |
| 3 | "Wer von deinen Freunden ist heute am Berg?" | 0 taps (start screen) | 3 s |
| 4 | "Sag, dass du beim Park-Ride dabei bist." | 1 tap | 5 s |
| 5 | "Schreib Lena, wo ihr euch trefft." | ≤ 3 taps plus typing | 20 s |
| 6 | "Zeichne deinen Skitag auf und speicher ihn." | 1 tap start, 2 taps finish | 10 s |
| 7 | "Wo ist Lena gerade, und wann ist sie oben am Lift?" | ≤ 2 taps | 10 s |
| 8 | "Schalt Mitteilungen ein." | ≤ 3 taps | 15 s |

Per task, record: taps, seconds, success (yes / with help / no), and
the exact element where he hesitated.

## After the session

- "Würdest du die App morgen wieder öffnen?" (1–10)
- SUS short form (UMUX-Lite): "Die App tut, was ich brauche" and "Die
  App ist leicht zu bedienen", each from 1 to 7.
- "What annoyed you most?" (one sentence, written down word for word)

## Results 2026-10-07 (walkthrough, demo plus code review)

| # | Taps now | Where Jonas gets stuck | Change (Step 3) |
|---|---|---|---|
| 1 | about 14 | Splash, then 4 steps, then 8 fields; the password is typed twice | Shorter signup: show/hide password instead of repeating it, chips with Next below |
| 2 | 4 | "Add friend" opens three blocks of text before the link | Invite link first, one line of text |
| 3 | 0, but only a count | "174 out today" in the demo looks fake; live shows a count, not who | "Who's out today" with friends' avatars at the top of Today |
| 4 | 1 | "Mitfahren" sounds like carpooling | "Bin dabei" |
| 5 | 3 | Fine | — |
| 6 | 2 on the Map tab | Start sits below two other panels | Big "Skitag starten" button on the map |
| 7 | many | Friends show only as small dots on a map centred on the city; the lift meetup must be started by hand and it is not clear what it does | Friend chips above the map (tap to fly there); estimate from shared positions "on the Nordkettenbahn, at the top in about 4 min" |
| 8 | 3 in the profile under Settings | Hidden under Settings | Ask once after the first ride or friend, with one tap |

Score estimate before Step 3: "open tomorrow" 4/10.
