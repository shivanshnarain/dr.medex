/**
 * DR.MEDEX Advanced Review Moderation & Abuse/Spam Filtering Service
 * 
 * Provides server-side, multi-lingual (English, Hindi, Hinglish) moderation:
 * 1. Severe Profanity, Abusive Insults & Slurs (English, Hindi Latin/Hinglish, Devanagari)
 * 2. Explicit Sexual, Obscene & Pornographic Content
 * 3. Violent Threats, Hate & Targeted Harassment
 * 4. Spam, Promotional Links, Crypto/Casino Solicitation, Bot Submissions & Character Stuffing
 * 5. De-obfuscation Pipeline (spaced letters, punctuation insertion, leetspeak, repeated chars)
 * 6. Strict Safe-Word Whitelist to prevent False Positives (e.g. "class", "assist", "analytics")
 * 7. Legitimate Negative Feedback & Defect Reporting Protection (honoring DR.MEDEX criticism)
 * 
 * Moderation Decisions:
 * - ALLOW: Clean review -> publish immediately (status: "APPROVED")
 * - REJECT: Clear profanity, sexual abuse, threats, or obvious promotional spam -> HTTP 422
 * - QUARANTINE: Ambiguous cases (unverified phone numbers, high repetition) -> status: "QUARANTINED"
 */

// 1. SAFE WORD WHITELIST (Innocent words containing profanity/slur substrings)
const SAFE_WORDS = new Set([
  // "ass" substrings
  "class", "classic", "classical", "classify", "classified", "classrooms",
  "assist", "assistant", "assistance", "assisted", "assisting",
  "pass", "passage", "passenger", "passport", "passion", "passionate", "passed",
  "asset", "assets", "assemble", "assembled", "assembly", "assembler",
  "assess", "assessed", "assessment", "assessments",
  "mass", "massive", "massively", "massage", "massager",
  "grass", "brass", "compass", "harass", "harassment",
  "glass", "glasses", "embassy", "trespass", "reassure", "reassurance",
  // "cock" substrings
  "cockpit", "peacock", "shuttlecock", "cocktail",
  // "dick" substrings
  "dictate", "dictation", "dictionary", "predict", "prediction", "predictable",
  "verdict", "contradict", "addict", "addicted", "addiction", "dedicate", "benedict",
  // "tit" substrings
  "title", "titled", "entity", "entities", "appetite", "attitude", "quantity",
  "institution", "constitution", "competitor", "petition",
  // "hell" substrings
  "hello", "shell", "wheelbarrow",
  // "anal" substrings
  "analytics", "analyze", "analysis", "analyst", "analog", "analogue",
  // "crap" substrings
  "scrape", "scraper", "scraping", "skyscraper",
  // "cum" substrings
  "document", "documentation", "accumulate", "cumulate", "cumulative", "circumstance",
  // "sex" substrings
  "section", "sextant",
  // Hindi substrings (e.g. "chut" in "chutney", "cutta" in "calcutta")
  "chutney", "chatni", "calcutta", "kolkata"
]);

// 2. ENGLISH PROFANITY & HARASSMENT (Whole word match)
const ENGLISH_PROFANITIES = [
  "fuck", "fucker", "fucking", "fuckin", "fucked", "fuckup", "fucks",
  "motherfucker", "motherfucking", "motherfuckers",
  "shit", "shitty", "shits", "bullshit", "horseshit", "dipshit",
  "bitch", "bitches", "bitching", "bitchy",
  "bastard", "bastards",
  "asshole", "assholes", "dumbass", "jackass", "fatass",
  "cunt", "cunts",
  "dick", "dicks", "dickhead", "dickheads",
  "pussy", "pussies",
  "whore", "whores", "slut", "sluts",
  "faggot", "fag", "nigger", "nigga", "retard", "retarded",
  "cocksucker", "prick", "twat", "douchebag", "douche"
];

