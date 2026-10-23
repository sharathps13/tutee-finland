/**
 * Live Finland news for the homepage ticker — Netlify Functions (v2, ESM).
 *
 * GET /api/news -> { updated, items: [{ title, source, date, img }] }
 *
 * Pulls the English-language RSS feeds of Yle News (Finland's public
 * broadcaster) and Helsinki Times server-side, keeps the stories that matter
 * to someone planning to study or settle in Finland (education, immigration,
 * work, cities, everyday life), drops crime / war / accident stories, and
 * pairs each headline with one of the site's own photos (assets/img/news/).
 *
 * The page never loads anything from those sites: headlines are plain text
 * (no outbound links) and every image is same-origin, which keeps the strict
 * CSP intact. Responses are cached at Netlify's edge for 30 minutes.
 *
 * Zero npm dependencies: Node 18+ global fetch only.
 */

const FEEDS = [
  { url: 'https://yle.fi/rss/news', source: 'Yle News' },
  { url: 'https://www.helsinkitimes.fi/?format=feed&type=rss', source: 'Helsinki Times' }
];
const TIMEOUT_MS = 6000;
const MAX_ITEMS = 12;
// The site never shows money amounts, so stories quoting one are left out.
const MONEY = /[€$£]|\b\d+(?:[.,]\d+)?\s*(?:million|billion|bn|m)?\s*(?:euros?|eur|dollars?|usd)\b/i;

// Stories that don't belong on a study-abroad page.
const BLOCK = /\b(murder\w*|kill\w*|dead|death\w*|died|dies|assault\w*|rape\w*|stab\w*|shoot\w*|shot|crime\w*|criminal\w*|police|arrest\w*|court|prison|sentenc\w*|drug\w*|war|wars|wwii|torpedo\w*|bomb\w*|weapon\w*|explosi\w*|missile\w*|drone\w*|military|army|troops|nato|russia\w*|ukrain\w*|putin|attack\w*|terror\w*|accident\w*|crash\w*|fire|suicid\w*|abuse\w*|scam\w*|fraud\w*|bankrupt\w*|layoff\w*|strike\w*|protest\w*)\b/i;

// What makes a story relevant to our visitors, strongest first.
const RELEVANCE = [
  [/\b(stud(y|ying|ent|ents)|universit\w*|polytechnic\w*|uas|degree\w*|graduat\w*|education\w*|school\w*|campus\w*|tuition|scholarship\w*|research\w*|erasmus)\b/i, 6],
  [/\b(residence permit\w*|permit\w*|visa\w*|migri|immigra\w*|migra\w*|citizenship|foreign\w*|international\w*|talent\w*|expat\w*)\b/i, 5],
  [/\b(job\w*|work\w*|employ\w*|unemploy\w*|labou?r|salar\w*|wage\w*|career\w*|start-?up\w*|tech|startup\w*)\b/i, 3],
  [/\b(helsinki|espoo|tampere|turku|oulu|jyv[aä]skyl[aä]|kuopio|joensuu|lappeenranta|vaasa|rovaniemi|lapland|lahti|pori|kokkola|kajaani|sein[aä]joki|h[aä]meenlinna|kouvola|mariehamn)\b/i, 2],
  [/\b(housing|rent\w*|apartment\w*|family|families|child\w*|happiest|happiness|aurora|northern lights|sauna\w*|nature|winter|summer|snow|weather|festival\w*|culture)\b/i, 1]
];

// Headline words -> one of the site's own thumbnails (assets/img/news/*.jpg).
const UNI_WORDS = [
  [/\baalto\b/i, 'uni-aalto-university'], [/university of helsinki|\bhelsinki university\b/i, 'uni-university-of-helsinki'],
  [/university of turku/i, 'uni-university-of-turku'], [/university of oulu/i, 'uni-university-of-oulu'],
  [/tampere university/i, 'uni-tampere-university'], [/university of jyv[aä]skyl[aä]/i, 'uni-university-of-jyvaskyla'],
  [/eastern finland|\buef\b/i, 'uni-university-of-eastern-finland'], [/\blut\b/i, 'uni-lut-university'],
  [/[aå]bo akademi/i, 'uni-abo-akademi-university'], [/university of vaasa/i, 'uni-university-of-vaasa'],
  [/\bhanken\b/i, 'uni-hanken-school-of-economics'], [/university of lapland/i, 'uni-university-of-lapland'],
  [/\buniarts\b|university of the arts/i, 'uni-university-of-the-arts-helsinki'], [/\bmetropolia\b/i, 'uni-metropolia-university-of-applied-sciences'],
  [/haaga-helia/i, 'uni-haaga-helia-university-of-applied-sciences'], [/\blaurea\b/i, 'uni-laurea-university-of-applied-sciences'],
  [/\btamk\b/i, 'uni-tampere-university-of-applied-sciences'], [/\bjamk\b/i, 'uni-jamk-university-of-applied-sciences']
];
const TOPIC_WORDS = [
  [/\b(permit\w*|visa\w*|migri|immigra\w*|migra\w*|citizenship|passport\w*|border\w*)\b/i, 'permit'],
  [/\b(stud(y|ying|ent|ents)|universit\w*|degree\w*|graduat\w*|education\w*|campus\w*|scholarship\w*|tuition|research\w*)\b/i, 'students'],
  [/\b(job\w*|work\w*|employ\w*|unemploy\w*|labou?r|salar\w*|wage\w*|career\w*|compan\w*|business\w*|start-?up\w*)\b/i, 'work'],
  [/\b(econom\w*|budget\w*|tax\w*|price\w*|inflation|euros?\b|bank\w*|loan\w*|cost\w*|pension\w*|interest rate\w*)\b/i, 'finance'],
  [/\b(housing|rent\w*|apartment\w*|home\w*|property)\b/i, 'housing'],
  [/\b(famil\w*|child\w*|kids?|school\w*|daycare|parent\w*)\b/i, 'family'],
  [/\b(flight\w*|airport\w*|finnair|travel\w*|train\w*|vr\b|ferr\w*|tourism|tourist\w*)\b/i, 'travel'],
  [/\b(language\w*|finnish lessons?|swedish)\b/i, 'language'],
  [/\b(aurora\w*|northern lights)\b/i, 'aurora'],
  [/\b(snow\w*|winter|frost\w*|cold|ice)\b/i, 'season-winter'],
  [/\b(summer|heat\w*|midsummer|sunshine)\b/i, 'season-summer'],
  [/\b(autumn|ruska|leaves)\b/i, 'season-autumn'],
  [/\b(spring|vappu|may day)\b/i, 'season-spring'],
  [/\b(rain\w*|wind\w*|storm\w*|weather|clocks?)\b/i, 'season-autumn']
];
const CITIES = ['helsinki', 'espoo', 'tampere', 'turku', 'oulu', 'jyvaskyla', 'kuopio', 'joensuu', 'lappeenranta', 'vaasa', 'rovaniemi',
  'lahti', 'pori', 'kokkola', 'kajaani', 'seinajoki', 'hameenlinna', 'kouvola', 'mariehamn'];

