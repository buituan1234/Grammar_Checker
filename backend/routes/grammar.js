import express from 'express';
import languageToolService from '../services/languageToolService.js';
import { fallbackCheckWithCohere, validateCorrectionsWithCohere } from '../services/cohereService.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

/**
 * Detect language from input text
 */
router.post('/detect', async (req, res) => {
  const { text } = req.body;

  try {
    const lang = await languageToolService.detectLanguage(text);
    res.json({ success: true, language: lang });
  } catch (error) {
    console.error('❌ Language detection failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get supported languages
 */
router.get('/languages', async (req, res) => {
  try {
    const languages = await languageToolService.getLanguages();
    res.json({ success: true, data: { languages } });
  } catch (error) {
    console.error('❌ Failed to fetch languages:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Check grammar: Cohere → Validate by LT → fallback LT if necessary
 */
router.post('/check', async (req, res) => {
  const { text, language = 'auto' } = req.body;

  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ success: false, error: 'Missing or invalid text.' });
  }

  try {
    const normalizedLang = language === 'auto' ? 'en' : language;
    const cohereStart = Date.now();

    // Step 1: Use Cohere to detect suggestions
    const cohereMatches = await fallbackCheckWithCohere(text);
    console.log(`✅ Cohere returned ${cohereMatches.length} matches in ${Date.now() - cohereStart} ms.`);

    // Step 2: Validate Cohere's suggestions using LanguageTool
    const validatedCohereMatches = await languageToolService.validateCohereSuggestions(text, cohereMatches);
    const validationTime = Date.now() - cohereStart;
    console.log(`✅ LanguageTool validated ${validatedCohereMatches.length} matches in ${validationTime} ms.`);

    // Step 3: If Cohere didn't find anything, fallback to full LanguageTool check
    let ltResult = { matches: [] };

    if (!validatedCohereMatches.length) {
      const ltStart = Date.now();
      ltResult = await languageToolService.checkGrammar(text, normalizedLang);
      console.log(`✅ LanguageTool returned ${ltResult.matches.length} matches in ${Date.now() - ltStart} ms.`);
    } else {
      console.log('⚠️ Skipping full LanguageTool check because Cohere found issues.');
    }

    const finalMatches = [...validatedCohereMatches];

    // Merge additional LT suggestions (avoid duplicate offset-length)
    if (ltResult?.matches?.length) {
      const existingOffsets = new Set(finalMatches.map(m => `${m.offset}-${m.length}`));
      for (const m of ltResult.matches) {
        const key = `${m.offset}-${m.length}`;
        if (!existingOffsets.has(key)) {
          finalMatches.push({
            ...m,
            source: 'languagetool',
            replacements: m.replacements?.map(r => ({ value: r.value }))
          });
        }
      }
    }

    return res.json({ success: true, data: { matches: finalMatches } });

  } catch (error) {
    console.error('❌ Grammar check failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
