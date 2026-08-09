# Product

## Register

product

## Users

Young urban skiers aged 16–25, primarily students and seasonal workers in Innsbruck and Salzburg, Austria. They are ski-native residents (not tourists), hold multi-resort passes (SKI plus City Pass = 13 areas on one pass in Innsbruck), and coordinate their mountain days through scattered WhatsApp groups and Instagram DMs. Their primary context: weekend mornings deciding whether to go, who to go with, how to get there. Job to be done: "find compatible people to ride with today, at my level, right now — and get there."

Three core personas:
- **Seasonal worker**: 4 months on the mountain, huge free time, zero local network
- **Solo local weekender**: season pass, no one free today, doesn't want to ski alone
- **Split-ability group**: crew with mixed skill levels that can't ride together, needs to find sub-groups

## Product Purpose

Snowmate is the social coordination layer of the mountain: "who's riding today, where, and can I join?" It is explicitly NOT a tracking app (like Strava) and NOT a generic location-sharing app (like Snapchat Map). It's ski-native, real-time, and crew-first. The live feed answers one question: which of the 13 ski areas around Innsbruck is your crew on today, and how do you join them?

Success = a young skier in Innsbruck opens the app on a Saturday morning, sees who's riding, posts a ride or joins one, finds a carpool seat, and is on the mountain with the right people — without sending a single WhatsApp message.

Safety by design: no open 1:1 stranger matching for minors. The product is built on a friend-graph model where discovery happens within your crew and friends-of-friends.

The one deliberate exception is **public events**: group rides a host opens to everyone, because a new arrival with an empty friend graph otherwise has nowhere to start. They are group-shaped, never 1:1, and they carry a stricter rule than the friend feed — a minor can never host one, the resort is public but the exact meeting point unlocks only on joining, and friendship alone does not unlock it. Every ride is friends-only unless the host explicitly opens it.

## Business Model

Coordination is free and stays free — feed, map, carpool board, crew, public events. Charging for coordination breaks the product, because a tool half your crew cannot use is worth nothing.

Revenue comes from transactions that already happen today, handled badly:

1. **University ski club trips (main driver)** — clubs run semester trips for 50–300 people on Excel, WhatsApp and private bank transfers. Snowmate handles signup, seat allocation, payment, participant lists and cancellations. **3% of the volume handled.** A 150-person trip at 300 € is 45,000 € currently moving through one overloaded organiser.
2. **Carpool transaction fee** — **0.99 € per matched ride**, charged to the passenger, never the driver: offering a seat must stay free or the board empties. It also fixes the trust problem, since a paid seat means fewer no-shows.
3. **Regional partners (season 2 onward)** — ski areas, rental shops and huts pay for visibility to people going there tomorrow. Delivered as an offer inside the feed tied to a specific ride, never as a banner.
4. **Season Pass** — **14.99 € once per season** (December–April) for powder alerts and extended stats. A minor line, not the core model, and never presented as the main one.

Status: only the Season Pass exists as a feature. The transaction flows are planned for the coming season and nothing is charged today — no payment integration, no revenue, no paying user.

## Brand Personality

Raw, social, cold. Three words: **crisp · crew · alive**.

The app should feel like what Instagram would look like if it were built specifically for a mountain town's ski scene — not a polished startup product, but a living social layer. Ice-blue accents reference the cold, the glacier, the crisp morning air. Design is clean and modern but with social-app energy: fast-moving feed, real-time feel, personality in the details.

Voice: direct, crew-native, zero corporate-speak. The interface talks like a friend who skis, not a product manager.

## Anti-references

- **Strava** — too individual, retrospective, fitness-metric heavy. Our users coordinate, not just record.
- **Snapchat Map** — generic location sharing, not ski-native, unsafe stranger-discovery model.
- **Generic SaaS dashboards** — no enterprise design patterns, no gray grid tables, no blue-button defaults with no rationale.
- **AI-aesthetic design** — no glowing orbs, no purple gradients, no generic blob heroes, no midjourney-style imagery. Everything must look human and intentional.
- **Bumble / Tinder** — no dating-app matching energy. This is crew coordination, not pairing.
- **Bergfex / resort apps** — utility only, not social. We are the social layer ON TOP of conditions/info.

## Design Principles

1. **Crew first, individual second.** Every screen's primary subject is a group, not a solo user. Feed shows rides, not user profiles. The social graph is the product.
2. **Real-time feel, not static.** Even with mock data, the interface should feel alive — recent timestamps, "riding now" indicators, count badges. The app is a live pulse of the mountain, not a bulletin board.
3. **Safety is invisible architecture.** The friend-graph model should feel natural and social, never like a restriction. Users shouldn't see a wall — they should see their crew. Safety lives in the data model, not in warning labels.
4. **Earned, not bought.** Gamification is tied to real social and coordination actions (posting, joining, inviting) — never to fitness metrics or paid tiers. XP and badges feel like recognition from the community, not a loyalty points scheme. This is why coordination is not monetized: paying must never buy standing.
5. **Mobile is the only screen that matters.** Design at 390px first. Every interaction — posting a ride, claiming a carpool seat, viewing the crew — must be one-thumb operable. Desktop is a nice-to-have, not a design constraint.

## Accessibility & Inclusion

WCAG AA minimum. Color choices must maintain 4.5:1 contrast for body text on the ice-blue/white background system. The bottom tab navigation must be touch-target compliant (min 44×44px). Reduced-motion alternatives required for any entrance animations. The product serves 16–17 year olds (minors) — safety architecture must be structurally visible in the data model (`isMinor`, `accountType` fields) even in prototype form.
