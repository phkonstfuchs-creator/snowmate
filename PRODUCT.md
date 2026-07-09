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

Safety by design: no open 1:1 stranger matching for minors. The product is built on a friend-graph model where discovery happens within your crew and friends-of-friends, never broadcast to strangers.

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
4. **Earned, not bought.** Gamification is tied to real social and coordination actions (posting, joining, inviting) — never to fitness metrics or premium tiers. XP and badges feel like recognition from the community, not a loyalty points scheme.
5. **Mobile is the only screen that matters.** Design at 390px first. Every interaction — posting a ride, claiming a carpool seat, viewing the crew — must be one-thumb operable. Desktop is a nice-to-have, not a design constraint.

## Accessibility & Inclusion

WCAG AA minimum. Color choices must maintain 4.5:1 contrast for body text on the ice-blue/white background system. The bottom tab navigation must be touch-target compliant (min 44×44px). Reduced-motion alternatives required for any entrance animations. The product serves 16–17 year olds (minors) — safety architecture must be structurally visible in the data model (`isMinor`, `accountType` fields) even in prototype form.
