# 0004 Day boundaries follow Europe/Vienna

- **Status:** Accepted (2026-10-01)
- **Date:** 2026-09-25

## Context

The server and database run in UTC; every user is in Austria. Between
midnight and 01:00/02:00 local time, "Today", date pickers and "past ride"
were a day off.

## Decision

`private.local_today()` in SQL and `toIsoDay()`/`APP_TIME_ZONE` in the app
use Europe/Vienna for every day boundary.

## Consequences

Correct for the launch regions. A later expansion outside Central European
time would need a per-user or per-region time zone.