// 3. EXPLICIT SEXUAL / PORNOGRAPHIC TERMS
const SEXUAL_EXPLICIT_TERMS = [
  "porn", "porno", "pornography", "xxx", "blowjob", "handjob",
  "dildo", "vagina", "penis", "orgasm", "sex video", "escort service",
  "call girl", "nude pics", "send nudes", "boobs", "erotic massage",
  "hentai", "camgirl", "onlyfans", "naked photos"
];

// 4. VIOLENT THREATS & PHYSICAL HARM
const THREAT_PATTERNS = [
  /\bkill\s+(you|all|your|the)\b/i,
  /\bi\s+(will|gonna)\s+(kill|murder|shoot|stab|destroy)\s+you\b/i,
  /\b(murder|slit\s+your\s+throat|burn\s+in\s+hell|die\s+in\s+hell)\b/i,
  /\b(hang\s+yourself|commit\s+suicide|go\s+die)\b/i,
  /\b(bomb|shoot\s+up|terrorist\s+attack)\b/i
];

// 5. HINDI / HINGLISH PROFANITY & ABUSIVE SLURS (Latin Script)
const HINGLISH_PROFANITIES = [
  // High-severity cuss words
  "chutiya", "chutiye", "chutya", "chootiya", "chootiye", "chutiyapa", "choot",
  "madarchod", "madarchot", "madarshod", "maadar", "mc", "madrchod",
  "behenchod", "bhenchod", "bhenchot", "bc", "bhnchod", "behen k lode", "bhen k lode",
  "bhosdike", "bhosdika", "bhosdiwale", "bhosadike", "bhosdi", "bhosada",
  "gandu", "gaand", "gandfat", "gandmasti", "gaandu",
  "harami", "haraami", "haramkhor", "haramzada", "haramzade",
  "kamina", "kamine", "kameena", "kameene",
  "kutta", "kutte", "kuttiya", "kutte ke bache", "kutte ki maut",
  "randi", "raandi", "randibaaz", "randi rona",
  "saala", "saale", "sala kutta", "saali",
  "lauda", "loda", "lodu", "lund", "launda", "lavda",
  "chudai", "chud gaya", "chud gaye", "chudwana",
  "bhadwe", "bhadwa", "bhadve",
  "jhatu", "jhaatu", "jhant",
  "suar ke pille", "teri maa ki", "maa ki chut"
];

// 6. HINDI PROFANITY (Devanagari Script)
const HINDI_DEVANAGARI_PROFANITIES = [
  "चूतिया", "चूतिये", "चूतियापा",
  "मादरचोद", "मादरचोत",
  "बहनचोद", "भेनचोद",
  "भोसड़ीके", "भोसड़ीका", "भोसड़ीवाले",
  "गांड", "गांडू",
  "हरामी", "कमीना", "कमीने",
  "कुत्ता", "कुत्ते", "कुतिया",
  "साला", "साले", "साली",
  "रंडी", "रांडी",
  "लौड़ा", "लौड़े", "लंड",
  "भाड़वे", "भाड़वा",
  "झाटू", "झांट"
];

// 7. SPAM & COMMERCIAL SOLICITATION PATTERNS
const SPAM_PATTERNS = [
  // URLs and links
  /https?:\/\/[^\s]+/i,
  /www\.[^\s]+/i,
  /\b[a-z0-9-]+\.(xyz|top|ru|club|info|biz|online|vip|cam|adult|casino|bet)\b/i,
  /\b(bit\.ly|tinyurl\.com|t\.me|wa\.me|chat\.whatsapp\.com)\/[a-z0-9_.-]+/i,
  /\b(t\.me|wa\.me)\/[a-z0-9_.-]+/i,
  // Financial, casino, crypto scams
  /\b(free\s+crypto|bitcoin\s+investment|earn\s+\$?\d+\s+daily|forex\s+trading|guaranteed\s+profit)\b/i,
  /\b(online\s+casino|free\s+spins|slot\s+machine|betting\s+odds|poker\s+bonus)\b/i,
  // Blackhat SEO & pharmaceutical spam
  /\b(seo\s+backlink|guest\s+post\s+service|cheap\s+viagra|buy\s+cialis|replica\s+watches)\b/i,
  // Solicitation phrases
  /\b(whatsapp\s+me\s+on|contact\s+me\s+at\s+[\w.-]+@|call\s+me\s+for\s+fun)\b/i
];

