import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class ChineseGrammarChecker {
  constructor() {
    this.rules = this.loadRules();
    this.measureRules = {
      '苹果': ['个'],
      '鱼': ['条'],
      '书': ['本'],
      '猫': ['只'],
      '狗': ['只'],
      '鸡': ['只'],
      '人': ['个'],
      '东西': ['个'],
      '问题': ['个'],
      '学生': ['个'],
      '女孩': ['个'],
      '男孩': ['个']
    };
  }

  loadRules() {
    try {
      const rulesPath = path.join(__dirname, 'rules', 'chinese_rules.json');
      const rulesContent = fs.readFileSync(rulesPath, 'utf-8');
      return JSON.parse(rulesContent);
    } catch (error) {
      console.error('❌ Failed to load Chinese rules:', error.message);
      return { measureWords: {}, particles: {}, errorPatterns: [], commonMistakes: [], nounExamples: [] };
    }
  }

  check(text) {
    const errors = [];
    this.checkDuplicateParticles(text, errors);
    this.checkMeasureWordsAdvanced(text, errors);
    return this.deduplicateErrors(errors);
  }

  checkDuplicateParticles(text, errors) {
    // Check for duplicate 的
    let match;
    const dePattern = /的{2,}/g;
    while ((match = dePattern.exec(text)) !== null) {
      errors.push({
        message: 'Duplicate particle \'的\'',
        shortMessage: 'Duplicate word',
        offset: match.index,
        length: match[0].length,
        replacements: [{ value: '的' }],
        type: { typeName: 'Grammar' }
      });
    }

    // Check for duplicate 了
    const lePattern = /了{2,}/g;
    while ((match = lePattern.exec(text)) !== null) {
      errors.push({
        message: 'Duplicate particle \'了\'',
        shortMessage: 'Duplicate word',
        offset: match.index,
        length: match[0].length,
        replacements: [{ value: '了' }],
        type: { typeName: 'Grammar' }
      });
    }

    // Check for duplicate 在
    const zaiPattern = /在{2,}/g;
    while ((match = zaiPattern.exec(text)) !== null) {
      errors.push({
        message: 'Duplicate particle \'在\'',
        shortMessage: 'Duplicate word',
        offset: match.index,
        length: match[0].length,
        replacements: [{ value: '在' }],
        type: { typeName: 'Grammar' }
      });
    }
  }

  checkMeasureWordsAdvanced(text, errors) {
    // Split by common separators but preserve position info
    const separators = ['和', '、', '，', ',', '与'];
    
    // Find all number + measureword + noun patterns anywhere in text
    const allPatterns = /([一二三四五六七八九十0-9零]+)\s*([个本只辆件张条对队组块片场种族群]?)\s*([^\s\d个本只辆件张条对队组块片场种族群，、。!！?？；:：]+)/g;
    
    let match;
    const processedOffsets = new Set();

    while ((match = allPatterns.exec(text)) !== null) {
      const number = match[1];
      const measureWord = match[2];
      const noun = match[3];
      const offset = match.index;

      // Skip if already processed
      if (processedOffsets.has(offset)) continue;
      processedOffsets.add(offset);

      // Check if this is a known noun
      if (!this.measureRules[noun]) continue;

      const correctMeasure = this.measureRules[noun][0];
      const measureOffset = offset + number.length;

      // Case 1: Wrong measure word
      if (measureWord && measureWord !== correctMeasure) {
        errors.push({
          message: `Wrong measure word: '${noun}' needs '${correctMeasure}' not '${measureWord}'`,
          shortMessage: 'Wrong measure word',
          offset: measureOffset,
          length: measureWord.length,
          replacements: [{ value: correctMeasure }],
          type: { typeName: 'Grammar' }
        });
      }
      // Case 2: Missing measure word
      else if (!measureWord && noun) {
        errors.push({
          message: `Missing measure word: '${noun}' needs '${correctMeasure}'`,
          shortMessage: 'Missing measure word',
          offset: measureOffset,
          length: noun.length,
          replacements: [{ value: `${correctMeasure}${noun}` }],
          type: { typeName: 'Grammar' }
        });
      }
    }

    // Additional specific pattern matching for tricky cases
    // Find "数字+本+苹果" pattern
    const applePattern = /([一二三四五六七八九十0-9零]+)\s*本\s*苹果/g;
    while ((match = applePattern.exec(text)) !== null) {
      const number = match[1];
      const measureOffset = match.index + number.length;
      
      if (!processedOffsets.has(match.index)) {
        errors.push({
          message: 'Wrong measure word: \'苹果\' needs \'个\' not \'本\'',
          shortMessage: 'Wrong measure word',
          offset: measureOffset,
          length: 1,
          replacements: [{ value: '个' }],
          type: { typeName: 'Grammar' }
        });
        processedOffsets.add(match.index);
      }
    }

    // Find "数字+只+书" pattern
    const bookPattern = /([一二三四五六七八九十0-9零]+)\s*只\s*书/g;
    while ((match = bookPattern.exec(text)) !== null) {
      const number = match[1];
      const measureOffset = match.index + number.length;
      
      if (!processedOffsets.has(match.index)) {
        errors.push({
          message: 'Wrong measure word: \'书\' needs \'本\' not \'只\'',
          shortMessage: 'Wrong measure word',
          offset: measureOffset,
          length: 1,
          replacements: [{ value: '本' }],
          type: { typeName: 'Grammar' }
        });
        processedOffsets.add(match.index);
      }
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

export default ChineseGrammarChecker;