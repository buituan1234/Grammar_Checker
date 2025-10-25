import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class JapaneseGrammarChecker {
  constructor() {
    this.rules = this.loadRules();
    this.particleRules = this.rules.particleRules || {};
    this.particles = this.rules.particles || [];
    this.verbEndings = this.rules.verbEndings || {};
    this.errorPatterns = this.rules.errorPatterns || [];
    this.invalidSequences = this.rules.invalidSequences || [];
    this.characterRanges = this.rules.characterRanges || {};
  }

  loadRules() {
    try {
      const rulesPath = path.join(__dirname, 'rules', 'japanese_rules.json');
      const rulesContent = fs.readFileSync(rulesPath, 'utf-8');
      return JSON.parse(rulesContent);
    } catch (error) {
      console.error('❌ Failed to load Japanese rules:', error.message);
      return {
        particleRules: {},
        particles: [],
        verbEndings: {},
        errorPatterns: [],
        invalidSequences: [],
        characterRanges: {}
      };
    }
  }

  isJapanese(text) {
    const hiragana = new RegExp(this.characterRanges.hiragana);
    const katakana = new RegExp(this.characterRanges.katakana);
    const kanji = new RegExp(this.characterRanges.kanji);
    return hiragana.test(text) || katakana.test(text) || kanji.test(text);
  }

  check(text) {
    const errors = [];

    if (!this.isJapanese(text)) {
      return errors;
    }

    // Check 1: Double particles (always report)
    for (const particle of this.particles) {
      const doublePattern = new RegExp(particle + particle, 'g');
      let match;
      while ((match = doublePattern.exec(text)) !== null) {
        errors.push({
          message: `Double particle '${particle}' detected`,
          shortMessage: 'Duplicate particle',
          offset: match.index,
          length: 2,
          replacements: [{ value: particle }],
          type: { typeName: 'Grammar' }
        });
      }
    }

    // Check 2: Invalid particle sequences (always report)
    for (const seq of this.invalidSequences) {
      const pattern = new RegExp(seq.sequence.replace(/ /g, '\\s*'), 'g');
      let match;
      while ((match = pattern.exec(text)) !== null) {
        errors.push({
          message: seq.reason,
          shortMessage: 'Particle conflict',
          offset: match.index,
          length: match[0].length,
          replacements: [],
          type: { typeName: 'Grammar' }
        });
      }
    }

    // Check 3: Missing punctuation - STRICT conditions
    // Only flag if ALL conditions are met:
    // 1. Text ends with verb form (ます, た, です) - clear sentence end
    // 2. No punctuation at the very end
    // 3. Text is substantial (> 10 chars)
    // 4. Has at least one particle (is a structured sentence)
    
    const endsWithVerbForm = /(ます|ました|ている|た|です)$/.test(text);
    const hasNoPunctuation = !/(。|！|？)$/.test(text);
    const hasParticles = /(は|を|に|へ|で|から|まで|も|より|と|や)/.test(text);
    
    if (text.length > 10 && endsWithVerbForm && hasNoPunctuation && hasParticles) {
      errors.push({
        message: 'Missing sentence-ending punctuation',
        shortMessage: 'Punctuation error',
        offset: text.length - 1,
        length: 1,
        replacements: [{ value: '。' }],
        type: { typeName: 'Punctuation' }
      });
    }

    return this.deduplicateErrors(errors);
  }

  deduplicateErrors(errors) {
    const uniqueErrors = [];
    const seen = new Set();
    
    for (const error of errors) {
      const key = `${error.offset}-${error.length}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueErrors.push(error);
      }
    }

    return uniqueErrors;
  }
}

export default JapaneseGrammarChecker;