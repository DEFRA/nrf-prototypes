/**
 * Reusable Modal Component
 *
 * Creates a positioned modal with close button and custom content
 * Automatically sanitizes HTML content using DOMPurify to prevent XSS attacks
 *
 * @example
 * const modal = new Modal({
 *   title: 'Map style',
 *   position: 'top-right',
 *   content: '<div>Your content here</div>',
 *   onClose: () => console.log('Modal closed')
 * });
 * modal.open();
 */

class Modal {
  /**
   * @param {Object} options - Configuration options for the modal
   * @param {string} options.title - Modal title text
   * @param {'top-right'|'top-left'|'center'} options.position - Modal position on screen (default: 'top-right')
   * @param {string} options.content - HTML content string for modal body
   * @param {Function} [options.onClose] - Optional callback function executed when modal closes
   * @param {HTMLElement} [options.container] - Optional container element (defaults to document.body)
   * @param {boolean} [options.closeOnOutsideClick=true] - Whether clicking outside closes the modal (default: true)
   */
  constructor(options) {
    this.options = {
      title: '',
      position: 'top-right',
      content: '',
      onClose: null,
      container: document.body,
      closeOnOutsideClick: true,
      ...options
    }

    this.modal = null
    this.isOpen = false
    this.outsideClickHandler = null
  }

  /**
   * Create the modal HTML structure
   * @returns {HTMLElement}
   */
  create() {
    const modal = document.createElement('div')
    modal.className = `modal modal--${this.options.position}`

    modal.innerHTML = `
      <div class="modal__content">
        <div class="modal__header">
          <h2 class="modal__title">${this.options.title}</h2>
          <button class="modal__close" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L15 15M15 1L1 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <div class="modal__body">
          ${DOMPurify.sanitize(this.options.content)}
        </div>
      </div>
    `

    // Add close button handler
    const closeBtn = modal.querySelector('.modal__close')
    closeBtn.addEventListener('click', () => this.close())

    return modal
  }

  /**
   * Open the modal
   */
  open() {
    if (this.isOpen) return

    this.modal = this.create()
    this.options.container.appendChild(this.modal)
    this.isOpen = true

    // Setup outside click handler
    if (this.options.closeOnOutsideClick) {
      this.setupOutsideClickHandler()
    }
  }

  /**
   * Close the modal
   */
  close() {
    if (!this.isOpen || !this.modal) return

    // Remove outside click handler
    if (this.outsideClickHandler) {
      document.removeEventListener('click', this.outsideClickHandler, true)
      this.outsideClickHandler = null
    }

    // Remove modal from DOM
    if (this.options.container.contains(this.modal)) {
      this.options.container.removeChild(this.modal)
    }

    this.modal = null
    this.isOpen = false

    // Call onClose callback
    if (this.options.onClose) {
      this.options.onClose()
    }
  }

  /**
   * Setup click outside to close
   */
  setupOutsideClickHandler() {
    this.outsideClickHandler = (e) => {
      if (this.modal && !this.modal.contains(e.target)) {
        this.close()
      }
    }

    // Use capture phase to handle before other handlers
    setTimeout(() => {
      document.addEventListener('click', this.outsideClickHandler, true)
    }, 100)
  }

  /**
   * Update modal content
   * @param {string} content - New HTML content
   */
  updateContent(content) {
    if (!this.modal) return

    const body = this.modal.querySelector('.modal__body')
    if (body) {
      body.innerHTML = DOMPurify.sanitize(content)
    }
  }

  /**
   * Update modal title
   * @param {string} title - New title text
   */
  updateTitle(title) {
    if (!this.modal) return

    const titleEl = this.modal.querySelector('.modal__title')
    if (titleEl) {
      titleEl.textContent = title
    }
  }

  /**
   * Check if modal is currently open
   * @returns {boolean}
   */
  isOpened() {
    return this.isOpen
  }

  /**
   * Get the modal element
   * @returns {HTMLElement|null}
   */
  getElement() {
    return this.modal
  }
}
