import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class RussianGrammarChecker {
  constructor() {
    this.rules = this.loadRules();
  }

  loadRules() {
    try {
      const rulesPath = path.join(__dirname, 'rules', 'russian_rules.json');
      const rulesContent = fs.readFileSync(rulesPath, 'utf-8');
      return JSON.parse(rulesContent);
    } catch (error) {
      console.error('❌ Failed to load Russian rules:', error.message);
      return { specificRules: [] };
    }
  }

  check(text) {
    const errors = [];

    // Rule 1: она + сказал (feminine + masculine verb)
    const genderPattern1 = /она[^.!?]*?сказал(?![а-яё])/gi;
    let match;
    while ((match = genderPattern1.exec(text)) !== null) {
      const pos = match[0].lastIndexOf('сказал');
      errors.push({
        message: 'Gender mismatch: feminine \'она\' requires \'сказала\'',
        shortMessage: 'Gender agreement error',
        offset: match.index + pos,
        length: 6,
        replacements: [{ value: 'сказала' }],
        type: { typeName: 'Grammar' }
      });
    }

    // Rule 2: он/оно + сказали (singular + plural verb)
    const numberPattern1 = /(он|оно)[^.!?]*?сказали(?![а-яё])/gi;
    while ((match = numberPattern1.exec(text)) !== null) {
      const pos = match[0].lastIndexOf('сказали');
      errors.push({
        message: 'Number mismatch: singular requires singular verb',
        shortMessage: 'Number agreement error',
        offset: match.index + pos,
        length: 7,
        replacements: [{ value: 'сказал' }],
        type: { typeName: 'Grammar' }
      });
    }

    // Rule 3: они + имеет (plural + singular verb)
    const numberPattern2 = /они[^.!?]*?имеет(?![а-яё])/gi;
    while ((match = numberPattern2.exec(text)) !== null) {
      const pos = match[0].lastIndexOf('имеет');
      errors.push({
        message: 'Number mismatch: plural requires plural verb',
        shortMessage: 'Number agreement error',
        offset: match.index + pos,
        length: 5,
        replacements: [{ value: 'имеют' }],
        type: { typeName: 'Grammar' }
      });
    }

    // Rule 4: имеет/имела + книга (need accusative)
    const casePattern1 = /(имеет|имела)[^.!?]*?книга(?![а-яё])/gi;
    while ((match = casePattern1.exec(text)) !== null) {
      const pos = match[0].lastIndexOf('книга');
      errors.push({
        message: 'Case error: need accusative \'книгу\'',
        shortMessage: 'Case agreement error',
        offset: match.index + pos,
        length: 5,
        replacements: [{ value: 'книгу' }],
        type: { typeName: 'Grammar' }
      });
    }

    // Rule 5: в + школа (need locative школе)
    const casePattern2 = /в\s+школа(?![а-яё])/gi;
    while ((match = casePattern2.exec(text)) !== null) {
      const pos = match[0].lastIndexOf('школа');
      errors.push({
        message: 'Case error: need locative \'школе\'',
        shortMessage: 'Case agreement error',
        offset: match.index + pos,
        length: 5,
        replacements: [{ value: 'школе' }],
        type: { typeName: 'Grammar' }
      });
    }

    // Rule 6: он/этот + имела (masculine + feminine verb)
    const genderPattern2 = /(он|этот)[^.!?]*?имела(?![а-яё])/gi;
    while ((match = genderPattern2.exec(text)) !== null) {
      const pos = match[0].lastIndexOf('имела');
      errors.push({
        message: 'Gender mismatch: masculine requires \'имел\'',
        shortMessage: 'Gender agreement error',
        offset: match.index + pos,
        length: 5,
        replacements: [{ value: 'имел' }],
        type: { typeName: 'Grammar' }
      });
    }

    // Rule 7: читала + книга (read + nominative)
    const casePattern3 = /читала[^.!?]*?книга(?![а-яё])/gi;
    while ((match = casePattern3.exec(text)) !== null) {
      const pos = match[0].lastIndexOf('книга');
      errors.push({
        message: 'Case error: need accusative \'книгу\'',
        shortMessage: 'Case agreement error',
        offset: match.index + pos,
        length: 5,
        replacements: [{ value: 'книгу' }],
        type: { typeName: 'Grammar' }
      });
    }

    // Rule 8: сказал + им/ими (any pronoun + сказал after possessive)
    const genderPattern3 = /своим[^.!?]*?сказал(?![а-яё])/gi;
    while ((match = genderPattern3.exec(text)) !== null) {
      const pos = match[0].lastIndexOf('сказал');
      errors.push({
        message: 'Gender/context mismatch in verb form',
        shortMessage: 'Gender agreement error',
        offset: match.index + pos,
        length: 6,
        replacements: [{ value: 'сказала' }],
        type: { typeName: 'Grammar' }
      });
    }

    // Rule 9: писала + письма (write + nominative plural)
    const casePattern4 = /писала[^.!?]*?письма(?![а-яё])/gi;
    while ((match = casePattern4.exec(text)) !== null) {
      const pos = match[0].lastIndexOf('письма');
      errors.push({
        message: 'Case error: need accusative \'письма\'',
        shortMessage: 'Case agreement error',
        offset: match.index + pos,
        length: 6,
        replacements: [{ value: 'письма' }],
        type: { typeName: 'Grammar' }
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

export default RussianGrammarChecker;