function fold(s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
function decode(s) {
  return String(s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (m, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ').trim();
}
function tag(xml, name) { const m = new RegExp('<' + name + '[^>]*>([\\s\\S]*?)</' + name + '>', 'i').exec(xml); return m ? decode(m[1]) : ''; }

function imageFor(title, summary) {
  const text = title + ' ' + summary;
  for (const [re, key] of UNI_WORDS) if (re.test(text)) return key;
  const t = fold(title);
  for (const [re, key] of TOPIC_WORDS) if (re.test(title)) return key;
  for (const c of CITIES) if (new RegExp('\\b' + c + '\\b').test(t)) return 'city-' + c;
  // The summary only decides the city; its topic words are too loose.
  const f = fold(summary);
  for (const c of CITIES) if (new RegExp('\\b' + c + '\\b').test(f)) return 'city-' + c;
  return /\b(forest\w*|nature|animal\w*|squirrel\w*|lake\w*|bird\w*|wildlife)\b/i.test(title) ? 'season-summer' : 'finland';
}
function score(title, summary) {
  let s = 0;
  for (const [re, w] of RELEVANCE) { if (re.test(title)) s += w * 2; else if (re.test(summary)) s += w; }
  return s;
}

async function fetchFeed(feed) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(feed.url, { signal: ctrl.signal, headers: { 'User-Agent': 'TuteeConnectNewsTicker/1.0 (+https://www.tuteeconnect.com)', Accept: 'application/rss+xml, application/xml, text/xml' } });
    if (!res.ok) return [];
    const xml = await res.text();
    return (xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || []).map((it) => {
      const title = tag(it, 'title'), summary = tag(it, 'description').slice(0, 400);
      const date = new Date(tag(it, 'pubDate') || tag(it, 'dc:date') || Date.now());
      return { title, summary, source: feed.source, date: isNaN(date) ? new Date().toISOString() : date.toISOString() };
    }).filter((x) => x.title && x.title.length > 12 && x.title.length < 160);
  } catch (e) {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export default async () => {
  const lists = await Promise.all(FEEDS.map(fetchFeed));
  const seen = [];
  seen.add = seen.push;
  const items = lists.flat()
    .filter((x) => !BLOCK.test(x.title + ' ' + x.summary))
    .filter((x) => !MONEY.test(x.title))
    // The same story from both outlets: skip headlines sharing most of their words.
    .filter((x) => {
      const words = new Set(fold(x.title).split(/[^a-z0-9]+/).filter((w) => w.length > 3));
      for (const prev of seen) {
        let common = 0; words.forEach((w) => { if (prev.has(w)) common++; });
        if (common / Math.max(1, Math.min(words.size, prev.size)) >= 0.6) return false;
      }
      seen.add(words); return true;
    })
    .map((x) => ({ ...x, s: score(x.title, x.summary), age: (Date.now() - Date.parse(x.date)) / 36e5 }))
    .filter((x) => x.age < 24 * 10)
    // Relevance first, fresher stories breaking ties (a day's age ~ one point).
    .sort((a, b) => (b.s - b.age / 24) - (a.s - a.age / 24))
    .slice(0, MAX_ITEMS)
    .map((x) => ({ title: x.title, source: x.source, date: x.date, img: './assets/img/news/' + imageFor(x.title, x.summary) + '.jpg' }));

  return new Response(JSON.stringify({ updated: new Date().toISOString(), items }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // Browsers keep it 5 minutes; Netlify's edge serves it for 30.
      'Cache-Control': 'public, max-age=300',
      'Netlify-CDN-Cache-Control': 'public, max-age=1800, stale-while-revalidate=600'
    }
  });
};

export const config = { path: '/api/news' };
