# Tutee Connect — Study in Finland

The eleventh destination page. A faithful clone of the deployed reference site
(https://pageus.netlify.app/#/), localised to Finland: same DOM, same Tailwind
classes, same compiled stylesheet, same scroll and hover animations. Only the
copy, the dataset, the photographs and the currency glyph differ.

## Landing page redesign (October 2026)

`index.html` is now **hand-authored** and no longer a clone of the reference
DOM. It uses its own Nordic design system — `assets/css/finland.css` (Finnish
flag blue, snow white, aurora accents, Tutee maroon for every conversion
action) and `assets/js/finland.js` (seasons scene, services tabs, "Find my
Finland match" quiz, pinned horizontal journey, scroll-velocity rails,
spotlight/tilt/magnet effects, FAQ search, lead forms, Tutee AI chat). **The
landing page shows no monetary values** — fees, funds, insurance, wages and
grant amounts were removed from the page, the chat replies and the service
descriptions in `assets/js/services-data.js` (hand-edited, so a re-run of
`localise_fi.py` would put them back). The README tables below still record
the figures for reference. It no longer
loads `main.css` or `main.js`; `universities.html` still does and is unchanged.
**Do not re-run `assemble.py finland`** without porting this design into the
tooling first, or it will overwrite the page. Lead forms still post to
`/api/enquiry`; they now also send `study_level`, `intake` and
`form_location`, which the function forwards as extra fields.

### Cinematic hero

`#home` is a pinned scroll scene (`initCinematicHero` in `finland.js`):
FINLAND is cut out of a night veil with an SVG mask over the full-resolution
aurora photo, so it stays sharp while scrolling zooms through the "L"; the
Nordic cross then draws out and thickens into the Finnish flag, ending on
"Tervetuloa." Phones stack the word as FIN / LAND. With reduced motion (or
no JS) it is a plain full-screen hero with no pinning. The clock shows live
Helsinki time from the visitor's browser.

### Universities directory and detail pages (October 2026)

`universities.html` and the new `university.html?id=<id>` are hand-authored
too and share `finland.css` + `assets/css/unis.css`. `main.js` is no longer
loaded by any page.

* **Shortlist** — `assets/js/shortlist.js` keeps up to 12 institutions in
  `localStorage` (`tcShortlist`). The directory, every detail page and the
  landing-page quiz add to it; the landing page's evaluation form shows it as
  removable chips and sends it as the enquiry's `destination`. Every "Apply"
  button goes to `index.html#contact`.
* **Directory** — `assets/js/unis.js`: search (diacritic-folded, `/` to
  focus), type/field/city facets, sort, grid or list view, all mirrored in the
  URL. It still exposes `window.TC_applyUniversities` for `supabase-data.js`.
* **Detail page** — reads `FI_UNIVERSITIES` + `FI_PROGRAMMES`; no fee is ever
  rendered (the data still carries one).
* **Motion** — `assets/js/reactbits.js` holds vanilla ports of React Bits
  components (Aurora WebGL2 shader, Noise, ScrollReveal, ScrollStack,
  ShinyText, DecryptedText, StarBorder, ImageTrail). React Bits is
  MIT + Commons Clause: keep the licence header in that file and never publish
  the ports as a standalone library.
* **Photos** — campus-city photos live at `assets/img/cities/<city>.jpg`
  (slug of the city name), seasons at `assets/img/seasons/<season>.jpg`.
  Credits are in `assets/js/photo-credits.js` and `assets/img/CREDITS-HD.md`.
  A missing photo simply shows the card's colour panel.

## Build

Everything else here is **generated**. Editing `index.html`, `universities.html`,
`assets/js/main.js`, `assets/js/services-data.js` or
`assets/js/universities-data.js` by hand gets overwritten on the next build.

```bash
cd "../_tooling"
python3 build_dataset_fi.py     # regenerate both datasets from the vendored snapshots
python3 build_dataset_fi.py --refresh   # ...re-capturing all seven snapshots first
python3 localise_fi.py          # regenerate fragments-finland/ + this site's two JS files
python3 assemble.py finland     # rebuild index.html
python3 build_unipage.py finland   # rebuild universities.html
python3 verify_site.py finland  # static checks
python3 check_twins.py finland  # what the localiser handed through unchanged
```

Local preview: double-click `Start Local Server.command`, or
`python3 ../_tooling/devserver.py finland --port 8010` (port **8010** in the
three shared launchers at the top of `../`).

## The directory: 35 recognised institutions, and the 36th

**35 is the official structure and 36 is what this directory lists.** Both
numbers appear on the page, on purpose, and the source note under the filters
explains the difference in one sentence rather than leaving a reader to think
one of them is a typo:

| | |
|---|---|
| **35** | the **Ministry of Education and Culture's** own administrative branch — **13 universities** (*yliopisto*) and **22 universities of applied sciences** (*ammattikorkeakoulu*). This is the figure the Ministry and Study in Finland publish, and it is what the stat band and the home-page hero show |
| **36** | what the directory lists: those 35 **plus Högskolan på Åland**, a recognised Finnish institution awarding Finnish degrees, which answers to the **Government of Åland** under the Act on the Autonomy of Åland rather than to the Ministry |

The arithmetic is exact and the builder asserts it. The OPH register lists **24**
universities of applied sciences; every one is under the Ministry **except two**
— Högskolan på Åland (Government of Åland) and Poliisiammattikorkeakoulu
(Ministry of the Interior). 24 − 2 = 22, and 13 + 22 = 35. Åland is listed and
flagged `branch: "aland"`; the Police University College is absent for the
separate reason below.

Dropping Åland to make the count tidy would have removed a real institution an
international student can apply to. Listing it silently would have made the page
disagree with every official source. Listing it and saying why is the only
option that is both complete and true.

## The register itself

Finland has no CRICOS, no ILEP, no EduTrust and no NZQA Code of Practice —
there is no separate permission to enrol international students, because none is
needed. Any institution licensed by the **Ministry of Education and Culture** may
enrol anyone, and Migri grants a residence permit for studies on the strength of
a place at one. So the licence *is* the permission.

`assets/js/universities-data.js` joins two official services:

| | |
|---|---|
| **OPH organisation register** (`virkailija.opintopolku.fi/organisaatio-service`) | `oppilaitostyyppi_42` — 13 universities (*yliopisto*); `oppilaitostyyppi_41` — 24 universities of applied sciences (*ammattikorkeakoulu*). Legal names in Finnish, Swedish and English; institution codes; home municipality |
| **Studyinfo / Opintopolku** (`opintopolku.fi/konfo-backend`) | each institution's published offering, its campus municipalities, and its **English-taught** offering broken down by ISCED broad field |
| **OPH koodisto** | municipality → region, with the region's official English name |

**36 is not a truncated capture — it is the entire Finnish higher education
system.** Finland has no private higher education sector. This is the smallest
genuine dataset in the set (against the UAE's 90 and Singapore's 126), which is
why `build_unipage.py`'s size floor came down from 50 to 30. The page answers
the "only 36?" question by going **deeper instead of wider**: 36 institutions,
but **1,295 programme listings** under them, filterable three ways.

### The one institution absent, and why that is not editorial judgement

The register lists 24 universities of applied sciences; this file has 23.
**Poliisiammattikorkeakoulu** (the Police University College) publishes nothing
in Studyinfo, because its degrees are open only to Finnish citizens serving in
the police. The join drops it **at the source** — the New Zealand pattern (query
the register for the permission itself), not the German one (list everything,
then exclude by hand). `build_dataset_fi.py` asserts it is the only drop, so a
register update cannot quietly remove anything else.

## The discovery layer

`universities.html` is the only directory in this set with facet filters and a
programme layer, because Finland is the only country whose national application
service publishes the underlying data openly. Everything in it is Studyinfo's:

* **Search** by name — diacritic-folded, and searching `alt`, so "Jyvaskylan
  ammattikorkeakoulu", "Yrkeshogskolan Novia" or a campus city such as
  "Mikkeli" all find the right institution (none of those strings appears in the
  English name the register publishes).
* **Filter by type** — University / University of Applied Sciences, the
  register's own two categories.
* **Filter by study field** — the eleven ISCED broad fields Studyinfo aggregates
  by. The facet reads the dataset's full `fields` list, not the truncated
  `programs` string the card shows, so it cannot silently miss a subject.
* **Filter by city** — read out of the dataset at build time, so a register
  refresh that adds a city cannot leave the dropdown behind.
* **Programme list per institution** — opens in place, and respects the study
  field filter. Each row carries the programme name (linked to its own Studyinfo
  page), level, subject field, campus, planned duration, **the institution's own
  published annual tuition fee**, and whether a scholarship is attached.
* **Website link** — each institution's own site, from its Studyinfo
  organisation record. The builder asserts every institution has one.
* **Load more**, 20 at a time, as before; and all of it reaches the **mobile**
  list too, which matters because `data-uni-grid` is `hidden sm:grid` and phones
  never see the desktop card at all.

The stat band above the search box is generated from
`window.FI_PROGRAMME_TOTALS` in `assets/js/programmes-data.js`, which the
dataset builder writes next to the data it describes — no figure on it is typed
by hand.

## What is real data here, and what is not

**Real, from the sources above:** every institution name, its type, its home
city and region, its campus municipalities, its subject areas, and the
`programmes` count.

`programmes` is the number of **English-taught study options** the institution
publishes in Studyinfo, counted by Studyinfo. It replaces the UK page's invented
`offerRate` placeholder. Read it as *breadth of choice for a student who does not
speak Finnish*. Three cautions:

* it is **not** a quality score, an enrolment figure, or comparable as "size";
* institutions itemise at very different granularities — the **University of the
  Arts Helsinki shows 285**, more than Aalto's 127, because it lists individual
  instruments and disciplines as separate study options. That is Studyinfo's own
  structure, not an error, and it is why the field is labelled "Taught in
  English" rather than anything implying scale;
* a `0` would be real and would be shown as such. None is currently 0.

**Editorial, and the only editorial thing in the file:** the short labels for
Studyinfo's ISCED broad fields (`Engineering` for "Engineering, manufacturing and
construction", and so on). That is a relabelling of an official classification,
written down in `FIELD` in the builder. Studyinfo's `99 Unknown` bucket is
dropped rather than shown.

**Two counts that must not be confused, and are not.** Nationally Studyinfo
holds **691** English-taught bachelor's and master's degree programmes (plus 104
doctoral); the per-institution lists add up to **1,295**, because a programme
offered by three institutions is listed under each of them. The stat band quotes
the national figure — quoting the larger one would overstate how much choice
exists. `refresh_national_totals()` captures it from the national search rather
than deriving it by adding up cards.

**A fee Studyinfo does not carry is shown as "Fee not published", never as
free.** A published `0` renders as "No tuition fee" and is normal for doctoral
study. Those are different facts and the page keeps them apart.

**Two display fixes**, with the register's own name kept in `alt` so nothing
becomes unsearchable: `Lappeenranta-Lahti University of Technology LUT` renders
as **LUT University** (its own brand, and QS's name for it — the legal form wraps
to three lines on a carousel card), and `Högskolan på Åland` renders as **Åland
University of Applied Sciences (Högskolan på Åland)**.

**Home municipality is the register's, not the main campus's.** Aalto reads
Helsinki rather than Espoo, and the University of Eastern Finland reads Joensuu
rather than Kuopio. Both campus cities are in `alt`, so search finds either.

## Ranking: QS *Europe*, because QS World only reaches nine

The home carousel renders exactly 12 cards, each with a hardcoded `Rank #N`
badge, so the ranked block must reach 12 or the page asserts a position an
institution does not hold.

* **QS World University Rankings 2027** covers **nine** Finnish universities.
* **QS World University Rankings: Europe 2026** (published 28 January 2026)
  covers exactly **twelve** Finnish institutions.

Same resolution as Ireland. Two consequences the page states rather than hides:
the Europe table **reaches into the UAS sector** for cards 11 and 12 (Turku UAS,
Jamk), so two universities of applied sciences are ranked while **three
universities are not** (Hanken, Lapland, the University of the Arts Helsinki);
and QS's names for two of the twelve do not match the register's — "LUT
University" and "Jyväskylä University of Applied Sciences", which the register
calls "Jamk". Both are mapped explicitly in `QS_EUROPE_2026`, with an assertion,
because joining on the string would have silently dropped card 12.

## Country-specific build notes

* **Currency:** `swap_currency: 'euro'` — `assemble.py` swaps the reference's two
  dollar glyphs for `circle-euro` in the HTML, and `localise_fi.py` swaps the
  **pound** glyph inside `services-data.js`, which ships its icons inline. That
  second half is the one Canada missed and still renders a £ on a dollar page.
  `circle-euro` has one `<path>` fewer than `circle-pound-sterling`, which is why
  `index.html` has exactly **two elements fewer** than the UK page. That, plus the
  `finland-city.jpg` class token, is the *only* structural difference between the
  two pages — verified by diffing the tag+class skeleton.
* **Spelling:** British `-ise` **and** British `programme`. Studyinfo, Study in
  Finland and every Finnish university write "degree programme", so `program`
  would be the odd spelling — the opposite of the Australian, Singapore and UAE
  pages.
* **Search folding:** `main.js` strips diacritics (NFD) and collapses punctuation
  on both sides of the comparison, and searches `alt`. Without the first,
  "Jyvaskyla", "Abo Akademi", "Hame" and "Aland" find nothing; without the
  second, the register's English names hide the Finnish and Swedish legal names
  and every campus city ("Mikkeli", "Kuopio", "Vantaa").
* **The hero stat diverges from the other ten pages.** They all keep the
  reference's "200+ *country* Tie-ups". Finnish higher education is 35
  institutions, so that claim would assert more institutional relationships than
  institutions exist, on a page whose own directory can be counted. The stat
  reads **"35 / FI Institutions"** instead — the Ministry's structure, matching
  the directory's stat band.
* **CTA label:** the family CTA is "Get Family **Permit** Help", not "Visa" —
  Finland grants a residence permit on the basis of family ties. `assemble.py`
  takes it from `family_cta`, which only this country sets.

## The copy claims this page must never get wrong

1. **It is a residence permit, not a visa, and it is *continuous*.** A degree
   student at a higher education institution gets an **A permit for the whole
   length of the studies**. A **D visa** is issued alongside it so the student can
   travel before the card arrives. There is **no credibility interview**.
2. **Work is capped by the year, not the week.** An **average of 30 hours a
   week**, in any field, no separate work permit — averaged **across the calendar
   year**, so full-time work over the summer is fine. Both the desktop and mobile
   halves of that block carry the number.
3. **No national minimum wage.** Finnish pay floors come from sector collective
   agreements, so the page must not quote a statutory hourly minimum the way the
   UK page quotes £12–£15.
4. **Family can come, and the partner can work without restriction** — subject to
   an income requirement (roughly €610 net a month for a second adult in the
   Helsinki region, €550 elsewhere, about €480 per child, on top of the student's
   own €800). Say the condition, not just the entitlement.
5. **Permanent residence was tightened and loosened in the same amendment.** From
   **8 January 2026** the ordinary period rose from four years to **six** — but a
   **degree completed in Finland** removes the period-of-residence requirement
   entirely, subject to Finnish or Swedish language skills. Naming one without the
   other misleads in either direction.
6. **There is no language test at the permit stage at all.** Migri sets none; the
   institution sets it. IELTS Academic, TOEFL iBT, PTE Academic and Cambridge
   C1/C2 are accepted across Finnish higher education, and **the Duolingo English
   Test is accepted by some institutions and not others**. That is why `Duolingo`
   is *not* a leak pattern for this country in `verify_site.py`, and why
   `localise_fi.py` asserts the sentence explaining it survives.

## Figures on the page, and where they came from

| | |
|---|---|
| Funds requirement | **€800/month, €9,600/year** (Migri) |
| Insurance | ≥**€40,000** for two years or more of study, ≥**€120,000** for less, deductible ≤**€300** |
| Permit fee | **€600** online, **€750** on paper — Migri's 2026 tariff, in force 1 January 2026 (was €450/€550) |
| Tuition, non-EU/EEA | roughly **€8,000–€20,000 a year**; **doctoral study has no tuition fee** |
| Living costs | roughly **€900–€1,250 a month in Helsinki** |
| Finland Scholarship | 100% of the first year's tuition **plus a €5,000 relocation grant** |
| Post-study permit | up to **two years**, applied for within **five years** of the student permit expiring, in up to three parts |
| Citizenship | **eight years**, or **five** for applicants meeting the language requirement |

Fee and rule figures move. Re-check the Migri tariff and the permanent residence
conditions before any relaunch — both changed in January 2026.

## Things a reviewer should check before launch

- [ ] The **QS Europe edition**. This page cites **Europe 2026**. When QS
      publishes Europe 2027, re-check that Finland still has **at least twelve**
      entries before updating — if it drops below, cards 9–12 need the New
      Zealand rebadging treatment.
- [ ] The **register snapshots** in `../_tooling/reference/` are dated
      **2026-09-03**. Re-run `build_dataset_fi.py --refresh` and confirm the
      counts assertions still hold: 13 + 23 listed, 35 in the Ministry's branch,
      exactly one Åland institution, exactly one Studyinfo drop, and every
      institution carrying a website URL.
- [ ] The **"600+" claim** in the stat band. The builder asserts Studyinfo still
      reports at least 600 English-taught degree programmes and fails the build
      if it does not — but if that ever fires, **update the copy, not the
      threshold**.
- [ ] The **`open` flag** on programme rows goes stale between captures by
      design; it records whether applications were open *at capture time*.
- [ ] The **Migri fee**, the funds figure and the insurance thresholds.
- [ ] The **photo credit line** matches `assets/img/photos/CREDITS.md`. Three of
      the four photographs are CC0 and one is CC BY 2.0 — the CC BY one makes the
      footer line a licence obligation.
- [ ] `SITE_COUNTRY=Finland` is set on the deployment, or the enquiry subject
      line falls back to matching the destination string. `resolve_country()` in
      `serverless/enquiry.py` accepts `finland`, `fi`, `fin` and `suomi`.
