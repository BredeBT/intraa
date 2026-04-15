## Intraa Update — 15. april 2026 (3)

### Forbedringer
- Feed laster vesentlig raskere — henter nå maksimalt 20 innlegg med 5 kommentarer per innlegg i stedet for alle
- Stream-status mellomlagres nå i Vercel-edge i 30 sekunder — reduserer Twitch/YouTube API-kall

### Fikset
- Feed-spørringen hadde ingen grense — kunne hente hundrevis av innlegg og alle kommentarer ved første lasting

---

## Intraa Update — 15. april 2026 (2)

### Forbedringer
- Navigasjon er raskere — hjemside, feed og community-feed viser nå et skjelett-skjermbilde mens data lastes inn
- Sidebytte fra navigasjonsmenyen føles raskere med umiddelbar visuell respons

### Fikset
- Minnelekkasje i meldingssystemet: Supabase-kanaler ble opprettet men aldri fjernet ved sending — nå ryddet opp
- Layout hentet funksjoner og tema i to separate API-kall — erstattet med ett kombinert kall
- Community-medlemsliste hentet to datasett sekvensielt — kjøres nå parallelt

---

## Intraa Update — 15. april 2026

### Forbedringer
- Alle innholdssider har nå kortere marg på mobil — mer plass til selve innholdet
- Superadmin-panelet viser tydelig advarsel på mobilskjerm — ment for desktop
- Banner- og avatar-velgeren i admin-innstillinger er nå lesbar på mobil

### Fikset
- Hjemside-guide (for nye brukere) viste 3 kolonner side om side på mobil — vises nå stablet
- Community-forside hadde store marger og 3-kolonne layout på mobil — fikset
- Live-siden hadde allerede mobiltabs — verifisert og fungerer
- Meldinger, feed og profil var allerede responsive — ingen endringer nødvendig

---

## Intraa Update — 14. april 2026 (4)

### Nytt
- Profilside redesignet — sentrert layout med banner, overlappende avatar og ny kortdesign
- Online-indikator vises på profilbildet når brukeren var aktiv siste 5 minutter
- Rediger profil-modal direkte på profilsiden — bytt profilbilde, bannerbilde, navn og bio
- Bio-feltet har teller som viser antall tegn igjen av 160

### Forbedringer
- Tre-prikker-meny for alle profiler: fjern venn, rapporter bruker, blokker bruker
- Fanpass, coins og badges vises som chips under profilinformasjonen
- Communities-seksjonen har fått mørkere kortdesign som matcher resten av appen
- Venneliste og tom lenke-seksjon er fjernet fra profilsiden

---

## Intraa Update — 14. april 2026 (3)

### Nytt
- Feed-siden redesignet — én sentrert kolonne uten sidebar
- Ny community-header med banner-bilde, logo, stats og LIVE-badge
- Stats-grid viser innlegg siste uke, antall medlemmer, online nå og opprettelsesdato
- LIVE-badge vises kun når stream faktisk er aktiv

### Forbedringer
- Sidebar er fjernet — mer fokus og renere layout
- Innlegg-kort og compose-boks har fått mørkere kortdesign som matcher resten av appen

---

## Intraa Update — 14. april 2026 (2)

### Nytt
- Hjemside redesignet — kompakt liste-visning for communities du er med i
- Venner-panel i høyre kolonne viser hvem som er online akkurat nå
- Online-teller per community basert på aktivitet siste 5 minutter
- Innlegg-teller per community viser aktivitet siste 7 dager
- Live-badge på community-kort vises kun når stream faktisk er aktiv

### Forbedringer
- Hjemside er raskere og mindre rotete — søkefelt, "Online nå"-blokk og aktivitetsstrøm er fjernet
- Community-kort er kompakte og klikkbare — hele kortet tar deg inn i communityet
- Venner er sortert med online øverst
- Venneforespørsler vises over venner i sidebaren

---

## Intraa Update — 14. april 2026

### Nytt
- Ringelyd og oppringelyd — du horer nå en lyd nar noen ringer deg, og en ringetone nar du ringer ut
- Globalt anropsvarsel — nar noen ringer deg, vises banneret oppe pa skjermen uansett hvilken side du er pa
- Varselbanneret forsvinner automatisk hvis du svarer eller avslår, og vises ikke dobbelt nar du allerede er i meldingsvisningen
- Svar pa anrop fra varselbanneret sender deg direkte inn i samtalen
- Nettlesarnotifikasjon (Safari/Chrome) vises nar fanen ikke er aktiv og noen ringer

### Forbedringer
- Meldingsbobler er bredere pa mobil (75%) og smalere pa desktop (65%) — teksten far mer plass
- Meldingstekst brytes riktig ved lange ord og bevarer linjeskift fra avsenderen
- Dobbelttoolbar i meldingsfeltet er fjernet — kun Tiptap-verktoylinjen vises
- Videokall pa mobil vises i portrettmodus (FaceTime-stil) — full hogde, fokus pa ansikt
- Lokal video i hjornet vises i portrettformat (3:4) og plasseres over knappene
- Kontrollknapper i videokall er plassert trygt over hjemknapp-omradet pa iPhone
- Selfie-kamera er nå speilet — slik det ser ut i FaceTime

---

## Intraa Update — 12. april 2026

### Forbedringer
- Alle meldingsfelt har nå rik tekst-formatering: **fet**, *kursiv*, understreking og kodeblokk
- Toolbar vises øverst i tekstfeltet med ett klikk per formatering
- Shift+Enter lager ny linje, Enter sender — som før
- @ for å nevne noen fungerer fortsatt i alle felt
- Meldinger sendt med formatering vises korrekt hos alle mottakere

---

## Intraa Update — 11. april 2026

### Fikset
- Meldinger med linjeskift vises nå korrekt — teksten brytes der du trykket Enter
- Notifikasjonsbadges forsvinner umiddelbart når du åpner kanalen, DM-en eller gruppen
- Bjella øverst markeres som lest med én gang når du åpner den
- Community-kortene på hjemsia sender deg nå direkte inn i communityet hvis du allerede er medlem
- Søkefeltet sender deg til riktig side — inn i communityet hvis du er med, til offentlig side hvis ikke
- Twitch-embed fungerer nå korrekt på intraa.net

### Forbedringer
- Søkefeltet er flyttet til midten av headeren og er mye større og lettere å finne
- Du kan nå søke etter brukere og communities direkte fra søkefeltet — ikke bare innhold
- Vennestatus vises i søkeresultater: legg til, se profil, eller åpne DM direkte
- Søk i Meldinger finner alle brukere på tvers av alle communities, ikke bare de i ditt eget
- Profilsider viser begrenset info til fremmede — coins og aktivitet er kun synlig for venner
- Tomme plassholderbokser er fjernet fra hjemsia

### Under panseret
- Polling-intervaller er doblet for å redusere serverbelastning
- Polling stopper automatisk når du har en annen fane aktiv
- Tre nye databaseindekser for raskere oppslag på varsler og tickets
- Unread-telleren i headeren caches i 20 sekunder for å redusere antall databasekall
