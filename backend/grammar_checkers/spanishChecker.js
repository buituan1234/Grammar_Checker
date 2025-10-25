import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class SpanishGrammarChecker {
  constructor() {
    this.rules = this.loadRules();
    this.verbConjugations = this.rules.verbConjugations || {};
    this.pronouns = this.rules.pronouns || {};
    this.articles = this.rules.articles || {};
    this.specificRules = this.rules.specificRules || [];
    
    // Singular subjects that should use singular verbs (va, es, está)
    this.singularSubjects = ['el', 'la', 'un', 'una', 'este', 'ese', 'aquél'];
    this.singularVerbs = ['va', 'es', 'está', 'tiene', 'hace'];
    this.pluralVerbs = ['van', 'son', 'están', 'tienen', 'hacen'];
  }

  loadRules() {
    try {
      const rulesPath = path.join(__dirname, 'rules', 'spanish_rules.json');
      const rulesContent = fs.readFileSync(rulesPath, 'utf-8');
      return JSON.parse(rulesContent);
    } catch (error) {
      console.error('❌ Failed to load Spanish rules:', error.message);
      return {
        verbConjugations: {},
        pronouns: {},
        articles: {},
        specificRules: []
      };
    }
  }

  check(text) {
    const errors = [];
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    let offsetAdjustment = 0;

    for (const sentence of sentences) {
      const sentenceErrors = this.checkSentence(sentence, offsetAdjustment);
      errors.push(...sentenceErrors);
      offsetAdjustment += sentence.length;
    }

    return this.deduplicateErrors(errors);
  }

  checkSentence(sentence, baseOffset = 0) {
    const errors = [];
    const words = sentence.trim().split(/\s+/);
    const lowerWords = words.map(w => w.toLowerCase().replace(/[,.!?;:]/g, ''));

    // Pattern: [article/subject] + noun + [plural verb] → should be singular
    for (let i = 0; i < words.length - 2; i++) {
      const currentWord = lowerWords[i];
      const nextWord = lowerWords[i + 1];
      const thirdWord = lowerWords[i + 2];

      // Check for: article/singular subject + noun + plural verb
      if (this.singularSubjects.includes(currentWord)) {
        // Look ahead for plural verbs (van, son, están, tienen, hacen)
        for (let j = i + 2; j < Math.min(i + 6, words.length); j++) {
          const checkWord = lowerWords[j];
          
          if (this.pluralVerbs.includes(checkWord)) {
            // Found singular subject followed by plural verb
            const singularForm = this.getPluralToSingular(checkWord);
            const matchOffset = sentence.indexOf(checkWord);
            
            errors.push({
              message: `Subject-verb agreement error: singular subject requires singular verb '${singularForm}' instead of '${checkWord}'`,
              shortMessage: 'Subject-verb agreement error',
              offset: baseOffset + matchOffset,
              length: checkWord.length,
              replacements: [{ value: singularForm }],
              type: { typeName: 'Grammar' }
            });
            break;
          }
        }
      }

      // Also check for proper nouns or implicit subjects
      // Pattern: [noun] + [plural verb for singular context]
      if (i > 0 && this.singularSubjects.includes(lowerWords[i - 1])) {
        if (this.pluralVerbs.includes(nextWord)) {
          const singularForm = this.getPluralToSingular(nextWord);
          const matchOffset = sentence.indexOf(nextWord);
          
          errors.push({
            message: `Subject-verb agreement error: singular subject requires singular verb '${singularForm}' instead of '${nextWord}'`,
            shortMessage: 'Subject-verb agreement error',
            offset: baseOffset + matchOffset,
            length: nextWord.length,
            replacements: [{ value: singularForm }],
            type: { typeName: 'Grammar' }
          });
        }
      }
    }

    return errors;
  }

  getPluralToSingular(pluralVerb) {
    const map = {
      'van': 'va',
      'son': 'es',
      'están': 'está',
      'tienen': 'tiene',
      'hacen': 'hace',
      'vamos': 'voy',
      'somos': 'soy',
      'estamos': 'estoy'
    };
    return map[pluralVerb] || pluralVerb;
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

export default SpanishGrammarChecker;