/**
 * Leetspeak & character normalization map
 */
const LEET_MAP = {
  "@": "a",
  "$": "s",
  "!": "i",
  "1": "i",
  "0": "o",
  "3": "e",
  "5": "s",
  "7": "t",
  "8": "b",
  "+": "t"
};

/**
 * Normalize text: remove accents, expand leetspeak, reduce multi-character runs
 */
function normalizeText(text) {
  if (!text || typeof text !== "string") return "";

  let norm = text.normalize("NFKD").toLowerCase();

  // Replace leetspeak symbols
  norm = norm.split("").map(ch => LEET_MAP[ch] || ch).join("");

  // Reduce 3+ consecutive identical characters to 2 (e.g. fuuuuck -> fuuck)
  norm = norm.replace(/(.)\1{2,}/g, "$1$1");

  return norm;
}

/**
 * Collapse spaced-out letters (e.g., "f u c k" or "f.u.c.k" -> "fuck")
 */
function collapseSpacedLetters(text) {
  if (!text) return "";
  // Look for single letters separated by space or dot/dash
  return text.replace(/\b([a-z])[\s._\-*]+([a-z])[\s._\-*]+([a-z])(?:[\s._\-*]+([a-z]))?(?:[\s._\-*]+([a-z]))?\b/gi, (match) => {
    return match.replace(/[\s._\-*]/g, "");
  });
}

/**
 * Tokenize string into alphanumeric word tokens
 */
