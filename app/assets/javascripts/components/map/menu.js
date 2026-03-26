/**
 * Menu HTML and configuration for the interactive map drawing controls
 */

window.MapMenu = (function() {
  'use strict';

  const menuItems = [
    {
      id: 'start-drawing',
      label: 'Draw boundary',
      disabled: feature => !!feature,
      svg: `
        <path d="M19.5 7v10M4.5 7v10M7 19.5h10M7 4.5h10"/>
        <path d="M22 18v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1zm0-15v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1zM7 18v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1zM7 3v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1z"/>
      `
    },
    {
      id: 'edit-boundary',
      label: 'Edit boundary',
      disabled: feature => !feature,
      svg: `
        <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>
        <path d="m15 5 4 4"/>
      `
    },
    {
      id: 'delete-boundary',
      label: 'Delete boundary',
      disabled: feature => !feature,
      svg: `
        <path d="M10 11v6"/>
        <path d="M14 11v6"/>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
        <path d="M3 6h18"/>
        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      `
    }
  ];

  function renderMenu(feature) {
    return `
      <div class="fmp-menu">
        <h3 class="govuk-heading-s fmp-menu-heading">Draw a red line boundary</h3>
        <ul class="fmp-menu-list" role="menu">
          ${menuItems.map(item => `
            <li class="fmp-menu-item" role="presentation">
              <button
                id="${item.id}"
                type="button"
                class="fmp-menu-button"
                aria-disabled="${item.disabled(feature)}"
              >
                <svg xmlns="http://www.w3.org/2000/svg"
                     width="24" height="24"
                     viewBox="0 0 24 24"
                     fill="none"
                     stroke="currentColor"
                     stroke-width="2"
                     stroke-linecap="round"
                     stroke-linejoin="round"
                     aria-hidden="true"
                     focusable="false">
                  ${item.svg}
                </svg>
                <span class="fmp-menu-button__label">${item.label}</span>
              </button>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }

  /**
   * Update aria-disabled state on all menu buttons based on current feature
   * @param {Object|null} feature - Current drawn feature
   */
  function updateMenuState(feature) {
    menuItems.forEach(item => {
      const btn = document.getElementById(item.id);
      if (btn) {
        btn.setAttribute('aria-disabled', String(item.disabled(feature)));
      }
    });
  }

  return {
    renderMenu,
    updateMenuState
  };
})();
