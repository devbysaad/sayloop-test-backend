/**
 * nameService.js — Gemini-powered creative nickname generator
 * Falls back to a massive curated pool if all AI models fail.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

let _genAI = null;

function getGenAI() {
  if (!_genAI) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY not set in .env');
    _genAI = new GoogleGenerativeAI(key);
  }
  return _genAI;
}

// ─── Giant curated pool — grouped by first-letter clusters ────────────────────
// So fallback is ALWAYS creative, never boring, and adapts to the name's letter
const POOL_BY_START = {
  // A names
  a: ['Alikar', 'Aliven', 'Aliran', 'Alikos', 'Alarak', 'Alivex', 'Alirek', 'Alizen',
      'Alizor', 'Aliburn', 'Alikira', 'Alistorm', 'Alivorn', 'Aliken', 'Alixar',
      'Alirav', 'Alikron', 'Alibay', 'Aliskard', 'Alimarr'],
  // S names
  s: ['Saavrix', 'Saelion', 'Saadikos', 'Saavron', 'Saelyx', 'Saadrek', 'Saavion',
      'Saeldar', 'Saadros', 'Saavlek', 'Saelkar', 'Saadrius', 'Saavex', 'Saelorn',
      'Saadvik', 'Sardius', 'Saphon', 'Sajaster', 'Savantix', 'Saderon',
      'Sajestic', 'Sargon', 'Sajin', 'Sydex', 'Synax', 'Sajak', 'Sarskor'],
  // M names
  m: ['Maxiros', 'Mavron', 'Maxkon', 'Maxvel', 'Mavrek', 'Maxiras', 'Makarios',
      'Malvron', 'Mykron', 'Maxorin', 'Mavion', 'Makron', 'Malken', 'Maxival',
      'Mavindra', 'Makoren', 'Myxar', 'Maxidra', 'Malvix', 'Makrel'],
  // Z names
  z: ['Zarael', 'Zarkon', 'Ziraya', 'Zerak', 'Zarvex', 'Zarlius', 'Zirkon',
      'Zarevon', 'Zirax', 'Zarvik', 'Zyron', 'Zarath', 'Zarios', 'Zeravon',
      'Zirkan', 'Zarvion', 'Zyrex', 'Zarakel', 'Zirove', 'Zarikno'],
  // R names
  r: ['Ravion', 'Rexkar', 'Rykon', 'Rakiros', 'Ravian', 'Rexon', 'Ryven',
      'Rakaros', 'Ravex', 'Ryxar', 'Raken', 'Ravkon', 'Rykiran', 'Raxen',
      'Ravius', 'Rykon', 'Raxios', 'Ravark', 'Ryker', 'Raximar'],
  // K names
  k: ['Kairon', 'Kyven', 'Karios', 'Kalvex', 'Kyron', 'Kaivos', 'Kalrak',
      'Kyxar', 'Kairen', 'Kyvion', 'Kalikos', 'Kyrek', 'Kaivron', 'Kylax',
      'Karios', 'Kyrven', 'Kalidor', 'Kyxon', 'Kairax', 'Kyrion'],
  // N names
  n: ['Navron', 'Nyxar', 'Nikos', 'Navex', 'Nykon', 'Naikron', 'Navion',
      'Nyrekks', 'Naikar', 'Naviren', 'Naxos', 'Nyven', 'Naikros', 'Navark',
      'Nyrex', 'Naikven', 'Navkos', 'Nyxion', 'Nairav', 'Navkron'],
  // H names
  h: ['Havron', 'Hykron', 'Haikos', 'Halvex', 'Hykon', 'Haikar', 'Havion',
      'Hyxar', 'Hairon', 'Havren', 'Haxen', 'Hyven', 'Haivos', 'Havkron',
      'Hyrex', 'Haikros', 'Havark', 'Hyxon', 'Hairav', 'Haviken'],
  // O names
  o: ['Orvex', 'Okaros', 'Orikon', 'Oxkar', 'Orvion', 'Okairen', 'Orykron',
      'Oxiven', 'Orkhar', 'Orvax', 'Okarix', 'Ornikos', 'Oxaren', 'Orving',
      'Okarav', 'Orkaron', 'Oxivel', 'Ornaxar', 'Orviken', 'Okarios'],
  // J names
  j: ['Javron', 'Jykron', 'Jaikos', 'Jalvex', 'Jykon', 'Jaikar', 'Javion',
      'Jyxar', 'Jairon', 'Javren', 'Jaxen', 'Jyven', 'Jaivos', 'Javkron',
      'Jyrex', 'Jaikros', 'Javark', 'Jyxon', 'Jairav', 'Javiken'],
  // Default for letters not listed above
  default: ['Xavros', 'Vikron', 'Torax', 'Zelkon', 'Pheron', 'Draxis', 'Ulvar',
            'Valdrix', 'Brenok', 'Corvex', 'Falkon', 'Gryndal', 'Ikaros',
            'Lexton', 'Myrkon', 'Pyrex', 'Quorvax', 'Thrakon', 'Wyxen', 'Yarvon'],
};

function fallbackNames(name) {
  const firstLetter = name.charAt(0).toLowerCase();
  const pool = POOL_BY_START[firstLetter] || POOL_BY_START['default'];
  // Shuffle and return 4 unique ones
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 4);
}

// ─── Random creative themes (change output every refresh) ─────────────────────
const VARIATION_THEMES = [
  'Think of ancient warriors and mythological heroes',
  'Think of sci-fi characters and space explorers',
  'Think of cartoon villains and anime protagonists',
  'Think of medieval knights and dragons',
  'Think of street artists and graffiti culture',
  'Think of underground rappers and hip-hop legends',
  'Think of old folklore spirits and mystical creatures',
  'Think of sports legends and championship titles',
  'Think of nature forces like storms, fire, and lightning',
  'Think of secret agents and spies',
  'Think of ancient gods from Greek, Norse, or Egyptian mythology',
  'Think of video game bosses and legendary characters',
  'Think of comic book heroes with dramatic names',
  'Think of jazz musicians and blues legends',
  'Think of pirate captains and sea adventurers',
  'Think of wild animals with personality',
  'Think of classic movie characters with swagger',
  'Think of cyberpunk hackers and AI rebels',
  'Think of samurai and ninja clans',
  'Think of alchemists and wizards with elemental powers',
];

// ─── Gemini models to try in order ────────────────────────────────────────────
// Ordered from fastest/cheapest to most capable
const MODELS_TO_TRY = [
  'gemini-1.5-flash',           // most compatible with v1beta
  'gemini-1.5-flash-latest',    // alias
  'gemini-1.5-pro',             // fallback
  'gemini-pro',                 // legacy
];

/**
 * Generate 4 creative fun nicknames for a name using Gemini.
 * @param {string} name
 * @returns {Promise<string[]>}
 */
