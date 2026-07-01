// Toast notification system for TaskMaster
// Follows specifications from .claude/specs/06-toast.md

class ToastService {
  constructor() {
    this.toastContainer = null;
    this.toastQueue = [];
    this.visibleToasts = [];
    this.maxVisible = 4;
    this.position = this.getInitialPosition();

    // Default durations in milliseconds
    this.durations = {
      success: 3000,
      error: 5000,
      warning: 4000,
      info: 3000
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }

  init() {
    // Create toast container if it doesn't exist
    if (!document.getElementById('toast-container')) {
      this.createToastContainer();
    }

    this.toastContainer = document.getElementById('toast-container');

    // Set initial position based on screen size
    this.updateContainerPosition();

    // Set up resize listener for responsive positioning
    window.addEventListener('resize', () => this.updateResponsivePosition());
  }

  createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');
    // Position classes will be added dynamically
    container.className = 'toast-container fixed z-50 pointer-events-none';

    // Add to body
    document.body.appendChild(container);
  }

  // Returns the initial position based on screen size
  getInitialPosition() {
    return window.innerWidth < 641 ? 'bottom-center' : 'top-right';
  }

  // Updates the container's position class based on this.position
  updateContainerPosition() {
    if (!this.toastContainer) return;

    // Remove any existing position classes
    this.toastContainer.className = this.toastContainer.className.replace(
      /\btoast-(top|bottom)-(left|right|center)\b/g,
      ''
    ).trim();

    // Add the new position class
    this.toastContainer.classList.add(`toast-${this.position}`);
  }

  // Updates position based on current screen size (for responsive behavior)
  updateResponsivePosition() {
    const newPosition = window.innerWidth < 641 ? 'bottom-center' : 'top-right';
    if (newPosition !== this.position) {
      this.position = newPosition;
      this.updateContainerPosition();
    }
  }

  // Public method to set the toast position
  setPosition(position) {
    const validPositions = [
      'top-right',
      'top-left',
      'top-center',
      'bottom-right',
      'bottom-left',
      'bottom-center'
    ];

    if (validPositions.includes(position)) {
      this.position = position;
      this.updateContainerPosition();
    }
    // Ignore invalid positions as per spec
  }

  showToast(options) {
    // Create toast element
    const toast = this.createToastElement(options);

    // Add to container
    this.toastContainer.appendChild(toast);

    // Add to visible toasts array
    this.visibleToasts.push(toast);

    // Manage queue if we exceed max visible
    if (this.visibleToasts.length > this.maxVisible) {
      // Remove oldest toast
      const oldestToast = this.visibleToasts.shift();
      oldestToast.remove();
    }

    // Set up auto-dismiss
    const duration = options.duration || this.getDuration(options.type);
    // Auto-dismiss timer
    toast._dismissTimer = setTimeout(() => {
        this.dismissToast(toast);
    }, duration);

    // Pause on hover
    toast.addEventListener("mouseenter", () => {
        clearTimeout(toast._dismissTimer);
    });

    // Resume on mouse leave
    toast.addEventListener("mouseleave", () => {
        toast._dismissTimer = setTimeout(() => {
            this.dismissToast(toast);
        }, duration);
    });

    // Force reflow
    void toast.offsetWidth;

    // Show animation
    toast.classList.add("toast-show");

    return toast;
  }

