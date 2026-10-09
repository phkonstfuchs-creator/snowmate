# Pistl Compliance-Arbeitsbereich

**Status:** Interner technischer Entwurf, nicht rechtlich freigegeben\
**Stand:** 2026-08-03\
**Produktgrenze:** kostenlose Closed Beta, maximal 100 eingeladene Personen, ab 16 Jahre, Deutschland und Österreich

Dieser Ordner enthält Arbeitsvorlagen für Datenschutz, Plattform-Sicherheit und Launch-Freigaben. Er ist weder Rechtsberatung noch ein Nachweis, dass Pistl bereits DSGVO-, DSA-, DDG-, TDDDG- oder App-Store-konform ist.

> **LAUNCH_BLOCKER[LEGAL_REVIEW_APPROVAL]** Eine deutsche Datenschutz-/IT-Rechtskanzlei muss die öffentlichen Texte, Rechtsgrundlagen, DSA-Einordnung, Minderjährigenregelung und betrieblichen Verfahren schriftlich freigeben.

## Verbindliche Launch-Regel

Eine externe Einladung darf erst verschickt werden, wenn alle folgenden Nachweise vorliegen:

- [ ] `LAUNCH_BLOCKER[OPERATOR_LEGAL_NAME]` und `LAUNCH_BLOCKER[OPERATOR_POSTAL_ADDRESS]` wurden über einen geschützten Prozess in Impressum, Datenschutz und Bedingungen eingesetzt.
- [ ] `LAUNCH_BLOCKER[LEGAL_REVIEW_APPROVAL]` enthält Datum, geprüfte Dokumentversionen, Kanzlei/prüfende Person und schriftliche Freigabe oder dokumentierte Restauflagen.
- [ ] `LAUNCH_BLOCKER[LOCATION_LEGAL_BASIS_AND_DPIA]` ist durch abgeschlossene DPIA, technische Abnahmetests und verantwortliche Freigabe gelöst.
- [ ] `LAUNCH_BLOCKER[PROCESSOR_CONTRACTS_AND_TRANSFERS]` ist für Supabase, Vercel, Brevo und PostHog mit AVV/DPA, Unterauftragsverarbeitern, Transfermechanismus und TIA gelöst.
- [ ] Analytics bleibt in Datenbank und Browser-Build deaktiviert, bis ein beobachteter PostHog-Löschtest einschließlich personenloser Events bestanden und rechtlich freigegeben ist.
- [ ] `LAUNCH_BLOCKER[RETENTION_TECHNICAL_ENFORCEMENT]` ist durch automatische Löschjobs, Fehleralarme und Stichprobennachweise gelöst.
- [ ] `LAUNCH_BLOCKER[ACCOUNT_LEGAL_ACCEPTANCE_FLOW]` ist durch sichtbare Links vor Signup, versionierte Annahme und getrennte optionale Einwilligungen gelöst.
- [ ] `LAUNCH_BLOCKER[DSA_NOTICE_ACTION_ENDPOINT]`, `LAUNCH_BLOCKER[DSA_POINT_OF_CONTACT]` und `LAUNCH_BLOCKER[MODERATION_OPERATIONS_READY]` sind getestet und während der Beta besetzt.
- [ ] Zuständige Datenschutzaufsicht, Incident-Kontakte, Datenschutzkontakt und Stellvertretungen sind benannt.
- [ ] Restore-Test, Rechte-Matrix, DSAR-Probelauf, Lösch-Probelauf und Data-Breach-Tabletop sind protokolliert.
- [ ] Öffentliche Dokumente stimmen mit der tatsächlich deployten Version überein; alle `LAUNCH_BLOCKER[...]` wurden in den öffentlichen Seiten entfernt.
- [ ] Eine Repository-Suche nach `LAUNCH_BLOCKER[` liefert in launchrelevanten Artefakten keine unbewerteten Treffer.

## Artefakte

