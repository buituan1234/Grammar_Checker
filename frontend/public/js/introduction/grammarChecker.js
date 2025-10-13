// grammarChecker.js - Xử lý hiển thị kết quả grammar check

export function displayResults(matches, container) {
    if (!container) return;
    
    if (matches.length === 0) {
        container.innerHTML = `
            <div class="demo-no-errors">
                <i class="fas fa-check-circle"></i>
                <p>Great! No grammar issues found in your text.</p>
            </div>
        `;
        
        const acceptAllBtn = document.getElementById('demoAcceptAllBtn');
        if (acceptAllBtn) acceptAllBtn.style.display = 'none';
        
        return;
    }
    
    window.currentDemoMatches = matches;
    
    container.innerHTML = matches.map((match, index) => {
        const errorText = match.context 
            ? match.context.text.substring(
                match.context.offset,
                match.context.offset + match.context.length
              )
            : 'Unknown';
        
        const suggestion = match.replacements?.[0]?.value || '';
        const errorType = match.rule?.category?.name || 'Grammar';
        
        return `
            <div class="demo-error-item" data-error-index="${index}">
                <div class="demo-error-type">${errorType}</div>
                <div class="demo-error-message"><strong>Issue:</strong> ${match.message}</div>
                <div class="demo-suggestion">
                    <strong>Original:</strong> 
                    <span style="background: #ffebee; padding: 2px 6px; border-radius: 3px; color: #c62828;">"${escapeHtml(errorText)}"</span> 
                    → 
                    <strong>Suggestion:</strong> 
                    <span style="background: #e8f5e8; padding: 2px 6px; border-radius: 3px; color: #2e7d32;">"${suggestion || 'No suggestion'}"</span>
                </div>
                ${suggestion ? `
                    <button class="demo-apply-btn" 
                            data-index="${index}" 
                            data-offset="${match.offset}" 
                            data-length="${match.length}" 
                            data-suggestion="${escapeHtml(suggestion)}">
                        <i class="fas fa-check"></i> Apply
                    </button>
                ` : ''}
            </div>
        `;
    }).join('');
    
    const acceptAllBtn = document.getElementById('demoAcceptAllBtn');
    if (acceptAllBtn) acceptAllBtn.style.display = 'block';
    
    setupApplyButtons();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function setupApplyButtons() {
    document.querySelectorAll('.demo-apply-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            const offset = parseInt(this.dataset.offset);
            const length = parseInt(this.dataset.length);
            const suggestion = this.dataset.suggestion;
            
            applyDemoSuggestion(index, offset, length, suggestion);
        });
    });
}

function applyDemoSuggestion(index, offset, length, suggestion) {
    const demoText = document.getElementById('demoText');
    if (!demoText) return;
    
    const text = demoText.value;
    const newText = text.substring(0, offset) + suggestion + text.substring(offset + length);
    demoText.value = newText;
    
    const errorItem = document.querySelector(`[data-error-index="${index}"]`);
    if (errorItem) {
        errorItem.classList.add('removing');
        setTimeout(() => {
            errorItem.remove();
            
            const remainingErrors = document.querySelectorAll('.demo-error-item');
            if (remainingErrors.length === 0) {
                const demoErrorsList = document.getElementById('demoErrorsList');
                if (demoErrorsList) {
                    demoErrorsList.innerHTML = `
                        <div class="demo-no-errors">
                            <i class="fas fa-check-circle"></i>
                            <p>All suggestions applied! Your text looks great.</p>
                        </div>
                    `;
                }
                
                const acceptAllBtn = document.getElementById('demoAcceptAllBtn');
                if (acceptAllBtn) acceptAllBtn.style.display = 'none';
            }
            
            const issueCount = document.getElementById('demoIssueCount');
            if (issueCount) {
                issueCount.textContent = remainingErrors.length;
            }
        }, 300);
    }
    
    updateTextStats(newText);
    
    if (window.currentDemoMatches) {
        window.currentDemoMatches = window.currentDemoMatches.filter((_, i) => i !== index);
    }
}

export function updateTextStats(text) {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    
    const wordCountEl = document.getElementById('demoWordCount');
    const charCountEl = document.getElementById('demoCharCount');
    
    if (wordCountEl) wordCountEl.textContent = words;
    if (charCountEl) charCountEl.textContent = chars;
    
    return { words, chars };
}