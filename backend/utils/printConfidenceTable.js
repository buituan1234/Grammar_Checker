// backend/utils/printConfidenceTable.js

function getConfidenceLevel(score) {
  if (typeof score !== 'number') return 'Unknown';
  if (score >= 0.9) return '✅ Very High';
  if (score >= 0.7) return '🟡 Medium';
  if (score >= 0.5) return '🔴 Low';
  return '⚪️ Very Low';
}

export function printConfidenceTable(matches) {
  if (!Array.isArray(matches) || matches.length === 0) {
    console.log('✅ No grammar issues found.');
    return;
  }

  const tableData = matches.map((match, index) => {
    const confidence = match.rule?.confidence ?? 'N/A';
    const level = getConfidenceLevel(confidence);
    const suggestions = match.replacements.map(r => r.value).join(', ');
    return {
      '#': index + 1,
      Message: match.message,
      Confidence: typeof confidence === 'number' ? confidence.toFixed(2) : 'N/A',
      Level: level,
      Suggestions: suggestions
    };
  });

  console.log('\n📊 Grammar Check Confidence Table:\n');
  console.table(tableData);
}