  createToastElement(options) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${options.type} flex items-center w-full max-w-xs p-4 mb-3 rounded-lg shadow-lg opacity-0`;

    // Set role and aria-live for accessibility
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');

    // Icon based on type
    let iconHtml = '';
    switch (options.type) {
      case 'success':
        iconHtml = '<svg xmlns="http://www.w3.org/2000/svg" class="flex-shrink-0 w-5 h-5 text-green-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l2-2a1 1 0 00-1.414-1.414l-1.293 1.293zm-1.293 2.707a1 1 0 01-1.414 0l-2-2a1 1 0 010-1.414l2-2a1 1 0 011.414 1.414L11 9.414l1.293 1.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>';
        break;
      case 'error':
        iconHtml = '<svg xmlns="http://www.w3.org/2000/svg" class="flex-shrink-0 w-5 h-5 text-red-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7a1 1 0 10-2 0z" clipRule="evenodd" /></svg>';
        break;
      case 'warning':
        iconHtml = '<svg xmlns="http://www.w3.org/2000/svg" class="flex-shrink-0 w-5 h-5 text-orange-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.529 0-2.492-1.646-1.742-2.98l5.58-9.92zM11 13a1 1 0 100-2 1 1 0 000 2zm-1-8a1 1 0 00-2 0v2H5a1 1 0 000 2h2v2a1 1 0 002 0v-2h2a1 1 0 000-2h-2V5z" clipRule="evenodd" /></svg>';
        break;
      case 'info':
        iconHtml = '<svg xmlns="http://www.w3.org/2000/svg" class="flex-shrink-0 w-5 h-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-1 9a1 1 0 10-2 0 1 1 0 012 0z" clipRule="evenodd" /></svg>';
        break;
      default:
        iconHtml = '<svg xmlns="http://www.w3.org/2000/svg" class="flex-shrink-0 w-5 h-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l2-2a1 1 0 00-1.414-1.414l-1.293 1.293zm-1.293 2.707a1 1 0 01-1.414 0l-2-2a1 1 0 010-1.414l2-2a1 1 0 011.414 1.414L11 9.414l1.293 1.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>';
    }

    // Close button
    const closeButton = document.createElement('button');
    closeButton.className = 'toast-close ml-auto flex-shrink-0 w-5 h-5 text-gray-400 hover:text-gray-600 rounded';
    closeButton.setAttribute('aria-label', 'Close');
    closeButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>';
    closeButton.addEventListener("click", (e) => {
    console.log("BUTTON CLICKED");

    e.preventDefault();
    e.stopPropagation();

    this.dismissToast(toast);
});

    // Apply background and border colors based on type
    let bgColorClass = 'bg-white';
    let borderColorClass = 'border-gray-300';
    let iconColorClass = '';

    switch (options.type) {
      case 'success':
        bgColorClass = 'bg-green-50';
        borderColorClass = 'border-green-200';
        iconColorClass = 'text-green-600';
        break;
      case 'error':
        bgColorClass = 'bg-red-50';
        borderColorClass = 'border-red-200';
        iconColorClass = 'text-red-600';
        break;
      case 'warning':
        bgColorClass = 'bg-yellow-50';
        borderColorClass = 'border-yellow-200';
        iconColorClass = 'text-yellow-600';
        break;
      case 'info':
        bgColorClass = 'bg-blue-50';
        borderColorClass = 'border-blue-200';
        iconColorClass = 'text-blue-600';
        break;
    }

    toast.className += ` ${bgColorClass} ${borderColorClass}`;

    // Set inner HTML
    toast.innerHTML = `
      <div class="flex-shrink-0">
        ${iconHtml}
      </div>
      <div class="ml-3 me-3 flex-1">
        <p class="text-sm font-medium text-gray-900">${options.message}</p>
      </div>
    `;

    // Append close button
    toast.appendChild(closeButton);

    return toast;
  }

dismissToast(toast) {
    if (!toast || !toast.isConnected || toast.classList.contains("toast-hide")) {
        return;
    }

    clearTimeout(toast._dismissTimer);

    toast.classList.remove("toast-show");

    // Force browser reflow
    void toast.offsetWidth;

    toast.classList.add("toast-hide");

    toast.addEventListener("animationend", () => {
        toast.remove();

        const index = this.visibleToasts.indexOf(toast);
        if (index > -1) {
            this.visibleToasts.splice(index, 1);
        }
    }, { once: true });
}

  getDuration(type) {
    return this.durations[type] || this.durations.info;
  }

  // Public API methods
  success(message, duration) {
    return this.showToast({ type: 'success', message, duration });
  }

  error(message, duration) {
    return this.showToast({ type: 'error', message, duration });
  }

  warning(message, duration) {
    return this.showToast({ type: 'warning', message, duration });
  }

  info(message, duration) {
    return this.showToast({ type: 'info', message, duration });
  }
}

// Create and export singleton instance
const toastService = new ToastService();
window.toastService = toastService;
export default toastService;