function extractTokens(text) {
  if (!text) return [];
  return text
    .split(/[^a-zA-Z0-9\u0900-\u097F]+/)
    .map(t => t.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Check if a word token matches a forbidden profanity, strictly honoring SAFE_WORDS
 */
function isProfaneToken(token, forbiddenSet) {
  if (!token || token.length < 2) return false;
  if (SAFE_WORDS.has(token)) return false;

  // Direct exact match
  if (forbiddenSet.has(token)) return true;

  // Check with single reduced letter (e.g. "fuuck" -> "fuck")
  const singleReduced = token.replace(/(.)\1+/g, "$1");
  if (forbiddenSet.has(singleReduced) && !SAFE_WORDS.has(singleReduced)) {
    return true;
  }

  return false;
}

/**
 * Check for repetition spam (e.g., same word repeated 5+ times or low vocabulary diversity)
 */
function checkRepetitionSpam(text) {
  const tokens = extractTokens(text);
  if (tokens.length < 6) return false;

  // Check if any single token occurs 5+ times in a short review
  const counts = {};
  for (const t of tokens) {
    counts[t] = (counts[t] || 0) + 1;
    if (counts[t] >= 5 && !["the", "and", "to", "for", "is", "a", "of", "in"].includes(t)) {
      return true;
    }
  }

  // Check vocabulary diversity: if > 15 words and unique words < 30%
  if (tokens.length >= 15) {
    const unique = new Set(tokens);
    if (unique.size / tokens.length < 0.3) {
      return true;
    }
  }

  // Check extreme single character runs (e.g. "aaaaaaaaaaaa" or "!!!!!!!!!!!")
  if (/(.)\1{9,}/.test(text)) {
    return true;
  }

  return false;
}

/**
 * Check for suspicious contact information (phone numbers, WhatsApp prompts)
 */
function checkContactInfo(text) {
  // 10-12 digit phone numbers with optional country code (+91, etc.)
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/;
  return phoneRegex.test(text);
}

/**
 * Check for high uppercase ratio (shouting / spam signal)
 */
function checkExcessiveCaps(text) {
  if (!text || text.length < 25) return false;
  const letters = text.replace(/[^a-zA-Z]/g, "");
  if (letters.length < 20) return false;
  const uppers = text.replace(/[^A-Z]/g, "");
  return (uppers.length / letters.length) > 0.85;
}

/**
 * Main Review Moderation Function
 * Evaluates review text, title, and author data against all clinical & safety rules.
 * 
 * @param {Object} reviewData
 * @param {string} reviewData.reviewText
 * @param {string} reviewData.reviewTitle
 * @param {string} reviewData.customerName
 * @param {string} reviewData.userEmail
 * @returns {Object} Moderation result { decision, status, reason, userMessage, matchedCategory }
 */
function moderateReview({
  reviewText = "",
  reviewTitle = "",
  customerName = "",
  userEmail = ""
} = {}) {
  const rawContent = `${reviewTitle} ${reviewText}`.trim();
  if (!rawContent) {
    return {
      decision: "REJECT",
      status: "REJECTED",
      reason: "EMPTY_CONTENT",
      userMessage: "Review content cannot be empty."
    };
  }

  // 1. Violent Threats Check
  for (const pattern of THREAT_PATTERNS) {
    if (pattern.test(rawContent)) {
      return {
        decision: "REJECT",
        status: "REJECTED",
        reason: "THREAT_VIOLENCE",
        matchedCategory: "threats",
        userMessage: "Your review contains threatening or violent language. Please remove aggressive statements before resubmitting."
      };
    }
  }

  // 2. Commercial Links, Crypto & Scam Spam Check
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(rawContent)) {
      return {
        decision: "REJECT",
        status: "REJECTED",
        reason: "COMMERCIAL_SPAM",
        matchedCategory: "spam",
        userMessage: "Reviews cannot contain promotional links, advertisements, or contact solicitations."
      };
    }
  }

  // 3. Normalized Text & De-obfuscated Forms
  const normalized = normalizeText(rawContent);
  const collapsed = collapseSpacedLetters(normalized);
  const tokens = extractTokens(normalized);
  const collapsedTokens = extractTokens(collapsed);

  const allTokens = Array.from(new Set([...tokens, ...collapsedTokens]));

  // Build sets for fast lookup
  const englishSet = new Set(ENGLISH_PROFANITIES);
  const hinglishSet = new Set(HINGLISH_PROFANITIES);
  const devanagariSet = new Set(HINDI_DEVANAGARI_PROFANITIES);
  const sexualSet = new Set(SEXUAL_EXPLICIT_TERMS);

  // 4. English Profanities Check
  for (const token of allTokens) {
    if (isProfaneToken(token, englishSet)) {
      return {
        decision: "REJECT",
        status: "REJECTED",
        reason: "PROFANITY_ENGLISH",
        matchedCategory: "profanity",
        userMessage: "Your review contains prohibited language. Please edit your review to focus on your clinical or product experience."
      };
    }
  }

  // 5. Hindi / Hinglish Profanities Check
  for (const token of allTokens) {
    if (isProfaneToken(token, hinglishSet)) {
      return {
        decision: "REJECT",
        status: "REJECTED",
        reason: "PROFANITY_HINGLISH",
        matchedCategory: "profanity",
        userMessage: "Your review contains prohibited language or abusive terms. Please edit your evaluation using professional language."
      };
    }
  }

  // 6. Hindi Devanagari Profanities Check
  for (const token of allTokens) {
    if (isProfaneToken(token, devanagariSet)) {
      return {
        decision: "REJECT",
        status: "REJECTED",
        reason: "PROFANITY_HINDI_DEVANAGARI",
        matchedCategory: "profanity",
        userMessage: "आपकी समीक्षा में अनुचित भाषा शामिल है। कृपया इसे संपादित करके पुनः प्रयास करें।"
      };
    }
  }

  // Multi-word Hindi abuse check (e.g. "teri maa ki", "maa ki chut", "suar ke pille")
  const multiWordHinglish = [
    /\bteri\s+maa\s+ki\b/i,
    /\bmaa\s+ki\s+chut\b/i,
    /\bchud\s+gaya\b/i,
    /\bsuar\s+ke\s+pille\b/i,
    /\bkutte\s+ke\s+bache\b/i,
    /\bbehen\s+ke\s+lode\b/i,
    /\bbhen\s+ke\s+lode\b/i
  ];
  for (const rx of multiWordHinglish) {
    if (rx.test(normalized) || rx.test(collapsed)) {
      return {
        decision: "REJECT",
        status: "REJECTED",
        reason: "PROFANITY_HINGLISH_PHRASE",
        matchedCategory: "profanity",
        userMessage: "Your review contains abusive phrases. Please revise your review with constructive clinical feedback."
      };
    }
  }

  // 7. Explicit Sexual / Obscene Check
  for (const token of allTokens) {
    if (isProfaneToken(token, sexualSet)) {
      return {
        decision: "REJECT",
        status: "REJECTED",
        reason: "SEXUAL_EXPLICIT",
        matchedCategory: "sexual",
        userMessage: "Your review contains sexually explicit or obscene language. Please remove it to proceed."
      };
    }
  }

  // Multi-word sexual phrase check
  const multiWordSexual = [
    /\bsex\s+video\b/i,
    /\bcall\s+girl\b/i,
    /\bescort\s+service\b/i,
    /\bnude\s+pics\b/i,
    /\bsend\s+nudes\b/i,
    /\berotic\s+massage\b/i
  ];
  for (const rx of multiWordSexual) {
    if (rx.test(normalized) || rx.test(collapsed)) {
      return {
        decision: "REJECT",
        status: "REJECTED",
        reason: "SEXUAL_EXPLICIT_PHRASE",
        matchedCategory: "sexual",
        userMessage: "Your review contains sexually explicit language. Please revise your feedback."
      };
    }
  }

  // 8. Repetition & Character Stuffing Check
  if (checkRepetitionSpam(rawContent)) {
    return {
      decision: "REJECT",
      status: "REJECTED",
      reason: "REPETITION_SPAM",
      matchedCategory: "spam",
      userMessage: "Your review contains repetitive text or character stuffing. Please submit genuine feedback."
    };
  }

  // 9. Ambiguous Signals -> QUARANTINE
  // Contact info (phone numbers)
  if (checkContactInfo(rawContent)) {
    return {
      decision: "QUARANTINE",
      status: "QUARANTINED",
      reason: "UNVERIFIED_CONTACT_INFO",
      matchedCategory: "quarantine",
      userMessage: "Thank you! Your review has been submitted and is undergoing standard safety verification before display."
    };
  }

  // Extreme capitalization
  if (checkExcessiveCaps(rawContent)) {
    return {
      decision: "QUARANTINE",
      status: "QUARANTINED",
      reason: "EXCESSIVE_CAPITALIZATION",
      matchedCategory: "quarantine",
      userMessage: "Thank you! Your review has been submitted and is undergoing standard verification before display."
    };
  }

  // 10. CLEAN REVIEW -> ALLOW
  // Legitimate criticism of DR.MEDEX, ordinary complaints, negative or positive reviews
  return {
    decision: "ALLOW",
    status: "APPROVED",
    reason: "CLEAN_EVALUATION",
    userMessage: "Your review has been published and is now live!"
  };
}

module.exports = {
  moderateReview,
  normalizeText,
  collapseSpacedLetters,
  SAFE_WORDS,
  ENGLISH_PROFANITIES,
  HINGLISH_PROFANITIES,
  HINDI_DEVANAGARI_PROFANITIES
};
