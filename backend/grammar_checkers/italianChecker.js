import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class ItalianGrammarChecker {
  constructor() {
    this.rules = this.loadRules();
    this.verbConjugations = this.rules.verbConjugations || {};
    this.pronouns = this.rules.pronouns || {};
    this.articles = this.rules.articles || {};
    this.commonWords = this.rules.commonWords || {};
    this.specificRules = this.rules.specificRules || [];
  }

  loadRules() {
    try {
      const rulesPath = path.join(__dirname, 'rules', 'italian_rules.json');
      const rulesContent = fs.readFileSync(rulesPath, 'utf-8');
      return JSON.parse(rulesContent);
    } catch (error) {
      console.error('❌ Failed to load Italian rules:', error.message);
      return {
        verbConjugations: {},
        pronouns: {},
        articles: {},
        commonWords: {},
        specificRules: []
      };
    }
  }

  check(text) {
    const errors = [];

    // Check for invalid verb forms like "vano"
    this.checkInvalidVerbForms(text, errors);

    // Check specific rules
    for (const rule of this.specificRules) {
      if (rule.id === 'vano_spelling') {
        const pattern = new RegExp(`(${rule.word})`, 'gi');
        let match;
        
        while ((match = pattern.exec(text)) !== null) {
          console.log(`[Italian] Matched spelling error at index ${match.index}: "${match[0]}"`);
          errors.push({
            message: rule.message,
            shortMessage: 'Spelling error',
            offset: match.index,
            length: match[0].length,
            replacements: rule.suggestions.map(s => ({ value: s })),
            type: { typeName: 'Spelling' }
          });
        }
      }

      if (rule.id === 'lui_parco') {
        const pattern = /(Lui|lui)\s+(vano|vain)/gi;
        let match;
        
        while ((match = pattern.exec(text)) !== null) {
          console.log(`[Italian] Matched error at index ${match.index}: "${match[0]}"`);
          errors.push({
            message: rule.message,
            shortMessage: 'Spelling error',
            offset: match.index,
            length: match[0].length,
            replacements: [{ value: `Lui ${rule.correction}` }],
            type: { typeName: 'Spelling' }
          });
        }
      }
    }

    // Check multiple spaces
    this.checkMultipleSpaces(text, errors);

    return this.deduplicateErrors(errors);
  }

  checkInvalidVerbForms(text, errors) {
    // Check for invalid forms like "vano", "vain"
    const invalidForms = ['vano', 'vain', 'vanu'];
    
    for (const form of invalidForms) {
      const pattern = new RegExp(`\\b(${form})\\b`, 'gi');
      let match;
      
      while ((match = pattern.exec(text)) !== null) {
        console.log(`[Italian] Found invalid verb form "${form}" at index ${match.index}`);
        errors.push({
          message: `'${form}' is not a valid Italian verb form. Did you mean 'va' (singular) or 'vanno' (plural)?`,
          shortMessage: 'Spelling error',
          offset: match.index,
          length: match[0].length,
          replacements: [{ value: 'va' }, { value: 'vanno' }],
          type: { typeName: 'Spelling' }
        });
      }
    }
  }

  checkMultipleSpaces(text, errors) {
    const pattern = /\s{2,}/g;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      errors.push({
        message: 'Multiple consecutive spaces',
        shortMessage: 'Spacing error',
        offset: match.index,
        length: match[0].length,
        replacements: [],
        type: { typeName: 'Formatting' }
      });
    }
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

export default ItalianGrammarChecker;