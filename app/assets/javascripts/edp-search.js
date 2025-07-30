// EDP Search functionality
// This file contains JavaScript functions specific to the EDP search journey

// Form validation utilities
const EDPValidation = {
    // Validate postcode format
    isValidPostcode: function (postcode) {
        const postcodePattern = /^[A-Z]{1,2}[0-9R][0-9A-Z]? [0-9][A-Z]{2}$/i;
        return postcodePattern.test(postcode);
    },

    // Validate coordinates
    isValidCoordinates: function (lat, lng) {
        return !isNaN(lat) && !isNaN(lng) &&
            lat >= -90 && lat <= 90 &&
            lng >= -180 && lng <= 180;
    },

    // Validate house count
    isValidHouseCount: function (count) {
        return !isNaN(count) && count > 0 && count <= 10000;
    },

    // Validate file upload
    isValidFile: function (file) {
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = ['.shp', '.kml', '.geojson', '.zip'];

        if (file.size > maxSize) return false;

        const fileName = file.name.toLowerCase();
        return allowedTypes.some(ext => fileName.endsWith(ext));
    }
};

// Data management utilities
const EDPDataManager = {
    // Store development location
    storeLocation: function (locationData) {
        sessionStorage.setItem('developmentLocation', JSON.stringify(locationData));
    },

    // Store development boundary
    storeBoundary: function (boundaryData) {
        sessionStorage.setItem('developmentBoundary', JSON.stringify(boundaryData));
    },

    // Store applicable EDPs
    storeEDPs: function (edpData) {
        sessionStorage.setItem('applicableEDPs', JSON.stringify(edpData));
    },

    // Get development location
    getLocation: function () {
        const data = sessionStorage.getItem('developmentLocation');
        return data ? JSON.parse(data) : null;
    },

    // Get development boundary
    getBoundary: function () {
        const data = sessionStorage.getItem('developmentBoundary');
        return data ? JSON.parse(data) : null;
    },

    // Get applicable EDPs
    getEDPs: function () {
        const data = sessionStorage.getItem('applicableEDPs');
        return data ? JSON.parse(data) : [];
    },

    // Clear all data
    clearAll: function () {
        sessionStorage.removeItem('developmentLocation');
        sessionStorage.removeItem('developmentBoundary');
        sessionStorage.removeItem('applicableEDPs');
    }
};

// EDP calculation utilities
const EDPCalculator = {
    // Calculate DLL impact
    calculateDLLImpact: function (houseCount, rate) {
        return houseCount * rate;
    },

    // Calculate nutrient mitigation impact
    calculateNutrientMitigationImpact: function (houseCount, rate) {
        return houseCount * rate;
    },

    // Calculate total impact
    calculateTotalImpact: function (edps, formData) {
        let total = 0;

        edps.forEach(edp => {
            if (edp.type === 'DLL' && formData.houseCount) {
                total += this.calculateDLLImpact(formData.houseCount, edp.rate);
            } else if (edp.type === 'Nutrient Mitigation' && formData.wastewaterSite) {
                total += this.calculateNutrientMitigationImpact(formData.houseCount, edp.rate);
            }
        });

        return total;
    }
};

// UI utilities
const EDPUI = {
    // Show error message
    showError: function (message, targetId = null) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'govuk-error-summary';
        errorDiv.setAttribute('aria-labelledby', 'error-summary-title');
        errorDiv.setAttribute('role', 'alert');
        errorDiv.setAttribute('tabindex', '-1');
        errorDiv.innerHTML = `
      <h2 class="govuk-error-summary__title" id="error-summary-title">
        There is a problem
      </h2>
      <div class="govuk-error-summary__body">
        <ul class="govuk-list govuk-error-summary__list">
          <li><a href="${targetId ? '#' + targetId : '#'}">${message}</a></li>
        </ul>
      </div>
    `;

        const content = document.querySelector('.govuk-grid-column-two-thirds') ||
            document.querySelector('.govuk-grid-column-full');
        if (content) {
            content.insertBefore(errorDiv, content.firstChild);
        }
    },

    // Hide error message
    hideError: function () {
        const errorDiv = document.querySelector('.govuk-error-summary');
        if (errorDiv) {
            errorDiv.remove();
        }
    },

    // Show success message
    showSuccess: function (message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'govuk-inset-text';
        successDiv.innerHTML = `<p class="govuk-body">${message}</p>`;

        const content = document.querySelector('.govuk-grid-column-two-thirds');
        if (content) {
            content.insertBefore(successDiv, content.firstChild);
        }
    },

    // Format currency
    formatCurrency: function (amount) {
        return new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: 'GBP'
        }).format(amount);
    },

    // Format file size
    formatFileSize: function (bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        EDPValidation,
        EDPDataManager,
        EDPCalculator,
        EDPUI
    };
} 