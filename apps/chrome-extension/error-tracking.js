/**
 * Simple error tracking for Chrome Extension
 * Stores errors locally and can send them to an API if configured
 */

const ErrorTracker = {
  apiBaseUrl: null,
  authToken: null,
  maxErrors: 50,
  errors: [],

  /**
   * Initialize error tracker with API endpoint
   */
  async init(apiBaseUrl) {
    this.apiBaseUrl = apiBaseUrl;
    
    // Load stored auth token if available
    const storage = await chrome.storage.local.get(['authToken']);
    this.authToken = storage.authToken || null;

    // Load previously stored errors
    const stored = await chrome.storage.local.get(['errorLog']);
    this.errors = stored.errorLog || [];

    console.log(`✅ Error tracker initialized (${this.errors.length} stored errors)`);
  },

  /**
   * Log an error with context
   */
  async logError(error, context = {}) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : null,
      context: context,
      url: context.url || window.location.href,
      userAgent: navigator.userAgent,
    };

    // Store locally
    this.errors.unshift(errorEntry);
    if (this.errors.length > this.maxErrors) {
      this.errors.pop();
    }

    await chrome.storage.local.set({ errorLog: this.errors });

    // Try to send to API if configured
    if (this.apiBaseUrl && this.authToken && context.send !== false) {
      this.sendToApi(errorEntry).catch(err => {
        console.error('[ErrorTracker] Failed to send error to API:', err);
      });
    }

    console.error('[ErrorTracker]', errorEntry);
    return errorEntry;
  },

  /**
   * Send error to API for centralized tracking
   */
  async sendToApi(errorEntry) {
    if (!this.apiBaseUrl || !this.authToken) {
      return;
    }

    try {
      await fetch(`${this.apiBaseUrl.replace(/\/+$/, '')}/api/errors`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service: 'chrome-extension',
          ...errorEntry,
        }),
      });
    } catch (err) {
      console.error('[ErrorTracker] Failed to send to API:', err);
    }
  },

  /**
   * Get all stored errors
   */
  getErrors() {
    return this.errors;
  },

  /**
   * Clear stored errors
   */
  async clearErrors() {
    this.errors = [];
    await chrome.storage.local.set({ errorLog: [] });
    console.log('[ErrorTracker] Errors cleared');
  },

  /**
   * Log a user action/breadcrumb
   */
  async logBreadcrumb(message, category = 'user-action', level = 'info') {
    const breadcrumb = {
      timestamp: new Date().toISOString(),
      message,
      category,
      level,
    };

    // Store breadcrumbs in session storage (expires on tab close)
    let breadcrumbs = [];
    try {
      const stored = await chrome.storage.session.get(['breadcrumbs']);
      breadcrumbs = stored.breadcrumbs || [];
    } catch (e) {
      // Session storage not available, use local
    }

    breadcrumbs.push(breadcrumb);
    if (breadcrumbs.length > 20) {
      breadcrumbs.shift();
    }

    try {
      await chrome.storage.session.set({ breadcrumbs });
    } catch (e) {
      // Fall back to local storage
      await chrome.storage.local.set({ breadcrumbs });
    }

    console.log('[Breadcrumb]', breadcrumb);
  },

  /**
   * Capture an exception
   */
  async captureException(error, context = {}) {
    return this.logError(error, {
      ...context,
      type: 'exception',
    });
  },

  /**
   * Capture a message
   */
  async captureMessage(message, level = 'info', context = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      message,
      level,
      context,
      type: 'message',
      url: context.url || window.location.href,
    };

    this.errors.unshift(entry);
    if (this.errors.length > this.maxErrors) {
      this.errors.pop();
    }

    await chrome.storage.local.set({ errorLog: this.errors });
    console.log('[Message]', entry);
  },
};

// Global error handlers
window.addEventListener('error', (event) => {
  ErrorTracker.captureException(event.error, {
    context: 'uncaught_error',
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  }).catch(console.error);
});

window.addEventListener('unhandledrejection', (event) => {
  ErrorTracker.captureException(event.reason, {
    context: 'unhandled_rejection',
  }).catch(console.error);
});

// Export for use in content scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ErrorTracker;
}
