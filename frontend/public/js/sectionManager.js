// js/sectionManager.js
class SectionManager {
  constructor() {
    this.currentSection = 'grammar';
    this.init();
  }
  
  init() {
    this.setupNavigation();
    console.log('Section Manager initialized');
  }
  
  setupNavigation() {
    // Add click handlers to nav links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = link.dataset.section;
        this.switchTo(section);
      });
    });
  }
  
  switchTo(sectionName) {
    console.log(`Switching from ${this.currentSection} to ${sectionName}`);
    
    // Update navigation
    this.updateNavigation(sectionName);
    
    // Hide current section
    this.hideSection(this.currentSection);
    
    // Show new section
    setTimeout(() => {
      this.showSection(sectionName);
      this.currentSection = sectionName;
    }, 150);
  }
  
  updateNavigation(activeSection) {
    // Remove active from all nav links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
    });
    
    // Add active to clicked nav link
    const activeLink = document.querySelector(`[data-section="${activeSection}"]`);
    if (activeLink) {
      activeLink.classList.add('active');
    }
  }
  
  hideSection(sectionName) {
    const section = document.getElementById(`${sectionName}-section`);
    if (section) {
      section.classList.remove('active');
      section.classList.add('hidden');
    }
  }
  
  showSection(sectionName) {
    const section = document.getElementById(`${sectionName}-section`);
    if (section) {
      section.classList.remove('hidden');
      section.classList.add('active');
    }
  }
}

// Export for use in main JS file
export { SectionManager };