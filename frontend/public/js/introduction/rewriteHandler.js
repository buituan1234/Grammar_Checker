// frontend/public/js/introduction/rewriteHandler.js

import { resetBodyOpacity } from './uiComponents.js';

// ========== SHOW/HIDE SECTIONS ==========

function showRewriteSection() {
    // CRITICAL FIX: Reset body opacity immediately using helper
    resetBodyOpacity();
    
    // Force hide all overlays
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
    
    const usageLimitModal = document.getElementById('usageLimitModal');
    if (usageLimitModal) {
        usageLimitModal.style.display = 'none';
    }
    
    // Ẩn ONLY hero section (thay thế bằng rewrite section)
    const heroSection = document.getElementById('home');
    if (heroSection) {
        heroSection.style.display = 'none';
    }

    // GIỮ NGUYÊN các section khác (about, features, testimonials, faq, contact)
    // KHÔNG ẩn chúng nữa!

    // Hiển thị rewrite section với FLEX để thay thế hero
    const rewriteSection = document.getElementById('rewrite-section');
    if (rewriteSection) {
        rewriteSection.style.display = 'flex';
        
        // Scroll to top để thấy rewrite section
        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
    }
}

function hideRewriteSection() {
    // CRITICAL FIX: Reset body opacity when going back
    resetBodyOpacity();
    
    // Hiển thị lại hero section (thay thế rewrite section)
    const heroSection = document.getElementById('home');
    if (heroSection) {
        heroSection.style.display = 'flex';
    }

    // GIỮ NGUYÊN các section khác - không cần hiển thị lại vì chúng không bị ẩn
    // Sections about, features, testimonials, faq vẫn ở đó!

    // Ẩn rewrite section
    const rewriteSection = document.getElementById('rewrite-section');
    if (rewriteSection) {
        rewriteSection.style.display = 'none';
    }

    // Reset form
    const rewriteText = document.getElementById('rewriteText');
    const rewriteResults = document.getElementById('rewriteResults');
    const charCount = document.getElementById('rewriteCharCount');
    const wordCount = document.getElementById('rewriteWordCount');
    
    if (rewriteText) rewriteText.value = '';
    if (rewriteResults) rewriteResults.style.display = 'none';
    if (charCount) charCount.textContent = '0';
    if (wordCount) wordCount.textContent = '0';

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ========== REWRITE FUNCTIONALITY ==========

async function rewriteText() {
    const textInput = document.getElementById('rewriteText')?.value?.trim();
    const tone = document.getElementById('rewriteTone')?.value || 'professional';
    const rewriteBtn = document.getElementById('rewriteBtn');
    const resultsDiv = document.getElementById('rewriteResults');
    const resultsContent = document.getElementById('rewriteResultsContent');

    // Validate input
    if (!textInput) {
        showToast('Please enter text to rewrite', 'error');
        return;
    }

    if (textInput.length < 10) {
        showToast('Text must be at least 10 characters long', 'error');
        return;
    }

    try {
        // Disable button and show loading
        if (rewriteBtn) {
            rewriteBtn.disabled = true;
            rewriteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Rewriting...';
        }

        // Call API
        const response = await fetch('/api/rewrite', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: textInput,
                tone: tone
            })
        });

        const result = await response.json();

        // Re-enable button
        if (rewriteBtn) {
            rewriteBtn.disabled = false;
            rewriteBtn.innerHTML = '<i class="fas fa-pen-fancy"></i> Rewrite Text';
        }

        if (result.success && result.data?.rewritten) {
            // Display results
            if (resultsContent) {
                resultsContent.textContent = result.data.rewritten;
            }
            if (resultsDiv) {
                resultsDiv.style.display = 'block';
                // Smooth scroll to results
                setTimeout(() => {
                    resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 100);
            }

            // Show toast
            showToast('Rewrite completed successfully!', 'success');
        } else {
            showToast('Error: ' + (result.error || 'Failed to rewrite text'), 'error');
        }

    } catch (err) {
        console.error('Rewrite error:', err);
        showToast('Request failed: ' + err.message, 'error');

        // Re-enable button
        if (rewriteBtn) {
            rewriteBtn.disabled = false;
            rewriteBtn.innerHTML = '<i class="fas fa-pen-fancy"></i> Rewrite Text';
        }
    }
}

function copyRewriteResult() {
    const resultsContent = document.getElementById('rewriteResultsContent');
    if (!resultsContent) return;

    const text = resultsContent.innerText || resultsContent.textContent;

    if (!text || text.trim() === '') {
        showToast('No result to copy', 'error');
        return;
    }

    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to clipboard!', 'success');
    }).catch(err => {
        console.error('Copy failed:', err);
        showToast('Failed to copy', 'error');
    });
}

function resetRewriteForm() {
    const rewriteText = document.getElementById('rewriteText');
    const rewriteTone = document.getElementById('rewriteTone');
    const rewriteResults = document.getElementById('rewriteResults');
    const charCount = document.getElementById('rewriteCharCount');
    const wordCount = document.getElementById('rewriteWordCount');

    if (rewriteText) rewriteText.value = '';
    if (rewriteTone) rewriteTone.value = 'professional';
    if (rewriteResults) rewriteResults.style.display = 'none';
    if (charCount) charCount.textContent = '0';
    if (wordCount) wordCount.textContent = '0';
}

// ========== EVENT LISTENERS ==========

document.addEventListener('DOMContentLoaded', () => {
    // Rewrite with AI button (from sidebar)
    const rewriteWithAIBtn = document.getElementById('rewriteWithAIBtn');
    if (rewriteWithAIBtn) {
        rewriteWithAIBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showRewriteSection();
        });
    }

    // Back button in rewrite section
    const backFromRewriteBtn = document.getElementById('backFromRewriteBtn');
    if (backFromRewriteBtn) {
        backFromRewriteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            hideRewriteSection();
        });
    }

    // Rewrite button
    const rewriteBtn = document.getElementById('rewriteBtn');
    if (rewriteBtn) {
        rewriteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            rewriteText();
        });
    }

    // New rewrite button
    const newRewriteBtn = document.getElementById('newRewriteBtn');
    if (newRewriteBtn) {
        newRewriteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            resetRewriteForm();
        });
    }

    // Textarea features
    const rewriteTextarea = document.getElementById('rewriteText');
    if (rewriteTextarea) {
        // Allow Ctrl+Enter to trigger rewrite
        rewriteTextarea.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                rewriteText();
            }
        });

        // Real-time character and word count
        rewriteTextarea.addEventListener('input', (e) => {
            const charCount = document.getElementById('rewriteCharCount');
            const wordCount = document.getElementById('rewriteWordCount');
            const text = e.target.value;
            
            if (charCount) {
                charCount.textContent = text.length;
            }
            if (wordCount) {
                const words = text.trim().split(/\s+/).filter(w => w.length > 0);
                wordCount.textContent = words.length;
            }
        });
    }

    // Copy button
    const copyRewriteBtn = document.getElementById('copyRewriteBtn');
    if (copyRewriteBtn) {
        copyRewriteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            copyRewriteResult();
        });
    }
});

// ========== UTILITY FUNCTIONS ==========

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    const toastMessage = document.getElementById('toastMessage');
    if (toastMessage) {
        toastMessage.textContent = message;
    }

    // Remove old classes
    toast.classList.remove('success', 'error', 'info');
    
    // Add new type class
    toast.classList.add(type);
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Export functions
export { showRewriteSection, hideRewriteSection, rewriteText, copyRewriteResult, resetRewriteForm };