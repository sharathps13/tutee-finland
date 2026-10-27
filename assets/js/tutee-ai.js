/* ==========================================================================
   Tutee AI — the site's built-in answer engine.

   Runs entirely in the browser: no model, no key, no network beyond this
   site's own data files. It answers from three sources, in this order:

     1. Live data — the 36 institutions (universities-data.js) and their
        1,295 English-taught programmes (programmes-data.js), loaded on
        demand: rankings, cities, types, courses by field/level/keyword.
     2. Service data — FI_SERVICES (services-data.js).
     3. A knowledge base written from the page's own copy (KB below), found
        by weighted keyword search with synonyms and light stemming.

   It never invents an answer: below a confidence threshold it says so and
   points to a counsellor. It never quotes a fee or any other money amount.

   API: TuteeAI.answer(text) -> Promise<{ text, chips[] }>
        TuteeAI.render(markdown) -> safe HTML (bold, links, bullet lists)
        TuteeAI.reset()  — forget the conversation context
   ========================================================================== */
(function () {
  'use strict';

  var IS_HOME = !!document.getElementById('home');
  var HOME = IS_HOME ? '' : './index.html';
  function sec(id) { return HOME + '#' + id; }

  /* ------------------------------------------------------------------ *
   * Text helpers
   * ------------------------------------------------------------------ */
  function fold(s) {
    s = String(s == null ? '' : s).toLowerCase();
    if (s.normalize) s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
    return s.replace(/[’'`]/g, '').replace(/[^a-z0-9+#.]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  var STOP = ('a an the and or of to in on at for from by with about into over is are was were be been being am do does did done can could ' +
    'should would will shall may might must i me my mine we us our you your yours it its this that these those there here what which who whom whose ' +
    'how when where why if then than so as not no yes please tell know want like get got give need any some all each more most much many ' +
    'just also too very really kind sort thing things there anything something someone anyone ok okay hi hello hey thanks thank ' +
    'had have has having im ive dont doesnt isnt am let lets could would shall go going way').split(' ');
  var STOPSET = {}; STOP.forEach(function (w) { STOPSET[w] = 1; });
  function stem(w) {
    if (w.length > 5 && /ies$/.test(w)) return w.slice(0, -3) + 'y';
    if (w.length > 5 && /ing$/.test(w)) return w.slice(0, -3);
    if (w.length > 4 && /ed$/.test(w)) return w.slice(0, -2);
    if (w.length > 4 && /es$/.test(w) && !/(ss|us)es$/.test(w)) return w.slice(0, -2);
    if (w.length > 3 && /s$/.test(w) && !/(ss|us|is)$/.test(w)) return w.slice(0, -1);
    return w;
  }
  // Words people use for the same thing, mapped onto the knowledge base's terms.
  var SYN = {
    visa: 'permit', visas: 'permit', residence: 'permit', migri: 'permit', enterfinland: 'permit',
    fee: 'tuition', fees: 'tuition', cost: 'cost', costs: 'cost', price: 'cost', expensive: 'cost', cheap: 'cost', afford: 'cost', money: 'cost', budget: 'cost',
    job: 'work', jobs: 'work', employment: 'work', earn: 'work', earning: 'work', salary: 'work', parttime: 'work',
    pr: 'permanent', citizenship: 'permanent', settle: 'permanent',
    spouse: 'partner', wife: 'partner', husband: 'partner', dependant: 'family', dependent: 'family', dependents: 'family', dependants: 'family',
    kid: 'children', kids: 'children', child: 'children', son: 'children', daughter: 'children',
    uni: 'university', unis: 'university', college: 'university', colleges: 'university', institution: 'university', institutions: 'university', school: 'university',
    polytechnic: 'uas', amk: 'uas', applied: 'uas',
    programme: 'course', programmes: 'course', program: 'course', programs: 'course', degree: 'course', degrees: 'course', courses: 'course', major: 'course',
    scholarship: 'scholarship', scholarships: 'scholarship', grant: 'scholarship', grants: 'scholarship', waiver: 'scholarship', bursary: 'scholarship', funding: 'fund', funds: 'fund', fund: 'fund', finance: 'fund', financial: 'fund',
    loan: 'loan', loans: 'loan', lender: 'loan', lenders: 'loan', bank: 'loan', banks: 'loan',
    house: 'accommodation', housing: 'accommodation', hostel: 'accommodation', dorm: 'accommodation', apartment: 'accommodation', stay: 'accommodation', rent: 'accommodation',
    english: 'language', ielts: 'language', toefl: 'language', pte: 'language', duolingo: 'language', cambridge: 'language', test: 'language', exam: 'language',
    apply: 'application', applying: 'application', admission: 'application', admissions: 'application', studyinfo: 'application', opintopolku: 'application', deadline: 'application', deadlines: 'application', intake: 'intake', intakes: 'intake',
    counsellor: 'counsellor', counselor: 'counsellor', advisor: 'counsellor', adviser: 'counsellor', expert: 'counsellor', consultant: 'counsellor',
    phone: 'contact', call: 'contact', email: 'contact', mail: 'contact', whatsapp: 'contact', number: 'contact', address: 'contact', office: 'contact', offices: 'contact', reach: 'contact',
    weather: 'season', winter: 'season', summer: 'season', autumn: 'season', spring: 'season', snow: 'season', cold: 'season',
    ranking: 'rank', rankings: 'rank', ranked: 'rank', best: 'rank', top: 'rank', qs: 'rank'
  };
  function tokens(s) {
    return fold(s).split(' ').filter(function (w) { return w && !STOPSET[w]; }).map(function (w) { return SYN[w] || stem(w); });
  }
  function has(q, re) { return re.test(q); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function plural(n, a, b) { return n + ' ' + (n === 1 ? a : b); }

  /* Markdown subset -> HTML: **bold**, [text](link), "- " bullets, newlines.
     Links are limited to this site and a few official sources. */
  function render(md) {
    var lines = String(md).split('\n'), out = [], list = false;
    lines.forEach(function (line) {
      var bullet = /^\s*[-•]\s+/.test(line);
      if (bullet && !list) { out.push('<ul>'); list = true; }
      if (!bullet && list) { out.push('</ul>'); list = false; }
      var h = esc(line.replace(/^\s*[-•]\s+/, ''))
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, t, u) {
          u = u.replace(/&amp;/g, '&');
          var local = /^(\.\/|#)/.test(u), official = /^https:\/\/(wa\.me|www\.tuteeconnect\.com)\//.test(u);
          if (!local && !official && !/^(tel|mailto):/.test(u)) return t;
          var uni = /[?&]open=([^&]+)/.exec(u);
          return '<a href="' + esc(u) + '"' + (official ? ' target="_blank" rel="noopener"' : '') +
            (uni ? ' data-ai-uni="' + esc(decodeURIComponent(uni[1])) + '"' : '') + (/^#|index\.html#/.test(u) ? ' data-ai-sec' : '') + '>' + t + '</a>';
        });
      out.push(bullet ? '<li>' + h + '</li>' : (h ? h + '<br>' : '<br>'));
    });
    if (list) out.push('</ul>');
    return out.join('').replace(/(<br>)+$/, '').replace(/<br>(<ul>)/g, '$1').replace(/(<\/ul>)<br>/g, '$1');
  }

  /* ------------------------------------------------------------------ *
   * Data: institutions and programmes, loaded on demand
   * ------------------------------------------------------------------ */
  var dataReady = null;
  function loadScript(src) {
    return new Promise(function (res) {
      var s = document.createElement('script');
      s.src = src; s.async = true; s.onload = res; s.onerror = res;
      document.head.appendChild(s);
    });
  }
  function ensureData() {
    if (dataReady) return dataReady;
    var jobs = [];
    if (!window.FI_UNIVERSITIES) jobs.push(loadScript('./assets/js/universities-data.js'));
    if (!window.FI_PROGRAMMES) jobs.push(loadScript('./assets/js/programmes-data.js'));
    dataReady = Promise.all(jobs).then(buildIndex);
    return dataReady;
  }
  var UNIS = [], PROGS = [], ALIAS = [], CITIES = {};
  // Everyday short names, on top of the official and Finnish/Swedish names in the data.
  var SHORT = {
    'aalto-university': ['aalto'], 'university-of-helsinki': ['uh', 'helsinki uni', 'university of helsinki', 'helsingin yliopisto'],
    'university-of-turku': ['utu', 'turku university', 'turun yliopisto'], 'university-of-oulu': ['oulu university', 'oulun yliopisto'],
    'tampere-university': ['tampere university', 'tuni', 'tampereen yliopisto'], 'university-of-jyvaskyla': ['jyu', 'jyvaskyla university'],
    'university-of-eastern-finland': ['uef', 'eastern finland'], 'lut-university': ['lut', 'lappeenranta university'],
    'abo-akademi-university': ['abo akademi', 'abo'], 'university-of-vaasa': ['uwasa', 'vaasa university'],
    'turku-university-of-applied-sciences': ['turku uas', 'tuas', 'turun ammattikorkeakoulu'], 'jamk-university-of-applied-sciences': ['jamk'],
    'hanken-school-of-economics': ['hanken'], 'university-of-lapland': ['lapland university', 'lapin yliopisto', 'ulapland'],
    'university-of-the-arts-helsinki': ['uniarts', 'arts helsinki', 'taideyliopisto'], 'arcada-university-of-applied-sciences': ['arcada'],
    'centria-university-of-applied-sciences': ['centria'], 'diaconia-university-of-applied-sciences': ['diak', 'diaconia'],
    'haaga-helia-university-of-applied-sciences': ['haaga helia', 'haaga-helia'], 'humak-university-of-applied-sciences': ['humak'],
    'hame-university-of-applied-sciences': ['hamk', 'hame uas'], 'kajaani-university-of-applied-sciences': ['kamk', 'kajaani uas'],
    'karelia-university-of-applied-sciences': ['karelia'], 'lab-university-of-applied-sciences': ['lab uas', 'lab university'],
    'lapland-university-of-applied-sciences': ['lapland uas', 'lapin amk'], 'laurea-university-of-applied-sciences': ['laurea'],
    'metropolia-university-of-applied-sciences': ['metropolia'], 'novia-university-of-applied-sciences': ['novia'],
    'oulu-university-of-applied-sciences': ['oamk', 'oulu uas'], 'satakunta-university-of-applied-sciences-samk': ['samk', 'satakunta'],
    'savonia-university-of-applied-sciences': ['savonia'], 'seinajoki-university-of-applied-sciences': ['seamk', 'seinajoki uas'],
    'south-eastern-finland-university-of-applied-sciences-xamk': ['xamk'], 'tampere-university-of-applied-sciences': ['tamk', 'tampere uas'],
    'vaasa-university-of-applied-sciences': ['vamk', 'vaasa uas'], 'aland-university-of-applied-sciences-hogskolan-pa-aland': ['aland', 'hogskolan pa aland', 'aland uas']
  };
  function isUas(u) { return /applied/i.test(u.type || ''); }
  function buildIndex() {
    UNIS = (window.FI_UNIVERSITIES || []).slice();
    var P = window.FI_PROGRAMMES || {};
    PROGS = [];
    UNIS.forEach(function (u) {
      (P[u.id] || []).forEach(function (p) {
        PROGS.push({ u: u, n: p.n, lvl: p.lvl, fld: p.fld || '', city: p.city || u.city, dur: p.dur, sch: !!p.sch, url: p.url, f: fold(p.n + ' ' + p.fld), nf: fold(p.n) });
      });
      // Aliases: the full name, everyday short names, and the data's other names
      // (dropping plain place names such as "Helsinki", which would collide with cities).
      var names = [u.name, u.name.replace(/\s*\(.*\)/, '')].concat(SHORT[u.id] || []);
      String(u.alt || '').split(/\s*,\s*/).forEach(function (a) { if (/yliopisto|universitet|ammattikorkeakoulu|hogskola|högskola|akademi/i.test(a)) names.push(a); });
      names.forEach(function (n) { var f = fold(n); if (f.length > 2) ALIAS.push({ f: f, u: u }); });
      if (u.city) CITIES[fold(u.city)] = u.city;
    });
    PROGS.forEach(function (p) { if (p.city) CITIES[fold(p.city)] = p.city; });
    ALIAS.sort(function (a, b) { return b.f.length - a.f.length; });
  }
  function findUni(q) {
    var padded = ' ' + q + ' ';
    for (var i = 0; i < ALIAS.length; i++) if (padded.indexOf(' ' + ALIAS[i].f + ' ') > -1) return ALIAS[i].u;
    return null;
  }
  function findCity(q) {
    var padded = ' ' + q + ' ', best = '';
    Object.keys(CITIES).forEach(function (c) { if (c.length > 2 && padded.indexOf(' ' + c + ' ') > -1 && c.length > best.length) best = c; });
    // Region names that are not cities in the data.
    if (!best && / lapland /.test(padded)) return 'Rovaniemi';
    return best ? CITIES[best] : '';
  }
  function uniLink(u) { return '[' + u.name + '](./universities.html?open=' + encodeURIComponent(u.id) + ')'; }
  function progsOf(u) { return PROGS.filter(function (p) { return p.u === u; }); }
  function citiesOf(u) {
    var c = {}; progsOf(u).forEach(function (p) { if (p.city) c[p.city] = 1; });
    if (!Object.keys(c).length) c[u.city] = 1;
    return Object.keys(c);
  }
  function fieldsOf(u) { return String(u.fields || u.programs || '').split(/\s*[|,]\s*/).filter(Boolean); }

  /* Study fields and the words people use for them (matched against the
     programme's own name and ISCED field). */
  var FIELD_WORDS = [
    [/\b(computer|computing|software|cs|ict|informatics|data science|data|artificial intelligence|ai|machine learning|cyber|game|games|coding|programming)\b/, ['ict', 'computer', 'software', 'data', 'information', 'game', 'cyber', 'artificial', 'intelligence', 'digital']],
    [/\b(business|management|mba|marketing|finance|economics|accounting|commerce|entrepreneur\w*|logistics|tourism|hospitality)\b/, ['business', 'management', 'economics', 'marketing', 'finance', 'accounting', 'administration', 'logistics', 'tourism', 'hospitality', 'entrepreneur']],
    [/\b(engineering|engineer|mechanical|electrical|civil|energy|automation|robotics|construction|chemical)\b/, ['engineering', 'mechanical', 'electrical', 'energy', 'automation', 'robotics', 'construction', 'chemical', 'technology']],
    [/\b(nursing|nurse|health|healthcare|medicine|medical|physiotherapy|social work|pharmacy|public health|midwife\w*)\b/, ['health', 'nursing', 'care', 'medical', 'welfare', 'physiotherapy', 'social', 'pharmacy', 'midwif']],
    [/\b(art|arts|design|music|film|media|architecture|fashion|theatre|dance|animation)\b/, ['art', 'design', 'music', 'film', 'media', 'architecture', 'fashion', 'theatre', 'dance', 'animation']],
    [/\b(education|teacher|teaching|pedagogy)\b/, ['education', 'teach', 'pedagog', 'learning']],
    [/\b(biology|chemistry|physics|mathematics|maths|math|science|sciences|environment\w*|geography|forestry|agriculture|food)\b/, ['science', 'biology', 'chemistry', 'physics', 'mathematic', 'environment', 'forest', 'agricultur', 'food']],
    [/\b(law|legal|politics|political|international relations|sociology|psychology|social sciences|history|languages|linguistics|humanities|philosophy)\b/, ['law', 'politic', 'international', 'sociolog', 'psycholog', 'social', 'history', 'language', 'linguistic', 'humanities', 'philosophy']]
  ];
  var COURSE_HINT = /\b(course|courses|programme|programmes|program|programs|degree|degrees|study|studies|major|bachelor\w*|master\w*|msc|mba|ma|ba|bsc|phd|doctora\w*|offer|offers|teach|teaches)\b/;
  function levelOf(q) {
    if (/\b(phd|doctora\w*|doctorate)\b/.test(q)) return 'doctoral';
    if (/\b(master\w*|msc|mba|postgrad\w*|pg)\b/.test(q)) return 'master';
    if (/\b(bachelor\w*|bsc|undergrad\w*|ug)\b/.test(q)) return 'bachelor';
    return '';
  }
  function lvlMatch(p, k) {
    if (!k) return true;
    if (k === 'bachelor') return /bachelor/i.test(p.lvl);
    if (k === 'master') return /master/i.test(p.lvl);
    return /doctoral/i.test(p.lvl);
  }
  var QUERY_NOISE = /\b(course|courses|programme|programmes|program|programs|degree|degrees|study|studies|studying|major|bachelor\w*|master\w*|msc|ma|ba|bsc|phd|doctora\w*|doctorate|university|universities|uni|unis|college|colleges|institution\w*|uas|applied|offer\w*|teach\w*|available|find|show|list|which|what|where|options?|english|taught|in|at|for|of|the|a|an|me|i|want|to|with|scholarship\w*|finland|finnish|can|do|does|is|are|there|any|good|best|top|some|and|or|on|about|it|its|they|them|their|this|that|these|those|have|has|give|gives|got|get|ranked|rank|how|many|much|tell|more|please|courses?)\b/g;
  function courseTerms(q, uni, city) {
    var rest = q;
    if (uni) ALIAS.forEach(function (a) { if (a.u === uni) rest = (' ' + rest + ' ').split(' ' + a.f + ' ').join(' '); });
    if (city) rest = rest.split(fold(city)).join(' ');
    if (city === 'Rovaniemi') rest = rest.replace(/\blapland\b/g, ' ');
    return rest.replace(QUERY_NOISE, ' ').replace(/\s+/g, ' ').trim();
  }
  function searchProgs(q, opts) {
    opts = opts || {};
    var lvl = levelOf(q), sch = /\bscholarship/.test(q);
    var terms = courseTerms(q, opts.uni, opts.city);
    var fieldStems = [];
    FIELD_WORDS.forEach(function (fw) { if (fw[0].test(q)) fieldStems = fieldStems.concat(fw[1]); });
    var words = terms ? terms.split(' ').filter(function (w) { return w.length > 1; }).map(stem) : [];
    var rows = PROGS.filter(function (p) {
      if (opts.uni && p.u !== opts.uni) return false;
      if (opts.city && fold(p.city) !== fold(opts.city)) return false;
      if (!lvlMatch(p, lvl)) return false;
      if (sch && !p.sch) return false;
      return true;
    });
    var broad = false;
    if (words.length) {
      var exact = rows.filter(function (p) { return words.every(function (w) { return p.nf.indexOf(w) > -1; }); });
      if (exact.length || !fieldStems.length) rows = exact;
      else broad = true;
    }
    if ((!words.length || broad) && fieldStems.length) {
      rows = rows.map(function (p) {
        var s = 0;
        fieldStems.forEach(function (w) { if (p.f.indexOf(w) > -1) s += 1; });
        return { p: p, s: s };
      }).filter(function (x) { return x.s > 0; }).map(function (x) { return x.p; });
    }
    rows.sort(function (a, b) { return (a.u.rank || 99) - (b.u.rank || 99); });
    return { rows: rows, lvl: lvl, sch: sch, terms: terms, broad: broad };
  }
  function years(dur) {
    var m = parseInt(dur, 10);
    if (!m || m > 96) return '';
    if (m % 12 === 0) return (m / 12) + (m === 12 ? ' year' : ' years');
    if (m % 6 === 0) return (m / 12) + ' years';
    return m + ' months';
  }
  function progLine(p, withUni) {
    var name = String(p.n).replace(/\s*\((\d+(?:[.,]\d+)?)\s*yrs?\)\s*$/, '');
    var meta = [p.lvl, withUni ? p.u.name : '', p.city, years(p.dur)].filter(Boolean).join(' · ');
    return '- **' + name + '** — ' + meta + (p.sch ? ' · scholarship available' : '');
  }
  function dirLink(q) { return '[Search them all in the directory](./universities.html' + (q ? '?q=' + encodeURIComponent(q) : '') + ')'; }

  /* ------------------------------------------------------------------ *
   * Knowledge base — written from the page's own copy
   * ------------------------------------------------------------------ */
  var KB = [
    { id: 'permit', t: 'Residence permit for studies', k: 'permit visa a permit enter finland migri d visa apply application biometrics mission interview insurance process how documents',
      a: "Finland issues a **residence permit for studies**, not a student visa — and a degree student gets a **continuous A permit for the whole length of the degree**.\n\nHow it works once you accept your place:\n- Apply on **Enter Finland** and pay the processing fee\n- Show that you have the **funds Migri requires** for your living costs\n- Take out **private health insurance** that meets Migri's coverage rules\n- Identify yourself in person at a **Finnish mission**\n- Ask for the **D visa** in the same application so you can fly before the permit card arrives\n\nThere is **no credibility interview** and **no health surcharge**. Tutee Connect has a **99% permit success rate** and guides you through every step.",
      c: ['Can I work while studying?', 'Can my family come with me?', 'What happens after I graduate?'], s: 'faq' },
    { id: 'dvisa', t: 'D visa', k: 'd visa travel early fly before card arrives',
      a: "Ask for the **D visa** in the same Enter Finland application as your study permit. It goes into your passport with the decision, so you can **travel to Finland before your residence permit card arrives**.",
      c: ['How does the residence permit work?'], s: 'relocate' },
    { id: 'insurance', t: 'Health insurance', k: 'insurance health medical cover surcharge',
      a: "For the study permit you take out **private health insurance that meets Migri's coverage rules**. There is **no health surcharge** in Finland. Your counsellor checks the policy against Migri's requirements before you file.",
      c: ['How does the residence permit work?'], s: 'faq' },
    { id: 'requirements', t: 'Basic requirements to study in Finland', k: 'requirement requirements eligibility eligible need documents admission criteria qualify gpa marks transcripts passport reference motivation letter',
      a: "To study in Finland you typically need:\n- A **valid passport**\n- Strong **academic transcripts**\n- **Proof of English** (see the tests below)\n- **Academic references**\n- A compelling **motivation letter**\n\nMany bachelor programmes also set an **entrance examination**, and some MBAs ask for a **GMAT** score or work experience. Each institution publishes its own requirements, and we check them programme by programme.",
      c: ['Which English tests are accepted?', 'How do I apply?'], s: 'faq' },
    { id: 'language', t: 'English tests and language requirements', k: 'language english ielts toefl pte duolingo cambridge c1 c2 gmat test score requirement proficiency finnish swedish',
      a: "English tests are an **admission** matter in Finland — **Migri sets no language requirement for the residence permit**.\n\n- **Accepted across Finnish higher education:** IELTS Academic, TOEFL iBT, PTE Academic, Cambridge C1 Advanced and C2 Proficiency\n- **Duolingo English Test:** accepted by some institutions and not others — check the programme before you book it\n- Many bachelor programmes set an **entrance examination**; some MBAs ask for **GMAT** or work experience\n\nFinnish or Swedish only matters later, for the fast route to **permanent residence**. Our **Language Test** service prepares you for IELTS, TOEFL, PTE and Cambridge with mock tests and free materials.",
      c: ['Tell me about the Language Test service', 'What are the basic requirements?'], s: 'faq' },
    { id: 'work', t: 'Working while you study', k: 'work part time job while studying hours week earn summer full time allowance permit student',
      a: "Yes. Your study permit lets you work an **average of 30 hours a week in any field**, with **no separate work permit**. The 30 hours are **averaged across the year**, so many students work **full time over the summer**.\n\nOur team sets up your CV and job search for the Finnish market and sorts your tax card and bank account on arrival — most of our students start work within their **first 30 days**.",
      c: ['What happens after I graduate?', 'How can I fund my studies?'], s: 'relocate' },
    { id: 'postgrad', t: 'Staying after graduation', k: 'after graduation graduate graduating stay job search permit look for work start business post study two years 2 years sponsor career',
      a: "After you graduate you can apply for a **residence permit to look for work or start a business**, granted for **up to two years** with **no sponsorship requirement**.\n\n- You may take it in **up to three parts**\n- You can apply **any time within five years** of your student permit expiring — so going home first doesn't lose it\n- Once you find work, you move on to a **work-based permit**",
      c: ['How do I get permanent residence?', 'Can I work while studying?'], s: 'relocate' },
    { id: 'pr', t: 'Permanent residence', k: 'permanent residence pr settle citizenship six years 6 years finnish swedish degree language route',
      a: "There are two routes to **permanent residence**:\n- After **six years** of continuous residence, or\n- With **no residence-period requirement at all** once you hold a **Finnish degree** and the required level of **Finnish or Swedish**\n\nA degree completed in Finland is therefore its own route to permanent residence.",
      c: ['What happens after I graduate?', 'Show me the full journey'], s: 'relocate' },
    { id: 'scholarships', t: 'Scholarships', k: 'scholarship scholarships finland scholarship tuition fee waiver free funding merit 100% 50% relocation grant doctoral',
      a: "Finland funds international students well:\n- **Finland Scholarship** — **100% of first-year tuition plus a relocation grant**, for non-EU/EEA master's entrants at participating institutions\n- **Tuition-fee scholarships** — **50–100% of tuition**, awarded by most universities and UAS **in the admission decision itself**, often renewable\n- **Doctoral study** — **no tuition fee** at all; many researchers are employed or grant-funded\n\nMost students combine two or three ways to fund their degree. Try the [funding plan builder](" + sec('scholarships') + ") and we'll help you secure each one.",
      c: ['Which master’s courses offer a scholarship?', 'Tell me about education loans', 'Can I work while studying?'], s: 'scholarships' },
    { id: 'loans', t: 'Education loans', k: 'loan loans lender lenders bank collateral non collateral interest finance partner partners icici hdfc credila idfc incred auxilo avanse union axis prodigy mpower',
      a: "Yes — we have tie-ups with **10 partner lenders** for both **collateral and non-collateral** education loans, which can cover **tuition, housing and living costs**.\n\nOur loan partners: **ICICI Bank, HDFC Credila, IDFC First Bank, InCred, Auxilo, Avanse, Union Bank, Prodigy Finance, Axis Bank and MPOWER Financing**.\n\nOur **Financial AID** service compares offers and prepares your loan file with you.",
      c: ['What scholarships are there?', 'How can I fund my studies?'], s: 'scholarships' },
    { id: 'costs', t: 'Tuition fees and costs', k: 'cost tuition fee fees price expensive cheap afford budget living expenses how much money euro',
      a: "Tuition depends on the **institution and the programme**, so we don't quote a single figure — your counsellor builds an **exact budget** with you for the programmes you shortlist.\n\nWhat helps:\n- **Doctoral study carries no tuition fee**\n- The **Finland Scholarship** and **50–100% tuition-fee scholarships** cut tuition substantially\n- **Education loans** from our 10 partner lenders can cover tuition, housing and living costs\n- You can **work an average of 30 hours a week** to cover everyday costs\n\nFor the permit, Migri also asks you to show that you can cover your **living costs**.",
      c: ['What scholarships are there?', 'Tell me about education loans', 'Evaluate my profile'], s: 'scholarships' },
    { id: 'fundplan', t: 'Funding plan builder', k: 'funding plan builder combine sources switch cover tuition relocation housing everyday living',
      a: "The [funding plan builder](" + sec('scholarships') + ") lets you switch funding sources on and watch your four degree costs — **tuition, relocation, housing and everyday living** — get covered:\n- **Finland Scholarship** → tuition and relocation\n- **Tuition-fee scholarships** → tuition\n- **Doctoral study** → no tuition fee\n- **Work while you study** → everyday living\n- **Education loans** → tuition, housing and everyday living\n\nPress **Get my funding plan** and we'll help you secure each one.",
      c: ['What scholarships are there?', 'Tell me about education loans'], s: 'scholarships' },
    { id: 'family', t: 'Bringing your family', k: 'family partner spouse children kids relocate bring dependent dependents together wife husband',
      a: "Yes — Finland is unusually generous here. Your **spouse or registered partner** and your **children under 18** can get a residence permit on the basis of **family ties** while you study.\n\n- **Partner:** an **unrestricted right to work from day one**, in any field, with no separate work permit\n- **Children:** **free basic education and free school meals**, and forests and lakes open to all under the everyman's right\n- **Funds:** on top of your own, Migri asks you to show a set monthly amount for each family member\n\nHow it works: you're admitted and apply for your own A permit → your partner and children apply on the basis of family ties → you arrive together. We plan your family's permits, documents and funds as **one application**.",
      c: ['Tell me about the Family Migration service', 'Can my partner work?'], s: 'family' },
    { id: 'partnerwork', t: 'Your partner working', k: 'partner spouse wife husband work job career right to work',
      a: "Yes. A spouse or registered partner on a family-ties permit has an **unrestricted right to work from day one** — in **any job**, with **no separate work permit** — so their career keeps moving while you study. They apply **alongside your own application**.",
      c: ['Can my children come too?', 'Bringing your family'], s: 'family' },
    { id: 'children', t: 'Your children', k: 'children kids child school education under 18 son daughter',
      a: "Children **under 18** can join you on a **family permit**. **Basic education is free**, **school meals are free**, and forests and lakes are open to everyone under the **everyman's right**. We help with school places and registration on arrival.",
      c: ['Can my partner work?', 'Bringing your family'], s: 'family' },
    { id: 'happiness', t: 'Happiness and quality of life', k: 'happy happiest happiness quality of life safe safety life lifestyle report',
      a: "Finland has topped the **World Happiness Report every year from 2018 to 2026** \u2014 nine years in a row. It's one of the most family-friendly places to study, with free basic education, open nature under the everyman's right, and campuses and transport that run smoothly all winter.",
      c: ['Why study in Finland?', 'Bringing your family'], s: 'why' },
    { id: 'facts', t: 'Fun facts about Finland', k: 'fact facts fun interesting did you know lakes forest sauna saunas midnight sun women vote roam nature',
      a: "A few things that make Finland special:\n- **Happiest country in the world** in the World Happiness Report every year from 2018 to 2026.\n- About **188,000 lakes**, and forest over roughly **75%** of the land.\n- In 1906 it became the **first country to give women full political rights** \u2014 the vote and the right to stand for parliament.\n- Around **3 million saunas** for 5.6 million people.\n- In Lapland the **sun doesn't set for about two months** each summer.\n- **Everyone's right** lets anyone walk, camp and pick berries in nature.",
      c: ['Why study in Finland?', 'Happiness and quality of life'], s: 'why' },
    { id: 'accommodation', t: 'Accommodation and pre-departure', k: 'accommodation housing hostel dorm apartment hoas rent where to live pre departure briefing arrival identity code',
      a: "Yes — we partner with top student housing providers, including **HOAS** and the other student housing foundations. They have **waiting lists you should join the day you accept your place**.\n\nWe also run **pre-departure briefings** on Finnish culture, academic expectations, dressing for a Nordic winter, and registering for your **personal identity code** once you land.",
      c: ['Tell me about Post-Landing support', 'Can I work while studying?'], s: 'faq' },
    { id: 'apply', t: 'How to apply', k: 'apply application how studyinfo opintopolku joint application motivation letter shortlist process steps admission offer accept',
      a: "Applications go through **Studyinfo (Opintopolku)**, Finland's national application service.\n\n1. **Shortlist & apply** — we shortlist programmes that fit your profile and prepare your Studyinfo application, motivation letter and documents\n2. **Admission & scholarship** — offers usually arrive with the institution's scholarship decision; we help you compare them and accept the right one\n3. **Residence permit** — apply on Enter Finland for a continuous A permit\n\nStart with a [free evaluation](" + sec('contact') + ") and a counsellor will map your route.",
      c: ['Show me the full journey', 'What are the basic requirements?', 'Evaluate my profile'], s: 'relocate' },
    { id: 'intake', t: 'Intakes and timing', k: 'intake intakes when start september autumn january spring timeline deadline semester term',
      a: "Finnish degrees mainly start in the **autumn intake** — term begins as the forests turn red and gold, around **September**. Applications run through **Studyinfo** months before that, and each programme sets its own application period.\n\nTell us when you'd like to start in the [free evaluation](" + sec('contact') + ") (next available intake, within 12 months, or later) and your counsellor will send a **route map with your permit timeline**.",
      c: ['How do I apply?', 'Evaluate my profile'], s: 'contact' },
    { id: 'journey', t: 'Your journey in six milestones', k: 'journey steps milestones route roadmap process timeline from first application to permanent resident',
      a: "From first application to permanent resident, in six milestones:\n1. **Plan** — Shortlist & apply (Studyinfo application, motivation letter, documents)\n2. **Admission** — Offers and scholarship decisions compared\n3. **Permit** — Continuous A permit on Enter Finland, D visa to fly early, no credibility interview\n4. **Arrival** — Housing, registration and identity code; work 30 h a week\n5. **Career** — Up to 2 years to look for work or start a business, no sponsor\n6. **Settle** — Permanent residence after 6 years, or sooner with a Finnish degree + Finnish/Swedish\n\nSee it on the [journey map](" + sec('relocate') + ").",
      c: ['How does the residence permit work?', 'What happens after I graduate?'], s: 'relocate' },
    { id: 'whyfinland', t: 'Why study in Finland', k: 'why finland reasons benefits advantages good choose study abroad',
      a: "Six sides of Finland that students love:\n- **Happiness:** the **happiest country in the world** in the World Happiness Report every year from **2018 to 2026**\n- **Education:** **12 institutions** in the QS Europe 2026 rankings and **600+** programmes taught in English\n- **Work:** your permit lets you work **30 h a week on average**, so many students work full time over the summer\n- **Career:** after graduating you can get up to **2 years** to look for work or start a business\n- **Nature:** about **188,000 lakes**, and everyman's right lets anyone walk, camp and pick berries in nature\n- **Equality:** in **1906** Finland became the first country to give women full political rights",
      c: ['Show me the top ranked universities', 'Student life in Finland'], s: 'why' },
    { id: 'studentlife', t: 'Student life', k: 'student life culture seasons season winter spring summer autumn year vappu sauna saunas skating ski festival tutor groups student unions events everyman right nature lakes forests ruska northern lights aurora midnight sun juhannus',
      a: "Student life in Finland follows the seasons:\n- **Winter:** saunas, skating and ski trails in every campus town, and the northern lights over Lapland\n- **Spring:** on **1 May** students wear white caps for **Vappu**, Finland's biggest student celebration; student unions host events all year\n- **Summer:** up to **24 hours of daylight** in Lapland, summer jobs, and the **everyman's right** to roam forests and lakes\n- **Autumn:** term starts with **ruska**, as the forests turn gold, and tutor groups help every newcomer settle in",
      c: ['Why study in Finland?', 'Accommodation'], s: 'why' },
    { id: 'weather', t: 'Weather and seasons', k: 'weather season seasons winter summer autumn spring cold snow dark daylight climate ruska revontulet aurora northern lights yoton yo midnight sun',
      a: "Finland has four distinct seasons:\n- **Autumn (Sep–Nov):** ruska — the forests turn red and gold as term starts\n- **Winter (Dec–Feb):** snow and northern lights; campuses and transport run smoothly all winter\n- **Spring (Mar–May):** the snow melts and students celebrate Vappu\n- **Summer (Jun–Aug):** the midnight sun, and many students work full time\n\nOur pre-departure briefings include dressing for a Nordic winter.",
      c: ['Student life', 'Why study in Finland?'], s: 'why' },
    { id: 'uas', t: 'Universities vs universities of applied sciences', k: 'difference between university uas applied sciences polytechnic amk vs versus compare type research practical',
      a: "Finland has two kinds of higher education institution:\n- **Universities** — research-based, offering bachelor's, master's and doctoral degrees\n- **Universities of applied sciences (UAS)** — practical, working-life oriented degrees, including professional master's for people with work experience\n\nThe directory lists **13 universities and 23 universities of applied sciences** (36 in all). You can filter by type on the [universities page](./universities.html).",
      c: ['How many universities are there?', 'Show me the top ranked universities'], s: '' },
    { id: 'aboutus', t: 'About Tutee Connect', k: 'tutee connect who are you company about agency consultancy trust reliable success rate experience genuine',
      a: "**Tutee Connect** gives study-abroad and immigration advice to students who want to study, work and settle overseas — one expert team from first application to your first job.\n\n- **99% permit success rate**\n- **Free profile evaluation**, with a reply within **1 working day**\n- **9 services** from career consultation to post-landing support\n- Offices in **Chennai** and **Dubai**\n- Rated **5/5** by our students and parents",
      c: ['What services do you offer?', 'How can I contact you?'], s: '' },
    { id: 'destinations', t: 'Other study destinations', k: 'other countries destinations study abroad help',
      a: "Besides Finland, Tutee Connect helps students study in **Singapore, the USA, the UK, Canada, Australia, New Zealand, Ireland, Germany, France, Poland, Malaysia, the UAE and Mauritius**. Ask a counsellor about any of them.",
      c: ['How can I contact you?'], s: '' },
    { id: 'contact', t: 'Contact Tutee Connect', k: 'contact phone call number email whatsapp website office address reach talk human chennai dubai',
      a: "You can reach us any of these ways:\n- **WhatsApp:** [+91 73583 64959](https://wa.me/917358364959)\n- **Call:** [+91 73583 64959](tel:+917358364959)\n- **Email:** [info@tuteeconnect.com](mailto:info@tuteeconnect.com)\n- **Website:** [www.tuteeconnect.com](https://www.tuteeconnect.com/)\n- **Offices:** Chennai — 1st Floor, ALA Corner Complex, Virugambakkam · Dubai — Tutee Connect LLC FZ, Meydan Grandstand\n\nWe reply within **one working day**.",
      c: ['Evaluate my profile'], s: 'contact' },
    { id: 'evaluation', t: 'Free profile evaluation', k: 'free evaluation evaluate consultation assessment profile route map form book appointment counsellor reply respond response how fast soon quick working day',
      a: "The **free evaluation** takes two quick steps, under a minute: tell us what you're aiming for and when you'd like to start, then where to send your route map. A counsellor replies within **one working day** with a **route map** — institutions, scholarships and your permit timeline.\n\n[Open the evaluation form](" + sec('contact') + "), or I can take your details right here.",
      c: ['Evaluate my profile'], s: 'contact' },
    { id: 'shortlist', t: 'Shortlisting universities', k: 'shortlist heart save favourite favorite compare list my universities',
      a: "Tap the **heart** on any university — on a postcard here or in the [universities directory](./universities.html) — to add it to your **shortlist** (up to 12). Your shortlist is saved on your device and **carried straight into the evaluation form**, so your counsellor sees exactly which institutions you're interested in.",
      c: ['Show me the top ranked universities', 'Evaluate my profile'], s: 'universities' },
    { id: 'directory', t: 'Using the universities directory', k: 'directory search filter filters page all 36 institutions list browse find',
      a: "The [universities directory](./universities.html) lists all **36 institutions**. You can:\n- **Search** by university, course or city\n- **Browse by campus city** with the photo row\n- Use **Filters** for institution type, study field and sort order\n- Open any university for its details and **all its English-taught courses**, then shortlist it\n\nOr just ask me — e.g. *\"master's in data science\"* or *\"universities in Tampere\"*.",
      c: ['Master’s in computer science', 'Universities in Helsinki'], s: '' },
    { id: 'reviews', t: 'Student reviews', k: 'review reviews testimonial testimonials rating feedback experience students say',
      a: "We're rated **5/5 by our students and parents**. A few of their words:\n- *\"My residence permit was approved in the very first attempt!\"* — Priya K., Master's student, Helsinki\n- *\"I had a previous visa refusal… my coordinator completely turned it around.\"* — Sneha R., Turku\n- *\"The post-landing support for getting my accommodation in Tampere was a lifesaver.\"* — Vishal M., Tampere\n- *\"I actually got a full tuition waiver!\"* — Siddharth J., PhD student, Kuopio\n\nRead more in [Student stories](" + sec('testimonials') + ").",
      c: ['What services do you offer?'], s: 'testimonials' },
    { id: 'refusal', t: 'Previous visa refusal', k: 'refusal refused rejected rejection previous visa denied gap complicated profile backlog',
      a: "A previous refusal or a complicated profile doesn't rule you out. Our coordinators have turned such cases around by rebuilding the documentation carefully — one parent wrote that *\"despite his complicated profile, the team made this happen\"*. Share your situation in a [free evaluation](" + sec('contact') + ") and a counsellor will review it honestly.",
      c: ['Evaluate my profile', 'How does the residence permit work?'], s: 'contact' },
    { id: 'doctoral', t: 'Doctoral study', k: 'phd doctoral doctorate research researcher funded tuition free',
      a: "**Doctoral study in Finland carries no tuition fee**, and many researchers are **employed or grant-funded**. Ask me for doctoral courses in a field — e.g. *\"PhD in physics\"* — or browse them in the [directory](./universities.html).",
      c: ['PhD in computer science', 'What scholarships are there?'], s: 'scholarships' },
    { id: 'ai', t: 'About Tutee AI', k: 'who are you what are you bot ai chatbot tutee ai human robot',
      a: "I'm **Tutee AI**, the site's built-in assistant. I can answer questions about studying in Finland — **permits, funding, work, family, life in Finland** — and search all **36 institutions and 1,295 English-taught course listings** for you. For anything personal, a human counsellor takes over.",
      c: ['Master’s in computer science', 'What scholarships are there?', 'Evaluate my profile'], s: '' },
    { id: 'sources', t: 'Where the information comes from', k: 'source sources data accurate official studyinfo oph qs ranking ministry',
      a: "Every institution and programme comes from **Studyinfo (Opintopolku)**, the national application service, and the **Finnish National Agency for Education** organisation register. Rankings are Finland's positions in the **QS World University Rankings: Europe 2026**. National context comes from **Study in Finland**.",
      c: ['Show me the top ranked universities'], s: '' }
  ];

  /* Build a search index over the KB: weighted terms with IDF. */
  var DF = {}, KBI = [];
  KB.forEach(function (e) {
    var w = {};
    tokens(e.t).forEach(function (x) { w[x] = (w[x] || 0) + 3; });
    tokens(e.k).forEach(function (x) { w[x] = (w[x] || 0) + 2; });
    tokens(e.a.replace(/\[[^\]]*\]\([^)]*\)/g, ' ')).forEach(function (x) { w[x] = (w[x] || 0) + 0.4; });
    Object.keys(w).forEach(function (x) { DF[x] = (DF[x] || 0) + 1; });
    KBI.push({ e: e, w: w });
  });
  var NDOC = KB.length;
  function kbSearch(q) {
    var qt = tokens(q), seen = {};
    qt = qt.filter(function (x) { if (seen[x]) return false; seen[x] = 1; return true; });
    var scored = KBI.map(function (d) {
      var s = 0;
      qt.forEach(function (x) { if (d.w[x]) s += d.w[x] * Math.log(1 + NDOC / DF[x]); });
      return { e: d.e, s: s };
    }).sort(function (a, b) { return b.s - a.s; });
    var best = scored[0], total = 0, got = 0;
    qt.forEach(function (x) { var idf = Math.log(1 + NDOC / (DF[x] || 0.5)); total += idf; if (best && best.e && KBI.some(function (d) { return d.e === best.e && d.w[x]; })) got += idf; });
    return { best: best, second: scored[1], qn: qt.length, cover: total ? got / total : 0 };
  }

  /* ------------------------------------------------------------------ *
   * Services (from services-data.js)
   * ------------------------------------------------------------------ */
  function services() { return window.FI_SERVICES || []; }
  function findService(q) {
    var list = services(), best = null, bs = 0;
    list.forEach(function (s) {
      var t = fold(s.title.replace(/&amp;/g, '&')), sc = 0;
      if ((' ' + q + ' ').indexOf(' ' + t + ' ') > -1) sc = 10;
      else t.split(' ').forEach(function (w) { if (w.length > 3 && (' ' + q + ' ').indexOf(' ' + w) > -1) sc += 2; });
      if (sc > bs) { bs = sc; best = s; }
    });
    return bs >= 4 ? best : null;
  }
  function serviceAnswer(s) {
    var first = String(s.desc || '').split(/\n\s*\n/)[0];
    return { text: '**' + s.title + '** — ' + (s.tagline || '') + '\n\n' + first + '\n\nWhat\'s included:\n' + (s.points || []).map(function (p) { return '- ' + p; }).join('\n') +
      '\n\n[Request this service](' + sec('contact') + ')', chips: ['What services do you offer?', 'Evaluate my profile'] };
  }

  /* ------------------------------------------------------------------ *
   * Answers built from live data
   * ------------------------------------------------------------------ */
  function uniSummary(u) {
    var ps = progsOf(u), f = fieldsOf(u), cities = citiesOf(u);
    var lv = { b: 0, m: 0, d: 0 };
    ps.forEach(function (p) { if (/bachelor/i.test(p.lvl)) lv.b++; if (/master/i.test(p.lvl)) lv.m++; if (/doctoral/i.test(p.lvl)) lv.d++; });
    var t = '**' + u.name + '** is a ' + (isUas(u) ? '**university of applied sciences**' : '**university**') + ' based in **' + u.city + '**' +
      (u.ranked ? ', ranked **#' + u.rank + ' in Finland** in the QS Europe 2026 rankings' : '') + '.\n\n' +
      '- **' + plural(ps.length, 'course', 'courses') + ' taught in English** (' + [lv.b ? lv.b + ' bachelor’s' : '', lv.m ? lv.m + ' master’s' : '', lv.d ? lv.d + ' doctoral' : ''].filter(Boolean).join(', ') + ')\n' +
      (f.length ? '- **Study fields:** ' + f.join(', ') + '\n' : '') +
      '- **Teaches in:** ' + cities.join(', ') + '\n' +
      '\n' + uniLink(u) + ' to see all its courses and shortlist it.';
    return { text: t, chips: ['What courses does ' + shortName(u) + ' offer?', 'Master’s at ' + shortName(u), 'Evaluate my profile'] };
  }
  function shortName(u) { return (SHORT[u.id] && SHORT[u.id][0] && SHORT[u.id][0].length <= 6 ? SHORT[u.id][0].toUpperCase() : u.name.replace(/\s*\(.*\)/, '').replace(/ University of Applied Sciences$/, ' UAS')).replace(/^Aalto$/i, 'Aalto'); }

  function courseAnswer(q, opts) {
    ctx.course = { q: q, opts: opts };
    var r = searchProgs(q, opts), rows = r.rows;
    var what = (r.terms ? '**' + r.terms + '**' : '') || '';
    var scope = [r.lvl === 'master' ? 'master’s' : r.lvl === 'bachelor' ? 'bachelor’s' : r.lvl === 'doctoral' ? 'doctoral' : '', opts.uni ? 'at ' + opts.uni.name : '', opts.city ? 'in ' + opts.city : '', r.sch ? 'with a scholarship' : ''].filter(Boolean).join(' ');
    if (!rows.length) {
      return { text: 'I couldn\'t find an English-taught ' + (scope || 'course') + (what ? ' matching ' + what : '') + ' in the Studyinfo listings. Try a broader term, or ' + dirLink(r.terms) + '.\n\nA counsellor can also check programmes that open later in the year.',
        chips: ['Evaluate my profile', 'Show me the top ranked universities'] };
    }
    var byUni = {};
    rows.forEach(function (p) { (byUni[p.u.id] = byUni[p.u.id] || { u: p.u, n: 0 }).n++; });
    var unis = Object.keys(byUni).map(function (k) { return byUni[k]; }).sort(function (a, b) { return b.n - a.n || (a.u.rank || 99) - (b.u.rank || 99); });
    var show = rows.slice(0, opts.uni ? 8 : 6);
    var head = (r.broad ? 'No course names match ' + what + ' exactly, so here is the closest study field. ' : '') +
      'I found **' + plural(rows.length, 'English-taught course', 'English-taught courses') + '**' + (what && !r.broad ? ' for ' + what : '') + (scope ? ' ' + scope : '') +
      (opts.uni ? '' : ' at **' + plural(unis.length, 'institution', 'institutions') + '**') + '.';
    var t = head + '\n\n' + show.map(function (p) { return progLine(p, !opts.uni); }).join('\n');
    if (!opts.uni && unis.length > 1) t += '\n\n**Most options at:** ' + unis.slice(0, 4).map(function (x) { return uniLink(x.u) + ' (' + x.n + ')'; }).join(', ');
    if (rows.length > show.length) t += '\n\n' + (opts.uni ? uniLink(opts.uni) + ' to see all ' + rows.length + '.' : dirLink(r.terms) + '.');
    var chips = [];
    if (!r.lvl) chips.push((r.terms ? r.terms + ' ' : '') + 'master’s' + (opts.uni ? ' at ' + shortName(opts.uni) : ''));
    if (!r.sch) chips.push('Which of these have a scholarship?');
    chips.push('Evaluate my profile');
    return { text: t, chips: chips.slice(0, 3) };
  }
  function cityAnswer(city, q) {
    var lvl = levelOf(q), type = /\b(uas|applied)\b/.test(q) ? 'uas' : /\buniversities\b/.test(q) && !/\bapplied\b/.test(q) && /\bonly\b/.test(q) ? 'uni' : '';
    var here = UNIS.filter(function (u) { return u.city === city || citiesOf(u).indexOf(city) > -1; });
    if (type) here = here.filter(function (u) { return type === 'uas' ? isUas(u) : !isUas(u); });
    if (!here.length) return { text: 'None of the 36 institutions teaches in **' + city + '** in English right now, according to Studyinfo. ' + dirLink('') + ' to browse other cities.', chips: ['Universities in Helsinki', 'Universities in Tampere'] };
    here.sort(function (a, b) { return (a.rank || 99) - (b.rank || 99); });
    var t = '**' + plural(here.length, 'institution teaches', 'institutions teach') + ' in ' + city + '**:\n' + here.map(function (u) {
      var n = progsOf(u).filter(function (p) { return p.city === city && lvlMatch(p, lvl); }).length;
      return '- ' + uniLink(u) + ' — ' + (isUas(u) ? 'applied sciences' : 'university') + (u.ranked ? ', #' + u.rank + ' in Finland' : '') + (n ? ' · ' + plural(n, 'course', 'courses') + ' here' : '');
    }).join('\n');
    return { text: t + '\n\n[Browse ' + city + ' in the directory](./universities.html?city=' + encodeURIComponent(city) + ')', chips: ['Master’s in ' + city, 'Show me the top ranked universities'] };
  }
  function rankingAnswer() {
    var top = UNIS.filter(function (u) { return u.ranked; }).sort(function (a, b) { return a.rank - b.rank; });
    return { text: '**' + top.length + ' Finnish institutions** are ranked in the **QS World University Rankings: Europe 2026**. Their positions in Finland:\n' +
      top.map(function (u) { return '- **#' + u.rank + '** ' + uniLink(u) + ' — ' + u.city; }).join('\n') +
      '\n\nTwo of the twelve are universities of applied sciences. The other institutions aren\'t covered by a published ranking, which doesn\'t make them a weaker choice for your field.',
      chips: ['Tell me about Aalto University', 'Difference between universities and UAS'] };
  }
  function countsAnswer(q) {
    var uas = UNIS.filter(isUas).length, uni = UNIS.length - uas, n = PROGS.length;
    if (/\b(course|courses|programme|programmes|program|programs|degree|degrees)\b/.test(q)) {
      var lv = { b: 0, m: 0, d: 0 };
      PROGS.forEach(function (p) { if (/bachelor/i.test(p.lvl)) lv.b++; if (/master/i.test(p.lvl)) lv.m++; if (/doctoral/i.test(p.lvl)) lv.d++; });
      return { text: 'Studyinfo lists **' + n.toLocaleString('en-GB') + ' English-taught programme listings** across the 36 institutions — **' + lv.b + ' bachelor’s, ' + lv.m + ' master’s and ' + lv.d + ' doctoral** (some programmes cover both bachelor’s and master’s). That\'s **600+ distinct degree programmes** taught in English.',
        chips: ['Master’s in computer science', 'Bachelor’s in business'] };
    }
    return { text: 'There are **' + UNIS.length + ' higher education institutions** you can apply to: **' + uni + ' universities** and **' + uas + ' universities of applied sciences**. (The Ministry\'s own structure is 13 universities and 22 UAS; the directory also lists Högskolan på Åland, which awards Finnish degrees but answers to the Government of Åland.) **12** of them are ranked in QS Europe 2026.',
      chips: ['Show me the top ranked universities', 'Difference between universities and UAS'] };
  }

  /* ------------------------------------------------------------------ *
   * The dialogue
   * ------------------------------------------------------------------ */
  var ctx = { uni: null, lastQ: '', course: null };
  function reset() { ctx = { uni: null, lastQ: '', course: null }; }
  function kbAnswer(e) { return { text: e.a, chips: e.c || [] }; }
  var FALLBACK_CHIPS = ['What scholarships are there?', 'How does the residence permit work?', 'Master’s in computer science', 'Talk to a counsellor'];

  function answer(raw) {
    var q = fold(String(raw).replace(/\bIT\b/g, 'ICT')).replace(/\bmba\b/g, 'master business administration');
    if (!q) return Promise.resolve({ text: 'Ask me anything about studying in Finland.', chips: FALLBACK_CHIPS });

    // Small talk first — no data needed.
    if (/^(hi|hello|hey|hai|hii+|good (morning|afternoon|evening)|namaste|vanakkam)\b/.test(q) && q.split(' ').length <= 4)
      return Promise.resolve({ text: 'Hello! 👋 What would you like to know about studying in Finland? You can ask about universities and courses, permits, scholarships, work, family — or anything else on this page.', chips: FALLBACK_CHIPS });
    if (/^(thanks|thank you|thx|ty|great|awesome|cool|ok|okay|nice|perfect)\b/.test(q) && q.split(' ').length <= 4)
      return Promise.resolve({ text: 'You\'re welcome! Anything else I can help with?', chips: ['Evaluate my profile', 'Master’s in computer science'] });
    if (/^(bye|goodbye|see you|cya)\b/.test(q))
      return Promise.resolve({ text: 'Good luck with your Finland plans! A counsellor is a message away whenever you need one.', chips: ['Evaluate my profile'] });

    // Never quote money: fees for a specific programme or university get the
    // budget answer, not a number.
    var money = /\b(how much|fee|fees|tuition|cost|costs|price|euro|eur|inr|rupees|lakh|expensive|cheap|cheapest|affordable|lowest fee\w*)\b/.test(q);

    return ensureData().then(function () {
      var uni = findUni(q);
      // "it", "this one" (and "them"/"these" when no course list is open)
      // refer back to the last university discussed.
      if (!uni && ctx.uni && !/\bhow many\b/.test(q) && (/\b(it|its|this (university|uni|one|place)|that (university|uni|one))\b/.test(q) ||
          (!ctx.course && ctx.lastWasUni && /\b(them|these|those|which of)\b/.test(q)))) uni = ctx.uni;
      ctx.lastWasUni = false;
      var city = findCity(q);
      if (uni) ctx.uni = uni;
      ctx.lastQ = q;

      // "Which of these have a scholarship?" refines the last course search.
      var prev = ctx.course;
      ctx.course = null;   // a follow-up only refines the answer just given
      if (prev && /\b(these|those|them|which of|of them|among them|same)\b/.test(q)) {
        return courseAnswer(prev.q + ' ' + q, prev.opts);
      }

      if (money) {
        var costs = KB.filter(function (e) { return e.id === 'costs'; })[0];
        var pre = uni ? 'Tuition at **' + uni.name + '** depends on the programme. ' : '';
        return { text: pre + costs.a, chips: costs.c };
      }

      var byId = function (id) { return kbAnswer(KB.filter(function (e) { return e.id === id; })[0]); };
      if (/\b(who|what) are you\b|\bare you (a )?(bot|robot|human|real|ai)\b|\byour name\b/.test(q)) return byId('ai');
      if (/\bd visa\b|\bd type visa\b/.test(q)) return byId('dvisa');
      if (/\b(other|more|different) (countr\w*|destination\w*)\b|\b(study|studying|help|go)\b.*\b(usa|america|uk|united kingdom|canada|australia|new zealand|ireland|germany|france|poland|malaysia|uae|dubai|mauritius|singapore)\b/.test(q)) return byId('destinations');

      // Contact details are asked in many ways; answer them directly.
      if (/\b(phone|whatsapp|email|e mail|mail id|contact|call you|address|office|reach you|number)\b/.test(q) && !uni)
        return kbAnswer(KB.filter(function (e) { return e.id === 'contact'; })[0]);

      // Rankings and counts.
      var fieldy = FIELD_WORDS.some(function (fw) { return fw[0].test(q); });
      if (/\b(rank|ranked|ranking|rankings|top|best|qs)\b/.test(q) && !uni && !COURSE_HINT.test(q) && !city && !fieldy) return rankingAnswer();

      // Parents aren't covered by the family route on this page.
      if (/\b(parent|parents|mother|father|mom|mum|dad|sibling\w*|brother|sister)\b/.test(q) && /\b(bring|come|join|take|visit|family|permit|with me)\b/.test(q))
        return { text: "The family route on this page covers your **spouse or registered partner** and your **children under 18** — they can get a residence permit on the basis of family ties while you study. Parents and siblings aren't covered by that route. If they'd like to visit you, a counsellor can talk you through the options.", chips: ['Bringing your family', 'Talk to a counsellor'] };

      // How long degrees take, from the programme listings.
      if (/\b(how long|duration|how many years|length of)\b/.test(q) && (levelOf(q) || COURSE_HINT.test(q))) {
        var dur = function (k) {
          var ys = PROGS.filter(function (p) { return lvlMatch(p, k) && !/\+/.test(p.lvl); }).map(function (p) { return parseInt(p.dur, 10); }).filter(function (m) { return m && m <= 96; });
          var c = {}; ys.forEach(function (m) { c[m] = (c[m] || 0) + 1; });
          var top = Object.keys(c).sort(function (a, b) { return c[b] - c[a]; })[0];
          return top ? years(+top) : '';
        };
        var lv0 = levelOf(q);
        return { text: lv0 ? 'Most English-taught **' + (lv0 === 'master' ? 'master’s' : lv0 === 'bachelor' ? 'bachelor’s' : 'doctoral') + '** programmes in the listings take **' + dur(lv0) + '**. Each course shows its own length in the directory.'
          : 'Typical lengths in the listings: **bachelor’s ' + dur('bachelor') + '**, **master’s ' + dur('master') + '**, **doctoral ' + dur('doctoral') + '**. Each course shows its own length in the directory.', chips: ['Master’s in computer science', 'Bachelor’s in business'] };
      }
      if (/\bhow many\b/.test(q) && /\b(universit\w*|uas|institution\w*|college\w*|course\w*|programme\w*|program\w*|degree\w*)\b/.test(q) && !uni && !city) return countsAnswer(q);

      // Services by name ("tell me about the documentation service").
      var svc = findService(q);
      if (svc && (/\bservice/.test(q) || (' ' + q + ' ').indexOf(' ' + fold(svc.title.replace(/&amp;/g, '&')) + ' ') > -1)) return serviceAnswer(svc);
      if (/\b(services?|what do you (do|offer)|how can you help|help me with)\b/.test(q) && !uni) {
        return { text: 'Tutee Connect offers **' + services().length + ' services**, one team from start to finish:\n' + services().map(function (s, i) { return '- **' + pad2(i + 1) + ' ' + s.title + '** — ' + (s.tagline || ''); }).join('\n') + '\n\nAsk about any of them for the details.',
          chips: services().slice(0, 3).map(function (s) { return 'Tell me about ' + s.title; }) };
      }

      // A university by name.
      if (uni) {
        var topic = /\b(ielts|toefl|pte|duolingo|cambridge|english|language|test|gmat)\b/.test(q) ? 'language'
          : /\b(requirement\w*|eligib\w*|criteria|admission requirement\w*|qualify)\b/.test(q) ? 'requirements'
          : /\b(apply|application|deadline\w*|how to get in|admission)\b/.test(q) && !COURSE_HINT.test(q) ? 'apply' : '';
        if (topic) {
          var tk = KB.filter(function (e) { return e.id === topic; })[0];
          return { text: 'Each programme at **' + uni.name + '** publishes its own requirements on Studyinfo, and we check them course by course. In general:\n\n' + tk.a + '\n\n' + uniLink(uni) + ' to see its courses.', chips: ['What courses does ' + shortName(uni) + ' offer?', 'Evaluate my profile'] };
        }
        if (COURSE_HINT.test(q) || levelOf(q) || /\b(scholarship)\b/.test(q) || FIELD_WORDS.some(function (fw) { return fw[0].test(q); })) return courseAnswer(q, { uni: uni });
        if (/\b(rank|ranked|ranking|position)\b/.test(q)) return { text: uni.ranked ? '**' + uni.name + '** is ranked **#' + uni.rank + ' in Finland** in the QS World University Rankings: Europe 2026.' : '**' + uni.name + '** isn\'t covered by the QS Europe 2026 ranking. ' + uniLink(uni) + ' for its courses.', chips: ['Show me the top ranked universities', 'What courses does ' + shortName(uni) + ' offer?'] };
        if (/\b(where|city|located|location|campus|campuses)\b/.test(q)) return { text: '**' + uni.name + '** is based in **' + uni.city + '**' + (citiesOf(uni).length > 1 ? ', and teaches English-taught courses in ' + citiesOf(uni).join(', ') : '') + '. ' + uniLink(uni) + '.', chips: ['What courses does ' + shortName(uni) + ' offer?'] };
        if (/\b(website|site|url|link)\b/.test(q)) return { text: 'Everything you need about **' + uni.name + '** is right here — ' + uniLink(uni) + ' for its details and all its English-taught courses. A counsellor can help with anything more.', chips: ['What courses does ' + shortName(uni) + ' offer?', 'Talk to a counsellor'] };
        ctx.lastWasUni = true;
        return uniSummary(uni);
      }

      // Courses by field, level or keyword (optionally in a city).
      if (fieldy && city) return courseAnswer(q, { city: city });
      if (fieldy && /\b(rank|ranked|ranking|top|best)\b/.test(q)) {
        var rb = courseAnswer(q, { city: city });
        rb.text = 'Here are the courses for that field, with the **highest-ranked institutions first**:\n\n' + rb.text;
        return rb;
      }
      var aboutWork = /\b(job|jobs|work|working|career|employment|visa|permit|stay|after (my |the )?(studies|graduation|degree))\b/.test(q) && !fieldy;
      // "Why study in Finland?" is a question about Finland, not a course search.
      var askWhy = /^(why|should i|is it worth|what makes)\b/.test(q) && !fieldy;
      if (!aboutWork && !askWhy && ((COURSE_HINT.test(q) && (fieldy || courseTerms(q, null, city).length > 2 || levelOf(q))) || (fieldy && levelOf(q)))) {
        var r = courseAnswer(q, { city: city });
        if (!/^I couldn't find/.test(r.text) || COURSE_HINT.test(q)) return r;
      }
      if (city && /\b(universit\w*|uas|institution\w*|college\w*|study|studying|where)\b/.test(q)) return cityAnswer(city, q);
      if (city && q.split(' ').length <= 3) return cityAnswer(city, q);

      // Everything else: the knowledge base.
      var hit = kbSearch(q);
      if (hit.best && hit.best.s >= 3.2 && hit.cover >= 0.5) {
        var res = kbAnswer(hit.best.e);
        return res;
      }
      // A plain field name ("nursing", "data science") is still a course search.
      if (fieldy) return courseAnswer(q, { city: city });
      return { text: "I'm not sure about that one from what's on this site, and I'd rather not guess. A Tutee Connect counsellor can answer it properly — [WhatsApp us](https://wa.me/917358364959), or I can take your details for a call back.\n\nHere's what I can help with right away:",
        chips: FALLBACK_CHIPS };
    });
  }

  window.TuteeAI = { answer: answer, render: render, reset: reset, ensureData: ensureData };
})();
