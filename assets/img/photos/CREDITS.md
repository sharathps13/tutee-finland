# Photo credits

All four photographs are Finnish subjects sourced from Wikimedia Commons. Three
are **CC0** and one is **CC BY 2.0**, which makes the footer credit line a
licence obligation rather than a courtesy. The line is rendered from the
`data-photo-credit` element and generated from `PHOTO_CREDIT` in
`_tooling/localise_fi.py`. If you swap any photo, update this file **and** that
constant, then re-run `localise_fi.py`, `assemble.py finland` and
`build_unipage.py finland`.

CC BY-SA, NC and ND images were deliberately avoided, as on the other ten pages.
That rule was unusually cheap here: Leonhard Lenz released a large, consistent
CC0 set of Helsinki in September 2022, shot on the same camera at the same hour,
which is why three of the four come from one photographer.

Each file was cropped and resized from the Commons original with `sips`. The
output dimensions match the UAE, Malaysian, Singapore, French, Australian, New
Zealand, German, Irish and Canadian files, which in turn match the slots, so the
layout cannot shift.

**No photograph has an identifiable person as its subject** — the same rule the
other ten pages follow. Three frames are empty of people entirely. The
Töölönlahti frame carries a handful of figures in the middle distance on the
far side of the park; at the delivered 1400 px they are a few pixels tall and no
face resolves even in the 8368 px original. This is the same judgement the UAE
page's Zabeel Park frame and the Singapore page's Gardens by the Bay panel rest
on.

**Three of the four are Helsinki.** That is a departure from the "four different
cities" spread most of the other pages keep, and it is a compromise rather than
a design choice: Commons has very little usable high-resolution, permissively
licensed photography of Tampere, Turku, Oulu or Jyväskylä that is free of
identifiable people. Tampere carries the one non-Helsinki slot, and it is the
slot where a second city matters most — the panel behind "Why Finland?". If
better Turku or Oulu frames appear, `finland-city.jpg` is the file to revisit
first.

---

## students-campus.jpg — hero (`#home`), 1200×1143

> **The filename does not describe the subject**, and it is kept because
> `students-campus.jpg` is a literal key in the compiled stylesheet — the class
> `bg-[url('/assets/img/photos/students-campus.jpg')]` plus the matching escaped
> selector and `url()` in `assets/css/main.css`, and the `<link rel="preload">`
> in the page shell. Renaming the file means editing all of those together;
> `verify_site.py` fails on a mismatch, the browser fails silently.

- **Depicts:** Helsinki Cathedral seen head-on from Senate Square at dusk, with
  the empty square and its granite steps in the foreground.
- **Commons file page:** https://commons.wikimedia.org/wiki/File:Helsingin_tuomiokirkko_2022-09-16_01.jpg
- **Author / photographer:** Leonhard Lenz
- **Licence:** CC0 — https://creativecommons.org/publicdomain/zero/1.0
- **Attribution required:** no (credited anyway)
- **Crop:** original 8368×5584 (1.4986:1) → `sips -c 5584 5863` (1.0499:1,
  centred) → resized to 1200×1143, quality 82.
- **Why a centred crop is right here:** the photographer squared up on the
  cathedral's axis, which sits within a percent of the frame's centre. The
  ~1,253 px trimmed from each side is empty square and sky.
- **Why 1.05:1 and not the original 3:2:** the hero panel measures about
  **596×584 CSS px on desktop (1.02:1) and 319×292 on mobile (1.09:1)** —
  essentially square at every breakpoint. The div is `bg-cover bg-center`, so a
  1.5:1 file would have a third of its width thrown away. A near-square crop
  suits this subject unusually well, because the cathedral is a single central
  mass rising to a dome — the same reason the UAE page crops the Burj Khalifa
  and the Malaysian page the Petronas Twin Towers this way.
- **Safe to reshape:** referenced only as a CSS `background-image` and a
  `<link rel="preload">` — there is no `<img>` tag for it on either page, so its
  ratio has no effect on layout.

