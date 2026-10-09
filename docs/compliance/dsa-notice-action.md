# DSA Notice-and-Action und Moderationsverfahren

**Status:** `DRAFT – CHANNEL AND STAFFING NOT READY`\
**Stand:** 2026-08-03\
**Moderation Owner:** `LAUNCH_BLOCKER[MODERATION_OWNER]`\
**DSA-Kontaktstelle:** `LAUNCH_BLOCKER[DSA_POINT_OF_CONTACT]`\
**Rechtsfreigabe:** `LAUNCH_BLOCKER[DSA_LEGAL_CLASSIFICATION_AND_APPROVAL]`

Diese Vorlage operationalisiert Meldungen nach Art. 16 DSA, Begründungen nach Art. 17 und, soweit auf Pistl anwendbar, interne Beschwerden nach Art. 20. Welche Pflichten oder Ausnahmen für das deutsche Einzelunternehmen und die kleine Closed Beta greifen, wird gesondert anwaltlich eingeordnet. Pistl setzt Notice-and-Action, Begründung und Einspruch unabhängig von möglichen Kleinunternehmensausnahmen als Sicherheitsstandard um.

## 1. Öffentlicher Meldekanal

- [ ] Ohne Konto erreichbar, mobil nutzbar und in Datenschutz, Bedingungen, Community-Regeln und Impressum verlinkt.
- [ ] HTTPS-Endpunkt: `LAUNCH_BLOCKER[DSA_NOTICE_ACTION_ENDPOINT]`.
- [ ] Alternative E-Mail: `LAUNCH_BLOCKER[PUBLIC_REPORTING_EMAIL]`.
- [ ] Formular erlaubt Kontakt, genaue Fundstelle, Beschreibung, behauptete Rechts-/Regelverletzung und optionale minimierte Nachweise.
- [ ] Pflichtfelder reichen für eine hinreichend genaue und begründete Meldung; es werden keine unnötigen Ausweis- oder Intimdaten verlangt.
- [ ] Melder bestätigt nach bestem Wissen redliches Handeln; keine Klausel schreckt gutgläubige Meldungen ab.
- [ ] Eingangsbestätigung mit Referenz wird unverzüglich versandt, sofern elektronischer Kontakt vorliegt.
- [ ] Rate Limit, Malware-/Dateiprüfung, Größenlimits und Abuse-Schutz verhindern Spam ohne legitime Meldungen unzumutbar zu erschweren.
- [ ] Barrierefreiheit und klare Sprache wurden mit 16-/17-Jährigen geprüft.

## 2. Mindestdaten eines Falls

- Fall-ID und Eingangszeit;
- Meldekanal und sichere Kontaktmöglichkeit;
- betroffene URL/Content-/User-/Ride-/Message-ID, nicht nur Screenshot;
- Begründung und gegebenenfalls behauptete Rechtsnorm/Community-Regel;
- Nachweise als getrennte, zugriffsbeschränkte Objekte;
- Kategorie, Dringlichkeit, mögliche Minderjährigen-/Standort-/Gewaltgefahr;
- zuständige bearbeitende Person und Stellvertretung;
- jede Maßnahme, Tatsachengrundlage, Automatisierungsbeteiligung, Begründung und Zeit;
- Kommunikation an Melder und betroffene Person;
- Einspruch, erneute Prüfung und Abschluss;
- Retention-/Legal-Hold-Datum.

Keine Moderationsakte enthält mehr Kopien personenbezogener Inhalte als für den konkreten Fall notwendig.

## 3. Triage

| Priorität | Beispiele | Erste Bewertung | Eskalation |
| --- | --- | --- | --- |
| P0 akut | unmittelbare Gefahr, glaubhafte Gewaltandrohung, laufende Ausbeutung Minderjähriger, veröffentlichte aktuelle Wohn-/Live-Position | sofort; Ziel innerhalb 4 betreuter Stunden | Incident Lead, Moderation Owner, Rechtskontakt; bei Gefahr 112/Behörde |
| P1 hoch | Grooming-Anzeichen, Stalking, Doxxing ohne akute Position, Account Takeover, schwere Bedrohung | Ziel innerhalb 4 betreuter Stunden | Senior Review/Owner |
| P2 normal | Belästigung, Hass, Identitätsmissbrauch, Betrug, wiederholte Block-Umgehung | Ziel innerhalb 24 Stunden | normale Moderationsqueue |
| P3 Einspruch/sonstig | Regelstreit, Kontextfrage, nicht dringende Beschwerde | Ziel innerhalb 48 Stunden | unabhängige erneute Prüfung |