async function generateNameSuggestions(name) {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('[NameService] No GEMINI_API_KEY — using offline fallback');
    return fallbackNames(name);
  }

  const theme = VARIATION_THEMES[Math.floor(Math.random() * VARIATION_THEMES.length)];
  const salt  = Math.floor(Math.random() * 99999);

  const prompt =
`You are a creative nickname wizard. For the name "${name}", create 4 badass, unique, memorable nicknames.

Style for this batch (#${salt}): ${theme}

Guidelines:
- Each nickname has a DIFFERENT vibe: one ancient, one sci-fi, one punchy, one poetic
- Must start with or sound like the original name
- Must be 1 word, 4–13 letters only, no symbols or numbers
- Sound cool — like a video game username or ancient warrior name
- Examples inspired by ${theme.split(' ')[2] || 'creativity'}:
  Saad → Sadrion, Saavrek, Sardius, Saelyx
  Ali  → Aliken, Alirak, Aliros, Alivex
  Max  → Maxiren, Mavkon, Malvros, Mykvar
  Zara → Zarael, Zirkon, Zeravon, Zarvik

Return ONLY a raw JSON array of 4 strings. No explanation. No markdown. No extra text.`;

  for (const model of MODELS_TO_TRY) {
    try {
      console.log(`[NameService] 🎲 [${salt}] theme="${theme.slice(0,35)}" model=${model} name="${name}"`);
      const ai   = getGenAI();
      const inst = ai.getGenerativeModel({
        model,
        generationConfig: {
          temperature:     1.2,
          topK:            50,
          topP:            0.95,
          maxOutputTokens: 100,
        },
      });

      const result = await inst.generateContent(prompt);
      const raw    = result.response.text()
        .trim()
        .replace(/```json\n?|```|`/g, '')
        .trim();

      console.log(`[NameService] raw (${model}):`, raw);

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length < 1) throw new Error('bad shape');

      const clean = parsed
        .slice(0, 4)
        .map(s => String(s).replace(/[^a-zA-Z]/g, '').trim())
        .filter(s => s.length >= 3 && s.length <= 15);

      if (clean.length < 2) throw new Error('too few valid names');

      console.log(`[NameService] ✅ ${model}:`, clean);
      return clean;

    } catch (err) {
      console.warn(`[NameService] ❌ ${model}:`, err.message);
    }
  }

  // All Gemini models failed → huge curated fallback
  console.error('[NameService] All Gemini models failed → curated fallback');
  return fallbackNames(name);
}

module.exports = { generateNameSuggestions, CURATED_NAME_POOL: POOL_BY_START };