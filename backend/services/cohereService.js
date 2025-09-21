import { CohereClient } from 'cohere-ai';

const apiKey = process.env.COHERE_API_KEY;
let cohere = null;

if (apiKey?.trim()) {
  cohere = new CohereClient({ token: apiKey });
  console.log('✅ Cohere client initialized.');
} else {
  console.warn('⚠️ COHERE_API_KEY not found. Cohere will not be used.');
}

export async function fallbackCheckWithCohere(text) {
  if (!cohere) return [];

  try {
    console.log("📝 Checking with Cohere:", JSON.stringify(text));

    const prompt = `
You are an English grammar correction expert. Analyze the following text.

Instructions:
- Only identify grammar, spelling, punctuation, or capitalization mistakes.
- For each issue, output EXACTLY 1 line using this strict format:
  original | correction | explanation
- The "original" must be a word or phrase from the input.
- The "correction" must differ from the original.
- The "explanation" must be brief.
- Do NOT repeat same word (e.g., "had ➝ had").
- Do NOT rewrite entire sentence.
- Do NOT return full sentence corrections.

Example:
Input: she have went to the store yesterday
Output:
have | had | Use "had" for past perfect tense.
went | gone | "Gone" is the correct past participle.
(no period) | . | Add a period at the end.

Now correct this:
"""${text}"""`;
console.log("📤 Prompt sent to Cohere:\n", prompt);

    const response = await cohere.generate({
      model: 'command',
      prompt,
      maxTokens: 500,
      temperature: 0.1,
    });

    const raw = response.generations?.[0]?.text || '';
    console.log('📤 Cohere raw response:\n', raw);

    const matches = [];
    const usedOffsets = new Set();
    const regex = /^(.+?)\s*\|\s*(.+?)\s*\|\s*(.+)$/gm;
    let match;

    while ((match = regex.exec(raw)) !== null) {
      const original = match[1].trim();
      const replacement = match[2].trim();
      const explanation = match[3].trim();

      if (!original || original === replacement) continue;

      let offset = -1;
      let searchStart = 0;
      while (true) {
        offset = text.indexOf(original, searchStart);
        if (offset === -1 || !usedOffsets.has(offset)) break;
        searchStart = offset + 1;
      }

      if (offset === -1) continue;
      usedOffsets.add(offset);

      matches.push({
        offset,
        length: original.length,
        message: explanation,
        replacements: [{ value: replacement }],
      });
    }

    console.log('✅ Parsed matches:', matches);
    return matches;
  } catch (error) {
    console.error('❌ Cohere fallbackCheck error:', error);
    return [];
  }
}

const validationCache = new Map();

export async function validateCorrectionsWithCohere(text, matches) {
  if (!cohere || !Array.isArray(matches) || matches.length === 0) return [];

  const cacheKey = `${text}_${JSON.stringify(matches)}`;
  if (validationCache.has(cacheKey)) return validationCache.get(cacheKey);

  try {
    const suggestionsList = matches.map((m, index) => {
      const original = text.slice(m.offset, m.offset + m.length);
      const replacement = m.replacements?.[0]?.value || '[No suggestion]';
      return `${index + 1}. ${original} ➝ ${replacement}`;
    }).join('\n');

    const prompt = `You are a grammar expert. Validate if the following suggestions are correct.

Text:
${text}

Suggestions:
${suggestionsList}

Reply only with valid suggestions in format:
original ➝ replacement`;

    const response = await cohere.generate({
      model: 'command',
      prompt,
      maxTokens: 500,
      temperature: 0.2,
    });

    const raw = response.generations?.[0]?.text || '';
    console.log('📤 Cohere validation raw response:\n', raw);

    const validated = raw.match(/(.+?)\s*➝\s*(.+)/g) || [];
    const confirmed = validated.map(v => {
      const parts = v.match(/(.+?)\s*➝\s*(.+)/);
      return {
        from: parts[1].trim(),
        to: parts[2].trim()
      };
    });

    const filteredMatches = matches.map(m => {
      const original = text.slice(m.offset, m.offset + m.length);
      const confirmedCorrection = confirmed.find(c => c.from === original && c.from !== c.to);
      if (confirmedCorrection) {
        return {
          ...m,
          replacements: [{ value: confirmedCorrection.to }]
        };
      } else {
        console.log(`🗑️ Removed invalid or duplicate suggestion: "${original}" ➝ "${m.replacements?.[0]?.value}"`);
        return null;
      }
    }).filter(Boolean);

    validationCache.set(cacheKey, filteredMatches);
    return filteredMatches;
  } catch (error) {
    console.error('❌ Cohere validation error:', error);
    return [];
  }
}
