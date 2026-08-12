// The package root exposes the browser-safe API plus the Node-only helpers
// required by server middleware. Runtime package conditions select the correct
// implementation for Vite and Node respectively.
export * from "./browser.js";
export {
  initSentryNode,
  sentryMiddleware,
  sentryErrorHandler,
  captureHandledError,
} from "./node.js";