## finland-city.jpg — `#universities` ("Why Finland?") background panel, 1400×933

> Referenced by the Tailwind arbitrary-value class
> `bg-[url('/assets/img/photos/finland-city.jpg')]`, which is a **literal key**
> into `assets/css/main.css`. Both the class in the HTML and the escaped
> selector plus `url()` in the stylesheet must be changed together — this file
> was repointed from `uae-city.jpg` when the shared CSS was copied over.

- **Depicts:** the Tammerkoski rapids in the centre of Tampere, with the dam,
  the Tampella hydroelectric station and the red-brick mill buildings that make
  up the city's historic industrial core.
- **Commons file page:** https://commons.wikimedia.org/wiki/File:Tammerkoski_in_Tampere,_Finland,_2024_July.jpg
- **Author / photographer:** Pete
- **Licence:** CC BY 2.0 — https://creativecommons.org/licenses/by/2.0
- **Attribution required:** **yes**
- **Crop:** original 4000×3000 (4:3) → `sips -c 2667 4000 --cropOffset 120 0`
  (1.5005:1 — 120 px off the top and 213 px of water off the bottom) → resized
  to 1400×933, quality 82.
- **Why Tampere and not a second Helsinki frame:** this panel sits behind "Why
  Finland?", the question a student is actually weighing, and Tampere is the
  country's second university city — Tampere University and TAMK between them
  publish 114 English-taught study options in the directory. Showing only the
  capital would misdescribe where Finnish higher education is.

## team-working.jpg — `#relocate` ("The Pathway to Settlement"), 1400×933

- **Depicts:** the Parliament House (Eduskuntatalo) on Mannerheimintie in
  Helsinki, seen from the cobbled forecourt at the foot of its steps.
- **Commons file page:** https://commons.wikimedia.org/wiki/File:Eduskuntatalo_Helsinki_2022-09-16_01.jpg
- **Author / photographer:** Leonhard Lenz
- **Licence:** CC0 — https://creativecommons.org/publicdomain/zero/1.0
- **Attribution required:** no (credited anyway)
- **Crop:** original 8368×5584 (1.4986:1) → `sips -c 5579 8368` (exact 3:2, five
  rows off the height, centred) → resized to 1400×933, quality 82.
- **Note:** this image is rendered with `w-full h-auto object-cover`, so **its
  aspect ratio drives the layout**. Any replacement must also be 3:2.
- **Why the Parliament House for the settlement panel:** the section runs from a
  residence permit for studies to a job-search permit to a work permit to
  permanent residence, and every one of those is set by the Aliens Act, which
  the Eduskunta passes in this building — including the 8 January 2026
  amendment the copy in that section is about. Same reasoning that put Abu Dhabi
  in this slot on the UAE page, Putrajaya on the Malaysian one and Canberra on
  the Australian one.

## family.jpg — `#relocate` ("Relocating with Your Family?"), 1400×1050

- **Depicts:** Töölönlahden puisto, the park at the head of Töölönlahti bay in
  central Helsinki — lawns, a planted island in the path, apartment and office
  blocks along the eastern edge, and a rainbow over the bay.
- **Commons file page:** https://commons.wikimedia.org/wiki/File:Töölönlahden_puisto_Helsinki_2022-09-16_01.jpg
- **Author / photographer:** Leonhard Lenz
- **Licence:** CC0 — https://creativecommons.org/publicdomain/zero/1.0
- **Attribution required:** no (credited anyway)
- **Crop:** original 8368×5584 (1.4986:1) → `sips -c 5584 7445` (4:3, centred —
  462 px off each side) → resized to 1400×1050, quality 82.
- **Why a city park with housing in it:** this slot sits under "Relocating with
  Your Family?", and the copy's actual condition is the **income requirement**,
  not housing — so the frame needs to say *living here*, not *visiting here*.
  Töölönlahti is a park people walk their children through on the way home, with
  residential blocks in the frame and the bay behind, which is closer to what a
  family's Helsinki looks like than any monument would be.