| Datei | Zweck | Freigabe |
| --- | --- | --- |
| [ropa.md](./ropa.md) | Verzeichnis der Verarbeitungstätigkeiten nach Art. 30 DSGVO | Verantwortlicher + Datenschutzberatung |
| [toms.md](./toms.md) | Technische und organisatorische Maßnahmen nach Art. 32 DSGVO | Technik + Verantwortlicher |
| [dpia.md](./dpia.md) | Datenschutz-Folgenabschätzung für Social Graph, Minderjährige und Standort | Verantwortlicher + Datenschutzberatung |
| [retention.md](./retention.md) | Löschfristen, Jobs, Backups und Legal Holds | Produkt + Technik + Recht |
| [dsar.md](./dsar.md) | Verfahren für Betroffenenrechte | Datenschutzkontakt + Support |
| [data-breach.md](./data-breach.md) | 72-Stunden-Incident-Runbook | Incident Lead + Verantwortlicher |
| [dpa-tia.md](./dpa-tia.md) | AVV/DPA- und Drittlandtransfer-Prüfung | Verantwortlicher + Datenschutzberatung |
| [dsa-notice-action.md](./dsa-notice-action.md) | Notice-and-Action, Begründung und Einspruch | Moderation + Recht |

## Umgang mit geschützten Betreiberangaben

1. Betreibername, ladungsfähige Anschrift und private Kontaktdaten bleiben bis zur geplanten Veröffentlichung außerhalb des Repositories.
2. Vor dem Einsetzen wird geprüft, welche Angaben zwingend öffentlich sein müssen und ob eine rechtlich zulässige Geschäftsanschrift genutzt wird.
3. Die finale Änderung wird von einer zweiten Person gegen Freigabedokument und Anbieteridentität geprüft.
4. Private Telefonnummern, persönliche Steuernummern, Ausweiskopien und nicht erforderliche Registerunterlagen werden nicht committed.
5. Alte Git-Historie wird vor Veröffentlichung darauf geprüft, dass keine geschützten Angaben oder Zugangsdaten enthalten sind.

## Change-Control

Jede Änderung an Datenkategorien, Empfängern, Regionen, Retention, Sichtbarkeitsregeln, Minderjährigenschutz, Analyse, Standort oder Moderation löst vor Deployment aus:

- [ ] ROPA aktualisieren.
- [ ] DPIA-Screening und gegebenenfalls DPIA aktualisieren.
- [ ] Datenschutzerklärung und Nutzungsbedingungen auf Änderungsbedarf prüfen.
- [ ] DPA/TIA und Unterauftragsverarbeiter prüfen.
- [ ] Tests für RLS, Löschung, Consent und Meldestelle aktualisieren.
- [ ] Dokumentversion, Freigabe und Bekanntgabe an Nutzende festhalten.

## Offizielle Arbeitsquellen

- [DSGVO bei EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj?locale=de)
- [BfDI: Verzeichnis von Verarbeitungstätigkeiten](https://www.bfdi.bund.de/DE/Fachthemen/Inhalte/Allgemein/Verzeichnis-Verarbeitungstaetigkeiten.html)
- [EDPB: Datenschutz-Folgenabschätzung](https://www.edpb.europa.eu/topics/accountability-and-compliance-tools/data-protection-impact-assessment_en)
- [EDPB: Guidelines 9/2022 zu Datenschutzverletzungen](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-92022-personal-data-breach-notification-under_en)
- [Digital Services Act bei EUR-Lex](https://eur-lex.europa.eu/eli/reg/2022/2065/oj?locale=de)
- [§ 5 DDG](https://www.gesetze-im-internet.de/ddg/__5.html)
- [§ 25 TDDDG](https://www.gesetze-im-internet.de/ttdsg/__25.html)
- [Österreichische Datenschutzbehörde: Teens & Kids](https://dsb.gv.at/ueber-die-datenschutzbehoerde/teens-kids)

Quellen werden bei jeder formalen Freigabe erneut auf Aktualität geprüft. Die Links ersetzen keine Einzelfallprüfung.
