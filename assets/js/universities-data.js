/* ==========================================================================
 * FI_UNIVERSITIES -- Finnish higher education directory dataset
 * --------------------------------------------------------------------------
 * PROVENANCE -- READ BEFORE EDITING
 *
 * Generated file. Do not hand-edit: run
 *     python3 _tooling/build_dataset_fi.py
 *
 * All 36 institutions here are real and currently licensed: 13 universities
 * (yliopisto) and 23 universities of applied sciences (ammattikorkeakoulu).
 * Nothing is invented and the list is not padded.
 *
 * Finland publishes no separate register of institutions permitted to enrol
 * international students, because there is no such permission to hold: an
 * institution licensed by the Ministry of Education and Culture may enrol
 * anyone, and the Finnish Immigration Service (Migri) grants a residence
 * permit for studies on the strength of a place at one. The register of
 * licensed higher education institutions therefore IS the list of places to
 * apply to. Two official services are joined:
 *
 *   Opetushallitus (Finnish National Agency for Education) organisation
 *   register -- institution codes, legal names (fi/sv/en), home municipality
 *     https://virkailija.opintopolku.fi/organisaatio-service/api/hae
 *       oppilaitostyyppi_42  yliopisto
 *       oppilaitostyyppi_41  ammattikorkeakoulu
 *
 *   Studyinfo / Opintopolku (opintopolku.fi), the national application service
 *   OPH runs -- each institution's published offering, its campus
 *   municipalities, and the ISCED broad fields it teaches in
 *     /search/oppilaitokset
 *     /search/oppilaitos/<oid>/tarjonta?opetuskieli=oppilaitoksenopetuskieli_4
 *
 *   Municipality -> region, with the region's official English name, from the
 *   OPH koodisto service (/koodisto-service/rest/codeelement/kunta_<nnn>/1).
 *
 *   snapshots: _tooling/reference/oph-korkeakoulut.json
 *              _tooling/reference/studyinfo-oppilaitokset.json
 *              _tooling/reference/studyinfo-english-tarjonta.json
 *              _tooling/reference/fi-kunta-maakunta.json      (all 2026-09-03)
 *
 * ONE INSTITUTION IS ABSENT, AND NOT BY EDITORIAL CHOICE
 *
 * The register lists 24 universities of applied sciences and this file has 23.
 * Poliisiammattikorkeakoulu (the Police University College) publishes nothing
 * in Studyinfo -- its degrees are open only to Finnish citizens serving in the
 * police -- so the join drops it at the source. The builder asserts that it is
 * the only drop, so a register change cannot quietly remove anything else.
 *
 * `programmes` is REAL DATA, unlike the UK page's `offerRate` placeholder that
 * it replaces: it is the number of English-taught study options the
 * institution has published in Studyinfo, counted by Studyinfo. Read it as
 * breadth of choice for a student who does not speak Finnish. It is NOT a
 * quality score, NOT an enrolment figure and NOT comparable as "size" --
 * institutions itemise their offering at different granularities. A 0 is real
 * and is shown as such: it says that institution currently teaches only in
 * Finnish or Swedish, which is precisely what an international applicant needs
 * to know.
 *
 * `programs` lists the institution's own ISCED broad fields as Studyinfo
 * aggregates them, largest first, under shortened labels (the only editorial
 * step in this file, and it relabels an official classification rather than
 * adding data). Studyinfo's "99 Unknown" bucket is dropped rather than shown.
 *
 * `alt` is searched but never rendered: the register's Finnish and Swedish
 * legal names, its short name, and every campus municipality Studyinfo lists.
 * Finland needs all of it -- "Jyvaskylan ammattikorkeakoulu", "Yrkeshogskolan
 * Novia" and a campus city such as "Mikkeli" are unfindable from the English
 * name alone. No alias is invented.
 *
 * `rank` is a sequential position 1..36. It is meaningful ONLY where `ranked`
 * is true, which is the case for entries 1-12: the Finnish institutions in the
 * **QS World University Rankings: Europe 2026** (published 28 January 2026),
 * in QS order. Finland has exactly 12 entries in that table --
 *      1. Aalto University                                     QS Europe 35
 *      2. University of Helsinki                               QS Europe 47
 *      3. University of Turku                                  QS Europe 138
 *      4. University of Oulu                                   QS Europe 152
 *      5. Tampere University                                   QS Europe 165
 *      6. University of Jyväskylä                              QS Europe 192
 *      7. University of Eastern Finland                        QS Europe =223
 *      8. LUT University                                       QS Europe =230
 *      9. Åbo Akademi University                               QS Europe =288
 *     10. University of Vaasa                                  QS Europe =301
 *     11. Turku University of Applied Sciences                 QS Europe 651-700
 *     12. Jamk University of Applied Sciences                  QS Europe 701-900
 *
 * QS Europe rather than QS World is deliberate. The home-page carousel renders
 * exactly 12 cards, each with a hardcoded "Rank #N" badge, so the ranked block
 * must reach 12 or the page asserts a position an institution does not hold.
 * QS World University Rankings 2027 covers only NINE Finnish universities. The
 * Europe table covers twelve -- and reaches into the UAS sector for two of
 * them, which is why Turku UAS and Jamk are ranked here while Hanken, Lapland
 * and the University of the Arts Helsinki are not. Everything past entry 12 is
 * ordered universities-then-UAS, alphabetically, and carries NO ranking
 * meaning; the UI shows a dash for those rather than a position.
 * ========================================================================== */

