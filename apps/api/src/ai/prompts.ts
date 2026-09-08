import type { CefrCode } from '@engclass/shared';

const LEVELS: Readonly<Record<CefrCode, string>> = {
  A1: 'A1',
  A2: 'A2',
  B1: 'B1',
  B2: 'B2',
  C1: 'C1',
  C2: 'C2',
};

export interface PromptInput {
  term: string;
  level: CefrCode | string;
}

export interface BuiltPrompt {
  system: string;
  user: string;
}

const SHARED_RULES = [
  'You generate vocabulary content for a Spanish-speaking learner of English.',
  'Field language contract is strict: prose fields are written in Spanish, example/usage fields are written in English (US).',
  'Never mix the two languages inside a single field. Never write the examples in Spanish.',
  'Adjust vocabulary and grammar complexity to the requested CEFR level.',
  'OUTPUT FORMAT (strict):',
  '- Reply with one and only one valid JSON object.',
  '- The first character of your reply MUST be "{" and the last MUST be "}".',
  '- Do NOT write any prose, greetings, explanations, or commentary before or after the JSON.',
  '- Do NOT wrap the JSON in markdown code fences (no ``` or ```json).',
  '- Do NOT include any chain-of-thought, reasoning, analysis, or thought blocks.',
  '- Do NOT emit <think>, <reasoning>, <thought>, or <analysis> tags. Think silently — do not output your reasoning.',
  '- Do NOT include trailing commas or single quotes; use double quotes for JSON strings.',
  'Self-check before replying: confirm your entire output starts with "{" and ends with "}", with no extra text outside the JSON.',
];

export function buildExplainPrompt({ term, level }: PromptInput): BuiltPrompt {
  const lvl = normalizeLevel(level);
  const system = [
    ...SHARED_RULES,
    `"summary" (Spanish, 1-2 short sentences, ≤ 35 words): explain the term\'s meaning and a quick usage hint for a Spanish speaker.`,
    `"examples" (English only, exactly 3 items, 8-14 words each): short natural sentences using the term in different everyday contexts.`,
    `"examplesEs" (Spanish only, exactly 3 items, same order as "examples"): a faithful Spanish translation of each English sentence.`,
    `Vary the contexts (work, daily life, travel, relationships, etc.) and demonstrate different senses when the term is polysemous.`,
    `Return JSON with this exact shape: { "summary": string, "examples": [string, string, string], "examplesEs": [string, string, string] }.`,
    `Each English sentence ≤ 120 chars. Each Spanish sentence ≤ 140 chars. Spanish summary ≤ 250 chars. Use only ASCII quotes.`,
  ].join(' ');
  const user = JSON.stringify({
    mode: 'explain',
    term,
    level: LEVELS[lvl],
  });
  return { system, user };
}

export function buildDeepenPrompt({ term, level }: PromptInput): BuiltPrompt {
  const lvl = normalizeLevel(level);
  const system = [
    ...SHARED_RULES,
    `"context" (Spanish, 1-2 short sentences, ≤ 50 words): brief contextual explanation plus a tip the learner can apply.`,
    `"collocations" (English only, 2-4 items): short English phrases the term commonly appears in.`,
    `"falseFriends" (mixed bilingual pairs, 0-2 items): each item formatted as "<english> ≠ <spanish lookalike>" when the Spanish word has a different meaning. Omit the array when no real false friends exist.`,
    `"examples" (English only, 2-3 items, 10-18 words each): advanced idiomatic or professional sentences.`,
    `"examplesEs" (Spanish only, same number and order as "examples"): a faithful Spanish translation of each English sentence.`,
    `Return JSON with this exact shape: { "context": string, "collocations": [string], "falseFriends": [string], "examples": [string], "examplesEs": [string] }.`,
    `Each English string ≤ 120 chars. Each Spanish example ≤ 140 chars. Spanish context ≤ 350 chars. Use only ASCII quotes.`,
  ].join(' ');
  const user = JSON.stringify({
    mode: 'deepen',
    term,
    level: LEVELS[lvl],
  });
  return { system, user };
}

function normalizeLevel(level: string): CefrCode {
  const value = (level ?? '').toUpperCase();
  if (value === 'A1' || value === 'A2' || value === 'B1' || value === 'B2' || value === 'C1' || value === 'C2') {
    return value;
  }
  return 'A1';
}