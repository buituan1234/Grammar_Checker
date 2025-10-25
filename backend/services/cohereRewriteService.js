// backend/services/cohereRewriteService.js

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const COHERE_API_KEY = process.env.COHERE_API_KEY;
const COHERE_API_URL = 'https://api.cohere.com/v1/chat';

if (!COHERE_API_KEY) {
    console.warn('⚠️ COHERE_API_KEY not found in environment variables');
}

const TONE_PROMPTS = {
    professional: 'Rewrite this text in a professional and formal tone:',
    casual: 'Rewrite this text in a casual and friendly tone:',
    academic: 'Rewrite this text in an academic and scholarly tone:',
    creative: 'Rewrite this text in a more creative and engaging way:',
    formal: 'Rewrite this text in a very formal and official tone:',
    simplify: 'Simplify this text to make it easier to understand:'
};

export const rewriteText = async (text, tone = 'professional') => {
    try {
        if (!text || typeof text !== 'string') {
            throw new Error('Text is required and must be a string');
        }

        if (!COHERE_API_KEY) {
            throw new Error('Cohere API key not configured');
        }

        if (!TONE_PROMPTS[tone]) {
            throw new Error(`Invalid tone. Valid options: ${Object.keys(TONE_PROMPTS).join(', ')}`);
        }

        const message = `${TONE_PROMPTS[tone]}

"${text}"

Return only the rewritten text, nothing else.`;

        console.log('[COHERE REWRITE] Sending request...', {
            textLength: text.length,
            tone,
            url: COHERE_API_URL
        });

        const response = await axios.post(
            COHERE_API_URL,
            {
                message: message
            },
            {
                headers: {
                    'Authorization': `Bearer ${COHERE_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        if (!response.data || !response.data.text) {
            console.error('[COHERE REWRITE] Invalid response:', response.data);
            throw new Error('No response from Cohere API');
        }

        const rewrittenText = response.data.text.trim();

        console.log('[COHERE REWRITE] Success', {
            originalLength: text.length,
            rewrittenLength: rewrittenText.length,
            tone
        });

        return rewrittenText;

    } catch (error) {
        console.error('[COHERE REWRITE] Error:', error.message);
        if (error.response) {
            console.error('[COHERE REWRITE] Status:', error.response.status);
            console.error('[COHERE REWRITE] Response:', error.response.data);
        }
        throw error;
    }
};

/**
 * Get available tone options
 */
export const getToneOptions = () => {
    return Object.keys(TONE_PROMPTS).map(tone => ({
        value: tone,
        label: tone.charAt(0).toUpperCase() + tone.slice(1)
    }));
};

export default {
    rewriteText,
    getToneOptions
};