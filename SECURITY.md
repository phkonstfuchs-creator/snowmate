# Security policy

Pistl handles personal data of minors and adults: profiles, friendships,
chats, meeting points, photos and location. Security reports are welcome.

## Reporting a vulnerability

Please report privately through GitHub:
**Security → Report a vulnerability** on this repository
([private vulnerability reporting](https://github.com/phkonstfuchs-creator/snowmate/security/advisories/new)).

Do not open a public issue, and do not include real user data, credentials
or keys in the report. Describe the steps to reproduce with test accounts.

## Scope

- The app (`app.pistl.app`) and its Supabase backend (database functions,
  storage, edge functions) in this repository
- The website (`website/`, `pistl.app`)

Out of scope: denial of service, social engineering, and findings that
need a compromised device or account.

## How the project handles security

- Architecture and rules: [docs/SECURITY_AND_PRIVACY.md](docs/SECURITY_AND_PRIVACY.md)
- Latest audit and its open operational steps: [docs/SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md)
