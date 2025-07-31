//
// For guidance on how to create filters see:
// https://prototype-kit.service.gov.uk/docs/filters
//

const govukPrototypeKit = require('govuk-prototype-kit')
const addFilter = govukPrototypeKit.views.addFilter

// Add your filters here

// Format currency
addFilter('formatCurrency', (value) => {
    if (typeof value !== 'number') return value;
    return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP'
    }).format(value);
});

// Format date
addFilter('formatDate', (value) => {
    if (!value) return value;
    const date = new Date(value);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
});

// Round number
addFilter('round', (value, decimals = 0) => {
    if (typeof value !== 'number') return value;
    return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
});

