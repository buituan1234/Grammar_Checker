// sidebar.js - Sidebar functionality module

/**
 * Setup sidebar functionality - DATA ATTRIBUTES VERSION
 */
export function setupSidebar() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const pageContentWrapper = document.getElementById('pageContentWrapper');
    
    if (!sidebarToggle || !sidebar) return;
    
    sidebarToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar.classList.toggle('hidden');
        pageContentWrapper?.classList.toggle('sidebar-open');
    });
    
    setupSidebarNavigation(sidebar, pageContentWrapper);
    
    setupClickOutsideToClose(sidebar, sidebarToggle, pageContentWrapper);
    
    setupResponsiveBehavior(sidebar, pageContentWrapper);
}

/**
 * Setup sidebar navigation items
 */
function setupSidebarNavigation(sidebar, pageContentWrapper) {
    const sidebarItems = sidebar.querySelectorAll('.sidebar-item');
    
    sidebarItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const href = item.getAttribute('href');
            
            // ← Thêm kiểm tra này
            if (href && href.startsWith('#') && href !== '#') {
                e.preventDefault();
                
                const targetSection = document.querySelector(href);
                if (targetSection) {
                    scrollToSection(targetSection);
                    
                    sidebarItems.forEach(i => i.classList.remove('active'));
                    item.classList.add('active');
                    
                    if (window.innerWidth < 1024) {
                        sidebar.classList.add('hidden');
                        pageContentWrapper?.classList.remove('sidebar-open');
                    }
                }
            }
        });
    });
}

/**
 * Scroll to a specific section with offset
 */
function scrollToSection(targetSection) {
    const headerHeight = document.querySelector('header')?.offsetHeight || 0;
    const targetPosition = targetSection.offsetTop - headerHeight - 20;
    
    window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
    });
}

/**
 * Setup click outside to close sidebar
 */
function setupClickOutsideToClose(sidebar, sidebarToggle, pageContentWrapper) {
    document.addEventListener('click', (e) => {
        if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
            if (!sidebar.classList.contains('hidden')) {
                sidebar.classList.add('hidden');
                pageContentWrapper?.classList.remove('sidebar-open');
            }
        }
    });
}

/**
 * Setup responsive behavior for sidebar
 */
function setupResponsiveBehavior(sidebar, pageContentWrapper) {
    window.addEventListener('resize', () => {
        if (window.innerWidth < 768) {
            sidebar.classList.add('hidden');
            pageContentWrapper?.classList.remove('sidebar-open');
        }
    });
}

/**
 * Update sidebar visibility based on screen size and auth status
 */
export function updateSidebarVisibility(isLoggedIn) {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    
    if (sidebarToggle) {
        if (window.innerWidth < 1024) {
            sidebarToggle.classList.remove('hidden');
        } else {
            sidebarToggle.classList.add('hidden');
        }
    }
    
    if (sidebar) {
        if (window.innerWidth < 1024) {
            sidebar.classList.add('hidden');
        } else {
            sidebar.classList.remove('hidden');
        }
    }
}

/**
 * Set active sidebar item based on current section
 */
export function setActiveSidebarItem(sectionId) {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    
    const sidebarItems = sidebar.querySelectorAll('.sidebar-item');
    sidebarItems.forEach(item => {
        const href = item.getAttribute('href');
        if (href === `#${sectionId}`) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

/**
 * Highlight sidebar item on scroll
 */
export function initSidebarScrollSpy() {
    const sections = document.querySelectorAll('section[id]');
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    
    if (sections.length === 0 || sidebarItems.length === 0) return;
    
    const observerOptions = {
        root: null,
        rootMargin: '-20% 0px -70% 0px',
        threshold: 0
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                setActiveSidebarItem(id);
            }
        });
    }, observerOptions);
    
    sections.forEach(section => {
        observer.observe(section);
    });
}

/**
 * Toggle sidebar programmatically
 */
export function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const pageContentWrapper = document.getElementById('pageContentWrapper');
    
    if (sidebar) {
        sidebar.classList.toggle('hidden');
        pageContentWrapper?.classList.toggle('sidebar-open');
    }
}

/**
 * Close sidebar programmatically
 */
export function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const pageContentWrapper = document.getElementById('pageContentWrapper');
    
    if (sidebar && !sidebar.classList.contains('hidden')) {
        sidebar.classList.add('hidden');
        pageContentWrapper?.classList.remove('sidebar-open');
    }
}

/**
 * Open sidebar programmatically
 */
export function openSidebar() {
    const sidebar = document.getElementById('sidebar');
    const pageContentWrapper = document.getElementById('pageContentWrapper');
    
    if (sidebar && sidebar.classList.contains('hidden')) {
        sidebar.classList.remove('hidden');
        pageContentWrapper?.classList.add('sidebar-open');
    }
}