import type { Guardrail } from "./types.ts";

// Surface-level signals that a message is asking about pop-culture, sports,
// gossip, recipes, or other non-academic chitchat. Aggressive on purpose:
// false positives just mean "tutor redirected to subject," which is on-brand.
const OFF_TOPIC_PATTERNS: RegExp[] = [
  // Music, songs, artists
  /\b(songs?|playlist|album|lyric|spotify|apple\s*music)\b/i,
  /\btaylor\s*swift|beyonc[eé]|drake|kanye|bts|ariana\s*grande|kendrick|sza|olivia\s*rodrigo\b/i,
  // Movies, TV, celebs
  /\b(movies?|films?|tv\s*shows?|netflix|disney\+?|hulu|prime\s*video)\b/i,
  /\b(actors?|actress|celebrit(?:y|ies)|gossip)\b/i,
  // Sports, games (entertainment), streamers
  /\b(nba|nfl|fifa|world\s*cup|super\s*bowl|olympics?)\b/i,
  /\b(fortnite|minecraft|roblox|valorant|league\s*of\s*legends|call\s*of\s*duty)\b/i,
  /\b(streamer|youtuber|tiktok(?:er)?|influencer)\b/i,
  // Recommendation patterns
  /\b(recommend|suggest)\s+(?:me\s+)?(?:some|a|any)?\s*(songs?|movies?|shows?|books?|games?|artists?|bands?|playlists?)\b/i,
  /what(?:'?s|\s+is)\s+your\s+favorite\s+(song|movie|show|book|color|food|game|band|artist)/i,
  // Personal life chitchat
  /\b(crush|dating|boyfriend|girlfriend|relationship)\b/i,
  // Food / lifestyle
  /\b(recipe|cook(?:ing)?|restaurant|fashion|outfit)\b/i,
  // Generic "tell me about X celebrity / band"
  /\btell me about\s+(taylor\s*swift|beyonc[eé]|drake|the\s+beatles|bts)\b/i,
];

// If a message contains any of these, even alongside the patterns above, give
// it the benefit of the doubt — it's probably a genuine subject question that
// uses a pop-culture example as flavor.
const ON_TOPIC_ANCHORS: RegExp[] = [
  // Math vocabulary
  /\b(equation|solve|simplif(?:y|ied)|factor|derivativ|integral|graph|formula|theorem|proof|polynomial|algebra|geometry|calculus|trigonom|logarithm|matrix|vector|probability|statistic|fraction|decimal|percent|exponent|variable|inequality|sequence|series|limit)\b/i,
  /\d\s*[+\-*/=<>]\s*\d/, // any visible arithmetic
  /\b(area|perimeter|volume|circumference|diameter|radius|hypotenuse|angle|degrees?|radians?)\b/i,
  /\b(sum|product|quotient|remainder|slope|intercept|mean|median|mode|standard\s+deviation)\b/i,
  // Science vocabulary
  /\b(atom|molecule|element|compound|reaction|chemical|chemistr|physics|biolog|cell|organism|ecosystem|evolution|gravity|force|energy|momentum|velocity|acceleration|mass|electron|proton|neutron|photosynthesis|mitosis|dna|genetic)\b/i,
  /\b(experiment|hypothesis|observation|theory|law\s+of)\b/i,
  // Writing vocabulary
  /\b(essay|paragraph|thesis|introduction|conclusion|argument|claim|evidence|draft|revise|revision|edit|grammar|punctuation|sentence|prose|narrative|persuasive|expository|analytical|composition|writing|wrote|writes|outline|topic\s+sentence|transition|citation|cite|bibliograph)\b/i,
];

const SUBJECT_LABEL: Record<"math" | "science" | "writing", string> = {
  math: "math",
  science: "science",
  writing: "writing",
};

function looksOnTopic(text: string): boolean {
  return ON_TOPIC_ANCHORS.some((r) => r.test(text));
}

function looksOffTopic(text: string): boolean {
  return OFF_TOPIC_PATTERNS.some((r) => r.test(text));
}

export const offTopicGuardrail: Guardrail = {
  name: "off-topic",
  phase: "inbound",
  priority: 20,
  async check(ctx) {
    const text = ctx.userMessage;
    if (!looksOffTopic(text)) return { action: "pass" };
    if (looksOnTopic(text)) return { action: "pass" };

    const subjectName = SUBJECT_LABEL[ctx.subject];
    const hasPriorWork = ctx.history.some((m) => m.role === "assistant");
    const ask =
      ctx.subject === "writing"
        ? "What would you like to work on — a piece you're drafting, or something specific to ask?"
        : `What ${subjectName} question would you like to tackle? Even a small one is fine.`;

    const message = hasPriorWork
      ? `We're working on ${subjectName} right now — let's stay with that.\n\nWant to pick up where we left off, or start something new?`
      : `We're here to work on ${subjectName} together — let's start there.\n\n${ask}`;

    return {
      action: "replace",
      message,
      modeBanner: "Refocusing",
    };
  },
};
