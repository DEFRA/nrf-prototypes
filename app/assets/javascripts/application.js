//
// For guidance on how to add JavaScript see:
// https://prototype-kit.service.gov.uk/docs/adding-css-javascript-and-images
//

window.GOVUKPrototypeKit.documentReady(() => {
  // Add JavaScript here

  // Initialize GOV.UK Frontend components
  if (typeof window.GOVUKFrontend !== 'undefined') {
    window.GOVUKFrontend.initAll();
  }

  // Load EDP search functionality
  if (window.location.pathname.includes('/edp-search')) {
    // Load EDP search specific JavaScript
    const script = document.createElement('script');
    script.src = '/assets/javascripts/edp-search.js';
    document.head.appendChild(script);
  }

  // Note: Applications functionality is handled inline in the templates
  // No separate applications.js file needed
})