Die Ziele sind interne Serviceziele, keine Garantie. Kann die Beta die Abdeckung nicht gewährleisten, werden Chat, Standort oder Einladungen pausiert.

## 4. Prüfung einer Meldung

1. Fundstelle und Zugriff sicher reproduzieren; keinen Zugriffsschutz umgehen.
2. Prüfen, ob Inhalt noch besteht und ob sofortige vorläufige Sicherung/Begrenzung nötig ist.
3. Kontext, Community-Regel und mögliche Rechtswidrigkeit getrennt bewerten.
4. Minderjährigen-, Standort- und Blockbeziehung serverseitig prüfen; keine unnötigen Profile durchsuchen.
5. Automatische Filter nur als Signal verwenden; finale wesentliche Maßnahme menschlich prüfen.
6. Verhältnismäßigste wirksame Maßnahme wählen.
7. Tatsachen, Unsicherheiten und Rechts-/Regelbezug dokumentieren.
8. Bei unklarer Rechtswidrigkeit Rechtskontakt einbeziehen; keine eigenständige Strafrechtsdiagnose behaupten.

Entscheidungen werden zeitnah, sorgfältig, objektiv und nicht willkürlich getroffen. Die Anzahl von Meldungen allein ist kein Beweis.

## 5. Maßnahmenkatalog

- keine Maßnahme mit Begründung;
- Rückfrage oder freiwillige Korrektur;
- Warnung;
- Sichtbarkeit begrenzen oder Inhalt entfernen;
- Chat-, Ride-, Avatar- oder Standortfunktion zeitweise begrenzen;
- Freundschaft/Verbindung aus Sicherheitsgründen trennen, wenn rechtlich und technisch vorgesehen;
- Konto vorläufig sichern/sperren;
- Konto dauerhaft sperren;
- Beweise minimiert sichern und nach Rechtsprüfung an zuständige Behörde melden.

Akute Sicherheit kann eine vorläufige Maßnahme vor Anhörung rechtfertigen. Dauerhafte Maßnahmen erhalten nachträgliche Begründung und Einspruchsmöglichkeit, soweit keine gesetzliche Einschränkung greift.

## 6. Begründung der Entscheidung

Die Nachricht an die betroffene Person enthält grundsätzlich:

- Art und Umfang der Beschränkung;
- territoriale und zeitliche Reichweite;
- konkrete Tatsachen/Umstände, einschließlich ob eine Meldung oder Eigenprüfung Auslöser war;
- Bezug auf Rechtsnorm oder konkrete Bestimmung der Nutzungs-/Community-Regeln;
- ob automatisierte Mittel bei Erkennung oder Entscheidung verwendet wurden;
- klare, nutzerfreundliche Informationen zu internem Einspruch, außergerichtlicher Streitbeilegung und gerichtlichem Rechtsbehelf, soweit anwendbar.

Nicht aufgenommen werden unnötige Identität der meldenden Person, gefährdende Details, geheime Ermittlungstatsachen oder Daten Dritter.

**Statement-of-Reasons-Template:** `LAUNCH_BLOCKER[DSA_REASON_TEMPLATE_APPROVED]`

## 7. Rückmeldung an die meldende Person

Bei vorhandener elektronischer Kontaktmöglichkeit:

- unverzügliche Eingangsbestätigung;
- Entscheidung ohne unangemessene Verzögerung;
- Information über verfügbare Rechtsbehelfe/Einspruch;
- keine Offenlegung privater Sanktionen oder Daten, die für die Rückmeldung nicht erforderlich sind.

## 8. Einspruch

- [ ] Kostenlos, elektronisch und mindestens sechs Monate nach Entscheidung erreichbar, sofern Art. 20 DSA anwendbar; freiwilliger Beta-Standard wird anwaltlich festgelegt.
- [ ] Referenz und kurze Begründung genügen; neue Nachweise sind optional.
- [ ] Nicht ausschließlich automatisiert entschieden.
- [ ] Durch eine andere oder erneut unvoreingenommen prüfende qualifizierte Person bearbeitet.
- [ ] Ursprungsentscheidung, neue Informationen, Verhältnismäßigkeit und konsistente Vorfälle werden geprüft.
- [ ] Ergebnis und Begründung gehen an die einspruchführende Person.
- [ ] Hinweise auf außergerichtliche Streitbeilegung/gerichtlichen Rechtsbehelf werden nach rechtlicher Einordnung korrekt ergänzt.

