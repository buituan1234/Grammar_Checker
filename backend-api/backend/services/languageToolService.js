const axios = require('axios');

/**
 * Calls the LanguageTool API to check the grammar of a given text.
 * @param {string} text The text to check.
 * @param {string} language The language code (e.g., 'en-US', 'fr', 'de').
 * @returns {Promise<object>} The result from the LanguageTool API.
 */
async function checkGrammar(text, language) {
    const encodedParams = new URLSearchParams();

    // --- FIX ---
    // Use the 'language' parameter passed into the function instead of hardcoding 'auto'.
    // This ensures the user's selected language is respected.
    encodedParams.set('language', language);
    // -------------

    encodedParams.set('text', text);

    const options = {
        method: 'POST',
        url: 'https://languagetool.org/api/v2/check',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: encodedParams,
    };

    try {
        console.log(`Checking grammar for language: ${language}`); // Added for debugging
        const response = await axios.request(options);
        return response.data;
    } catch (error) {
        // Log the detailed error from the API for better debugging
        if (error.response) {
            console.error('Error calling LanguageTool API:', error.response.data);
        } else {
            console.error('Error calling LanguageTool API:', error.message);
        }
        throw error;
    }
}

module.exports = { checkGrammar };