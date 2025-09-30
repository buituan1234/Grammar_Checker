// backend/test-language-detection.js
import languageToolService from './services/languageToolService.js';
import { testLanguageDetection } from './services/languageDetectionService.js';

async function testIntegration() {
  console.log('🚀 Testing LanguageTool Service Integration');
  console.log('='.repeat(60));

  // Test 1: Health Check
  console.log('\n1️⃣ Health Check');
  try {
    const health = await languageToolService.healthCheck();
    console.log('Health Status:', JSON.stringify(health, null, 2));
  } catch (error) {
    console.error('Health check failed:', error.message);
  }

  // Test 2: Auto Language Detection + Grammar Check
  console.log('\n2️⃣ Auto Language Detection + Grammar Check');
  const testTexts = [
    "This are a grammar mistake.",
    "Bonjour, j'ai une erreur de grammaire ici.",
    "Hola, esto es una prueba con errores.",
    "Guten Tag, das ist ein Test mit Fehler.",
  ];

  for (const text of testTexts) {
    try {
      console.log(`\n📝 Testing: "${text}"`);
      const result = await languageToolService.checkGrammar(text, 'auto');
      
      console.log(`🔍 Language: ${result.language?.name || 'Unknown'} (${result.language?.code || 'N/A'})`);
      
      if (result.language_detection) {
        console.log(`🤖 Detection: ${result.language_detection.detected_language} -> ${result.language_detection.source} (${result.language_detection.detection_time_ms}ms)`);
      }
      
      console.log(`⚡ Performance: ${result.performance?.response_time_ms}ms`);
      console.log(`❌ Issues found: ${result.matches?.length || 0}`);
      
      if (result.matches && result.matches.length > 0) {
        result.matches.slice(0, 2).forEach((match, i) => {
          console.log(`   ${i + 1}. ${match.message}`);
          if (match.replacements?.[0]) {
            console.log(`      Suggestion: "${match.replacements[0].value}"`);
          }
        });
      }
    } catch (error) {
      console.error(`❌ Error testing "${text}":`, error.message);
    }
  }

  // Test 3: Language Detection Stats
  console.log('\n3️⃣ Language Detection Service Stats');
  try {
    const stats = languageToolService.getLanguageDetectionStats();
    console.log('Stats:', JSON.stringify(stats, null, 2));
  } catch (error) {
    console.error('Failed to get stats:', error.message);
  }

  // Test 4: Standalone Language Detection Service Test
  console.log('\n4️⃣ Standalone Language Detection Service Test');
  try {
    await testLanguageDetection();
  } catch (error) {
    console.error('Standalone test failed:', error.message);
  }

  console.log('\n✅ Integration test completed!');
}

// Run the test
testIntegration().catch(error => {
  console.error('Integration test failed:', error);
  process.exit(1);
});