window.FI_UNIVERSITIES = [
  { id: "aalto-university", name: "Aalto University", rank: 1, location: "Helsinki, Uusimaa", city: "Helsinki", type: "University", branch: "moec", url: "https://www.aalto.fi/en/", programmes: "127", degrees: 115, programs: "Engineering, ICT, Arts & Humanities, Business & Law, Natural Sciences", fields: "Arts & Humanities | Business & Law | Engineering | ICT | Natural Sciences", alt: "Aalto-yliopisto, Aalto-universitetet, Helsinki, Helsingfors, Uusimaa, Espoo, Esbo", ranked: true },
  { id: "university-of-helsinki", name: "University of Helsinki", rank: 2, location: "Helsinki, Uusimaa", city: "Helsinki", type: "University", branch: "moec", url: "https://www.helsinki.fi/en", programmes: "109", degrees: 76, programs: "Natural Sciences, Arts & Humanities, Social Sciences, Agriculture & Forestry, ICT", fields: "Agriculture & Forestry | Arts & Humanities | Business & Law | Education | Health & Welfare | ICT | Natural Sciences | Social Sciences", alt: "Helsingin yliopisto, Helsingfors universitet, Helsinki, Helsingfors, Uusimaa, Vaasa, Vasa", ranked: true },
  { id: "university-of-turku", name: "University of Turku", rank: 3, location: "Turku, Varsinais-Suomi", city: "Turku", type: "University", branch: "moec", url: "http://www.utu.fi/en/study-at-utu", programmes: "65", degrees: 20, programs: "Natural Sciences, Business & Law, Health & Welfare, Arts & Humanities, Engineering", fields: "Arts & Humanities | Business & Law | Education | Engineering | Health & Welfare | ICT | Natural Sciences | Social Sciences", alt: "Turun yliopisto, Åbo universitet, Turku, Åbo, Varsinais-Suomi, Pori, Björneborg, Rauma, Raumo", ranked: true },
  { id: "university-of-oulu", name: "University of Oulu", rank: 4, location: "Oulu, North Ostrobothnia", city: "Oulu", type: "University", branch: "moec", url: "https://www.oulu.fi/en", programmes: "130", degrees: 38, programs: "ICT, Natural Sciences, Engineering, Business & Law, Education", fields: "Arts & Humanities | Business & Law | Education | Engineering | Health & Welfare | ICT | Natural Sciences | Social Sciences", alt: "Oulun yliopisto, Uleåborgs universitet, Oulu, Uleåborg, Pohjois-Pohjanmaa", ranked: true },
  { id: "tampere-university", name: "Tampere University", rank: 5, location: "Tampere, Pirkanmaa", city: "Tampere", type: "University", branch: "moec", url: "https://www.tuni.fi/en/tau", programmes: "93", degrees: 48, programs: "Engineering, Natural Sciences, ICT, Social Sciences, Arts & Humanities", fields: "Arts & Humanities | Business & Law | Education | Engineering | Health & Welfare | ICT | Natural Sciences | Social Sciences", alt: "Tampereen yliopisto, Tammerfors universitet, Tampere, Tammerfors, Pirkanmaa, Pori, Björneborg, Seinäjoki", ranked: true },
  { id: "university-of-jyvaskyla", name: "University of Jyväskylä", rank: 6, location: "Jyväskylä, Central Finland", city: "Jyväskylä", type: "University", branch: "moec", url: "https://www.jyu.fi/en", programmes: "75", degrees: 31, programs: "Natural Sciences, Business & Law, Education, Arts & Humanities, ICT", fields: "Arts & Humanities | Business & Law | Education | Health & Welfare | ICT | Natural Sciences | Services | Social Sciences", alt: "Jyväskylän yliopisto, Jyväskylä universitet, Jyväskylä, Keski-Suomi, Kokkola, Karleby, Sotkamo", ranked: true },
  { id: "university-of-eastern-finland", name: "University of Eastern Finland", rank: 7, location: "Joensuu, North Karelia", city: "Joensuu", type: "University", branch: "moec", url: "https://www.uef.fi/en", programmes: "152", degrees: 34, programs: "Business & Law, Natural Sciences, Arts & Humanities, Health & Welfare, Education", fields: "Agriculture & Forestry | Arts & Humanities | Business & Law | Education | Health & Welfare | ICT | Natural Sciences | Social Sciences", alt: "Itä-Suomen yliopisto, Östra Finlands Universitet, Joensuu, Pohjois-Karjala, Kuopio", ranked: true },
  { id: "lut-university", name: "LUT University", rank: 8, location: "Lappeenranta, South Karelia", city: "Lappeenranta", type: "University", branch: "moec", url: "https://www.lut.fi/en", programmes: "77", degrees: 61, programs: "Engineering, Natural Sciences, ICT, Business & Law, Social Sciences", fields: "Arts & Humanities | Business & Law | Engineering | ICT | Natural Sciences | Services | Social Sciences", alt: "Lappeenrannan-Lahden teknillinen yliopisto LUT, Lappeenranta-Lahti University of Technology LUT, Lappeenranta, Villmanstrand, Etelä-Karjala, Lahti, Lahtis, Kouvola, Mikkeli, St Michel", ranked: true },
  { id: "abo-akademi-university", name: "Åbo Akademi University", rank: 9, location: "Turku, Varsinais-Suomi", city: "Turku", type: "University", branch: "moec", url: "https://www.abo.fi/en", programmes: "33", degrees: 11, programs: "Arts & Humanities, Social Sciences, ICT, Engineering, Business & Law", fields: "Arts & Humanities | Business & Law | Education | Engineering | Health & Welfare | ICT | Natural Sciences | Social Sciences", alt: "Åbo Akademi, Turku, Åbo, Varsinais-Suomi, Vaasa, Vasa", ranked: true },
  { id: "university-of-vaasa", name: "University of Vaasa", rank: 10, location: "Vaasa, Ostrobothnia", city: "Vaasa", type: "University", branch: "moec", url: "http://www.uwasa.fi/en", programmes: "19", degrees: 12, programs: "Business & Law, Engineering, ICT, Social Sciences, Natural Sciences", fields: "Business & Law | Engineering | ICT | Natural Sciences | Social Sciences", alt: "Vaasan yliopisto, Vasa universitet, Vaasa, Vasa, Pohjanmaa", ranked: true },
  { id: "turku-university-of-applied-sciences", name: "Turku University of Applied Sciences", rank: 11, location: "Turku, Varsinais-Suomi", city: "Turku", type: "University of Applied Sciences", branch: "moec", url: "https://www.turkuamk.fi/en/", programmes: "44", degrees: 39, programs: "Health & Welfare, ICT, Business & Law, Engineering, Natural Sciences", fields: "Business & Law | Engineering | Health & Welfare | ICT | Natural Sciences", alt: "Turun ammattikorkeakoulu, Turku, Åbo, Varsinais-Suomi, Salo, Loimaa", ranked: true },
  { id: "jamk-university-of-applied-sciences", name: "Jamk University of Applied Sciences", rank: 12, location: "Jyväskylä, Central Finland", city: "Jyväskylä", type: "University of Applied Sciences", branch: "moec", url: "https://www.jamk.fi/en/", programmes: "36", degrees: 49, programs: "ICT, Engineering, Business & Law, Health & Welfare, Services", fields: "Business & Law | Engineering | Health & Welfare | ICT | Services", alt: "Jyväskylän ammattikorkeakoulu, Jyväskylä, Keski-Suomi, Saarijärvi", ranked: true },
  { id: "hanken-school-of-economics", name: "Hanken School of Economics", rank: 13, location: "Helsinki, Uusimaa", city: "Helsinki", type: "University", branch: "moec", url: "https://www.hanken.fi/en", programmes: "15", degrees: 10, programs: "Business & Law", fields: "Business & Law", alt: "Svenska handelshögskolan, Helsinki, Helsingfors, Uusimaa, Vaasa, Vasa", ranked: false },
  { id: "university-of-lapland", name: "University of Lapland", rank: 14, location: "Rovaniemi, Lapland", city: "Rovaniemi", type: "University", branch: "moec", url: "https://www.ulapland.fi/EN", programmes: "11", degrees: 6, programs: "Arts & Humanities, Social Sciences, Business & Law, Services, Education", fields: "Arts & Humanities | Business & Law | Education | Services | Social Sciences", alt: "Lapin yliopisto, Rovaniemi, Lappi", ranked: false },
  { id: "university-of-the-arts-helsinki", name: "University of the Arts Helsinki", rank: 15, location: "Helsinki, Uusimaa", city: "Helsinki", type: "University", branch: "moec", url: "https://www.uniarts.fi/en/", programmes: "285", degrees: 32, programs: "Arts & Humanities, Social Sciences, Business & Law", fields: "Arts & Humanities", alt: "Taideyliopisto, Konstuniversitetet, Helsinki, Helsingfors, Uusimaa", ranked: false },
  { id: "arcada-university-of-applied-sciences", name: "Arcada University of Applied Sciences", rank: 16, location: "Helsinki, Uusimaa", city: "Helsinki", type: "University of Applied Sciences", branch: "moec", url: "https://www.arcada.fi/en", programmes: "22", degrees: 25, programs: "Business & Law, Engineering, Health & Welfare, ICT", fields: "Business & Law | Engineering | Health & Welfare | ICT", alt: "Yrkeshögskolan Arcada, Helsinki, Helsingfors, Uusimaa", ranked: false },
  { id: "centria-university-of-applied-sciences", name: "Centria University of Applied Sciences", rank: 17, location: "Kokkola, Central Ostrobothnia", city: "Kokkola", type: "University of Applied Sciences", branch: "moec", url: "http://www.centria.fi", programmes: "18", degrees: 21, programs: "Business & Law, ICT, Engineering, Health & Welfare", fields: "Business & Law | Engineering | Health & Welfare | ICT", alt: "Centria-ammattikorkeakoulu, Kokkola, Karleby, Keski-Pohjanmaa, Pietarsaari, Jakobstad, Ylivieska", ranked: false },
  { id: "diaconia-university-of-applied-sciences", name: "Diaconia University of Applied Sciences", rank: 18, location: "Helsinki, Uusimaa", city: "Helsinki", type: "University of Applied Sciences", branch: "moec", url: "http://www.diak.fi/en", programmes: "2", degrees: 2, programs: "Health & Welfare", fields: "Health & Welfare", alt: "Diakonia-ammattikorkeakoulu, Helsinki, Helsingfors, Uusimaa, Pori, Björneborg, Oulu, Uleåborg, Pieksämäki", ranked: false },
  { id: "haaga-helia-university-of-applied-sciences", name: "Haaga-Helia University of Applied Sciences", rank: 19, location: "Helsinki, Uusimaa", city: "Helsinki", type: "University of Applied Sciences", branch: "moec", url: "https://www.haaga-helia.fi/en", programmes: "28", degrees: 42, programs: "Business & Law, Services, ICT, Education, Health & Welfare", fields: "Business & Law | Health & Welfare | ICT | Services", alt: "Haaga-Helia ammattikorkeakoulu, Haaga-Helia yrkeshögskola, Helsinki, Helsingfors, Uusimaa, Porvoo, Borgå, Heinola, Tampere, Tammerfors", ranked: false },
  { id: "humak-university-of-applied-sciences", name: "Humak University of Applied Sciences", rank: 20, location: "Helsinki, Uusimaa", city: "Helsinki", type: "University of Applied Sciences", branch: "moec", url: "https://www.humak.fi/en/", programmes: "4", degrees: 6, programs: "Arts & Humanities, Health & Welfare", fields: "Arts & Humanities | Health & Welfare", alt: "Humanistinen ammattikorkeakoulu, Helsinki, Helsingfors, Uusimaa, Kuopio, Tampere, Tammerfors, Turku, Åbo, Jyväskylä, Kajaani, Kajana", ranked: false },
  { id: "hame-university-of-applied-sciences", name: "Häme University of Applied Sciences", rank: 21, location: "Hämeenlinna, Kanta-Häme", city: "Hämeenlinna", type: "University of Applied Sciences", branch: "moec", url: "https://www.hamk.fi/?lang=en", programmes: "19", degrees: 17, programs: "ICT, Engineering, Business & Law, Agriculture & Forestry, Education", fields: "Agriculture & Forestry | Arts & Humanities | Business & Law | Engineering | Health & Welfare | ICT | Services", alt: "Hämeen ammattikorkeakoulu, Hämeenlinna, Tavastehus, Kanta-Häme, Valkeakoski, Forssa, Riihimäki, Tammela, Hattula", ranked: false },
  { id: "kajaani-university-of-applied-sciences", name: "Kajaani University of Applied Sciences", rank: 22, location: "Kajaani, Kainuu", city: "Kajaani", type: "University of Applied Sciences", branch: "moec", url: "https://www.kamk.fi/en", programmes: "16", degrees: 21, programs: "Business & Law, ICT, Social Sciences, Health & Welfare, Services", fields: "Business & Law | Engineering | Health & Welfare | ICT | Natural Sciences | Services | Social Sciences", alt: "Kajaanin ammattikorkeakoulu, Kajaani, Kajana, Kainuu, Kuusamo", ranked: false },
  { id: "karelia-university-of-applied-sciences", name: "Karelia University of Applied Sciences", rank: 23, location: "Joensuu, North Karelia", city: "Joensuu", type: "University of Applied Sciences", branch: "moec", url: "https://www.karelia.fi/en/front-page/", programmes: "10", degrees: 8, programs: "Engineering, Business & Law, ICT, Health & Welfare", fields: "Business & Law | Engineering | Health & Welfare | ICT", alt: "Karelia-ammattikorkeakoulu, Joensuu, Pohjois-Karjala", ranked: false },
  { id: "lab-university-of-applied-sciences", name: "LAB University of Applied Sciences", rank: 24, location: "Lahti, Päijät-Häme", city: "Lahti", type: "University of Applied Sciences", branch: "moec", url: "https://www.lab.fi/en", programmes: "40", degrees: 31, programs: "Business & Law, Engineering, ICT, Health & Welfare, Natural Sciences", fields: "Arts & Humanities | Business & Law | Engineering | Health & Welfare | ICT | Natural Sciences | Services", alt: "LAB-ammattikorkeakoulu, Lahti, Lahtis, Päijät-Häme, Lappeenranta, Villmanstrand", ranked: false },
  { id: "lapland-university-of-applied-sciences", name: "Lapland University of Applied Sciences", rank: 25, location: "Rovaniemi, Lapland", city: "Rovaniemi", type: "University of Applied Sciences", branch: "moec", url: "https://lapinamk.fi/en/homepage/", programmes: "10", degrees: 10, programs: "Business & Law, ICT, Health & Welfare, Services", fields: "Business & Law | Health & Welfare | ICT | Services", alt: "Lapin ammattikorkeakoulu, Rovaniemi, Lappi, Kemi, Tornio, Torneå", ranked: false },
  { id: "laurea-university-of-applied-sciences", name: "Laurea University of Applied Sciences", rank: 26, location: "Espoo, Uusimaa", city: "Espoo", type: "University of Applied Sciences", branch: "moec", url: "https://www.laurea.fi/en/", programmes: "70", degrees: 86, programs: "Business & Law, Health & Welfare, Services, ICT", fields: "Business & Law | Health & Welfare | ICT | Services", alt: "Laurea-ammattikorkeakoulu, Espoo, Esbo, Uusimaa, Vantaa, Vanda, Hyvinkää, Hyvinge, Lohja, Lojo, Porvoo, Borgå", ranked: false },
  { id: "metropolia-university-of-applied-sciences", name: "Metropolia University of Applied Sciences", rank: 27, location: "Helsinki, Uusimaa", city: "Helsinki", type: "University of Applied Sciences", branch: "moec", url: "https://www.metropolia.fi/en", programmes: "70", degrees: 92, programs: "Health & Welfare, Engineering, Business & Law, ICT, Arts & Humanities", fields: "Arts & Humanities | Business & Law | Engineering | Health & Welfare | ICT", alt: "Metropolia Ammattikorkeakoulu, Helsinki, Helsingfors, Uusimaa, Vantaa, Vanda, Espoo, Esbo", ranked: false },
  { id: "novia-university-of-applied-sciences", name: "Novia University of Applied Sciences", rank: 28, location: "Vaasa, Ostrobothnia", city: "Vaasa", type: "University of Applied Sciences", branch: "moec", url: "https://www.novia.fi/novia-uas/", programmes: "32", degrees: 48, programs: "Engineering, Business & Law, Natural Sciences, Health & Welfare, Services", fields: "Arts & Humanities | Business & Law | Engineering | Health & Welfare | ICT | Natural Sciences | Services", alt: "Yrkeshögskolan Novia, Vaasa, Vasa, Pohjanmaa, Turku, Åbo, Pietarsaari, Jakobstad, Raasepori, Raseborg", ranked: false },
  { id: "oulu-university-of-applied-sciences", name: "Oulu University of Applied Sciences", rank: 29, location: "Oulu, North Ostrobothnia", city: "Oulu", type: "University of Applied Sciences", branch: "moec", url: "https://www.oamk.fi/en", programmes: "26", degrees: 35, programs: "ICT, Engineering, Health & Welfare, Arts & Humanities, Business & Law", fields: "Arts & Humanities | Business & Law | Engineering | Health & Welfare | ICT | Natural Sciences", alt: "Oulun ammattikorkeakoulu, Oulu, Uleåborg, Pohjois-Pohjanmaa, Oulainen", ranked: false },
  { id: "satakunta-university-of-applied-sciences-samk", name: "Satakunta University of Applied Sciences (SAMK)", rank: 30, location: "Pori, Satakunta", city: "Pori", type: "University of Applied Sciences", branch: "moec", url: "https://www.samk.fi/en/", programmes: "13", degrees: 15, programs: "Services, Business & Law, ICT, Engineering, Health & Welfare", fields: "Business & Law | Engineering | Health & Welfare | ICT | Services", alt: "Satakunnan ammattikorkeakoulu, Satakunta University of Applied Sciences SAMK, Pori, Björneborg, Satakunta, Rauma, Raumo, Kankaanpää, Huittinen", ranked: false },
  { id: "savonia-university-of-applied-sciences", name: "Savonia University of Applied Sciences", rank: 31, location: "Kuopio, Pohjois-Savo", city: "Kuopio", type: "University of Applied Sciences", branch: "moec", url: "http://www.savonia.fi/en", programmes: "10", degrees: 13, programs: "Business & Law, Engineering, Health & Welfare, Natural Sciences, ICT", fields: "Business & Law | Engineering | Health & Welfare | ICT | Natural Sciences | Services", alt: "Savonia-ammattikorkeakoulu, Kuopio, Pohjois-Savo, Varkaus, Iisalmi, Idensalmi", ranked: false },
  { id: "seinajoki-university-of-applied-sciences", name: "Seinäjoki University of Applied Sciences", rank: 32, location: "Seinäjoki, South Ostrobothnia", city: "Seinäjoki", type: "University of Applied Sciences", branch: "moec", url: "http://www.seamk.fi/en", programmes: "11", degrees: 10, programs: "Engineering, Business & Law, Health & Welfare, Services", fields: "Business & Law | Engineering | Health & Welfare | Services", alt: "Seinäjoen ammattikorkeakoulu, Seinäjoki, Etelä-Pohjanmaa", ranked: false },
  { id: "south-eastern-finland-university-of-applied-sciences-xamk", name: "South-Eastern Finland University of Applied Sciences (Xamk)", rank: 33, location: "Kouvola, Kymenlaakso", city: "Kouvola", type: "University of Applied Sciences", branch: "moec", url: "http://www.xamk.fi/en", programmes: "30", degrees: 40, programs: "Arts & Humanities, Business & Law, Health & Welfare, Engineering, ICT", fields: "Arts & Humanities | Business & Law | Engineering | Health & Welfare | ICT | Natural Sciences | Services", alt: "Kaakkois-Suomen ammattikorkeakoulu, South-Eastern Finland University of Applied Sciences Xamk, Kouvola, Kymenlaakso, Mikkeli, St Michel, Savonlinna, Nyslott, Kotka", ranked: false },
  { id: "tampere-university-of-applied-sciences", name: "Tampere University of Applied Sciences", rank: 34, location: "Tampere, Pirkanmaa", city: "Tampere", type: "University of Applied Sciences", branch: "moec", url: "https://www.tuni.fi/en/study-with-us", programmes: "21", degrees: 31, programs: "Business & Law, Engineering, Health & Welfare, ICT, Social Sciences", fields: "Business & Law | Engineering | Health & Welfare | ICT | Natural Sciences | Social Sciences", alt: "Tampereen ammattikorkeakoulu, Tampere, Tammerfors, Pirkanmaa, Jyväskylä, Seinäjoki", ranked: false },
  { id: "vaasa-university-of-applied-sciences", name: "Vaasa University of Applied Sciences", rank: 35, location: "Vaasa, Ostrobothnia", city: "Vaasa", type: "University of Applied Sciences", branch: "moec", url: "https://www.vamk.fi/en/", programmes: "16", degrees: 27, programs: "Business & Law, Engineering, ICT, Health & Welfare", fields: "Business & Law | Engineering | Health & Welfare | ICT", alt: "Vaasan ammattikorkeakoulu, Vaasa, Vasa, Pohjanmaa", ranked: false },
  { id: "aland-university-of-applied-sciences-hogskolan-pa-aland", name: "Åland University of Applied Sciences (Högskolan på Åland)", rank: 36, location: "Mariehamn, Åland", city: "Mariehamn", type: "University of Applied Sciences", branch: "aland", url: "http://www.ha.ax/en", programmes: "1", degrees: 2, programs: "Engineering", fields: "Engineering", alt: "Högskolan på Åland, Maarianhamina, Mariehamn, Ahvenanmaa", ranked: false }
];