**Einspruchsendpunkt:** `LAUNCH_BLOCKER[DSA_APPEAL_ENDPOINT]`

## 9. Behörden und Straftatverdacht

- [ ] DSA-Kontakt für Behörden und Kommission ist leicht zugänglich, besetzt und kann Deutsch/Englisch verarbeiten.
- [ ] Behördliche Anordnungen werden authentifiziert, protokolliert und rechtlich geprüft.
- [ ] Für Verdacht auf Straftaten mit Gefahr für Leben/Sicherheit existiert ein gesonderter, anwaltlich freigegebener Eskalationsweg.
- [ ] Es werden nur erforderliche Daten übermittelt; keine pauschalen Account-Dumps.
- [ ] Geheimhaltungs- und Nutzerbenachrichtigungsfragen werden je Fall dokumentiert.

## 10. Minderjährigenschutz

- [ ] Regeln und Begründungen sind für 16-/17-Jährige verständlich.
- [ ] Keine Werbung und insbesondere kein Profiling für Werbung an Minderjährige.
- [ ] Grooming, sexuelle Ausbeutung, Erpressung, Doxxing und Standortgefahr sind eigene P0/P1-Kategorien.
- [ ] Moderation kennt sicheren Umgang mit entsprechenden Nachweisen und kopiert sie nicht unnötig.
- [ ] Kontakte zu Beratungs-/Notfallstellen für DE/AT werden vor Launch rechtlich und fachlich geprüft.
- [ ] Transparenz gefährdet weder meldende noch betroffene Minderjährige.

## 11. Retention und Zugriff

- Fallinhalt/Nachweise: 90 Tage nach Abschluss.
- Entscheidungsmetadaten: zwölf Monate.
- Legal Hold nur konkret, genehmigt, getrennt und befristet.
- Moderatorzugriff nach Need-to-know, MFA und Audit.
- Kein Moderationstext in PostHog, allgemeinem Supporttool oder ungeschützter E-Mail.

Siehe [retention.md](./retention.md) und [toms.md](./toms.md).

## 12. Qualität und Transparenz

- [ ] Monatliche Stichprobe auf Konsistenz, Fehlentscheidungen, Bias, Minderjährigen- und Standortfälle.
- [ ] Metriken enthalten Eingang, Kategorie, Reaktionszeit, Maßnahme, Einspruch und Aufhebungsquote, keine unnötigen Klardaten.
- [ ] DSA-Transparenzberichtspflichten und mögliche Klein-/Kleinstunternehmensausnahmen anwaltlich bewertet.
- [ ] Monatlich aktive EU-Empfängerzahl wird intern nachvollziehbar ermittelt; externe Veröffentlichungspflicht geprüft.
- [ ] Moderationsregeln und wesentliche Änderungen sind versioniert und öffentlich verständlich.

## Launch-Test

- [ ] Meldung illegaler Inhalte ohne Konto auf iPhone/Android/Desktop.
- [ ] Eingangsbestätigung und sichere Referenz.
- [ ] P0-Minderjährigen-/Standortfall mit Rufbereitschaft und Feature Kill Switch.
- [ ] Normale Regelmeldung ohne Maßnahme.
- [ ] Entfernung mit vollständiger Begründung.
- [ ] Einspruch hebt falsche Maßnahme auf und widerruft Zugriffe/Sanktionen korrekt.
- [ ] Blockierung funktioniert unabhängig von der Meldung sofort.
- [ ] Retention löscht Nachweis und später Metadaten.
- [ ] Missbräuchliche Serienmeldung wird begrenzt, ohne legitimen Kanal zu sperren.

**Operative Abnahme:** `LAUNCH_BLOCKER[MODERATION_OPERATIONS_READY]`\
**Rechtliche Abnahme:** `LAUNCH_BLOCKER[DSA_LEGAL_CLASSIFICATION_AND_APPROVAL]`

## Quellen

- [Digital Services Act bei EUR-Lex](https://eur-lex.europa.eu/eli/reg/2022/2065/oj?locale=de)
- [Europäische Kommission: DSA Questions and Answers](https://digital-strategy.ec.europa.eu/en/faqs/digital-services-act-questions-and-answers)
- [Europäische Kommission: DSA und Transparenz](https://digital-strategy.ec.europa.eu/en/policies/dsa-brings-transparency)

Pflichten, Ausnahmen und nationale Zuständigkeit werden unmittelbar vor Freigabe erneut geprüft.
