// backend/grammar_checkers/index.js
import RussianGrammarChecker from './russianChecker.js';
import ChineseGrammarChecker from './chineseChecker.js';
import JapaneseGrammarChecker from './japaneseChecker.js';
import SpanishGrammarChecker from './spanishChecker.js';
import ItalianGrammarChecker from './italianChecker.js';

class GrammarCheckerFactory {
  static getChecker(language) {
    switch (language) {
      case 'ru-RU':
      case 'ru':
        return new RussianGrammarChecker();
      
      case 'zh-CN':
      case 'zh':
        return new ChineseGrammarChecker();
      
      case 'ja-JP':
      case 'ja':
        return new JapaneseGrammarChecker();
      
      case 'es-ES':
      case 'es':
        return new SpanishGrammarChecker();
      
      case 'it-IT':
      case 'it':
        return new ItalianGrammarChecker();
      
      default:
        return null;
    }
  }

  static check(text, language) {
    const checker = this.getChecker(language);
    if (!checker) {
      return {
        success: false,
        error: `Grammar checker not available for language: ${language}`
      };
    }

    try {
      const matches = checker.check(text);
      return {
        success: true,
        matches,
        language,
        source: 'custom-grammar-checker'
      };
    } catch (error) {
      console.error(`Error in grammar checker for ${language}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default GrammarCheckerFactory;