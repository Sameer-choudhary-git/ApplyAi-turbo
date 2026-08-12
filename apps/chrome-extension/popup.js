const DEFAULT_API_BASE_URL = "http://localhost:3000";

// Initialize error tracking
const ErrorTracker = {
  apiBaseUrl: DEFAULT_API_BASE_URL,
  authToken: "",
  maxErrors: 50,
  errors: [],

  async init(apiBaseUrl) {
    this.apiBaseUrl = apiBaseUrl;
    const storage = await chrome.storage.local.get(['authToken']);
    this.authToken = storage.authToken || null;
    const stored = await chrome.storage.local.get(['errorLog']);
    this.errors = stored.errorLog || [];
    console.log(`✅ Error tracker initialized (${this.errors.length} stored errors)`);
  },

  async logError(error, context = {}) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : null,
      context: context,
      url: window.location.href,
    };
    this.errors.unshift(errorEntry);
    if (this.errors.length > this.maxErrors) this.errors.pop();
    await chrome.storage.local.set({ errorLog: this.errors });
    console.error('[ErrorTracker]', errorEntry);
    return errorEntry;
  },

  async captureException(error, context = {}) {
    return this.logError(error, { ...context, type: 'exception' });
  },

  async logBreadcrumb(message, category = 'user-action') {
    console.log('[Breadcrumb]', message, category);
  },
};

// Initialize error tracker on load
(async () => {
  const data = await chrome.storage.local.get(['apiBaseUrl']);
  await ErrorTracker.init(data.apiBaseUrl || DEFAULT_API_BASE_URL);
})();

const state = {
  apiBaseUrl: DEFAULT_API_BASE_URL,
  authToken: "",
  draft: {
    name: "",
    title: "",
    company: "",
    profileUrl: "",
    notes: "",
  },
};

const el = {
  statusDot: document.getElementById("statusDot"),
  importTokenBtn: document.getElementById("importTokenBtn"),
  saveSettingsBtn: document.getElementById("saveSettingsBtn"),
  clearTokenBtn: document.getElementById("clearTokenBtn"),
  extractBtn: document.getElementById("extractBtn"),
  saveContactBtn: document.getElementById("saveContactBtn"),
  apiBaseUrl: document.getElementById("apiBaseUrl"),
  authToken: document.getElementById("authToken"),
  name: document.getElementById("name"),
  title: document.getElementById("title"),
  company: document.getElementById("company"),
  profileUrl: document.getElementById("profileUrl"),
  notes: document.getElementById("notes"),
  pageHint: document.getElementById("pageHint"),
  result: document.getElementById("result"),
};

function setResult(message, tone = "") {
  el.result.textContent = message;
  el.statusDot.className = `status-dot ${tone}`.trim();
}

function setLoading(loading) {
  el.extractBtn.disabled = loading;
  el.saveContactBtn.disabled = loading;
  el.importTokenBtn.disabled = loading;
  el.saveSettingsBtn.disabled = loading;
  el.clearTokenBtn.disabled = loading;
}

function updateFormFromDraft() {
  el.name.value = state.draft.name || "";
  el.title.value = state.draft.title || "";
  el.company.value = state.draft.company || "";
  el.profileUrl.value = state.draft.profileUrl || "";
  el.notes.value = state.draft.notes || "";
}

function readFormIntoDraft() {
  state.draft = {
    name: el.name.value.trim(),
    title: el.title.value.trim(),
    company: el.company.value.trim(),
    profileUrl: el.profileUrl.value.trim(),
    notes: el.notes.value.trim(),
  };
}

async function loadSettings() {
  const data = await chrome.storage.local.get(["apiBaseUrl", "authToken", "draft"]);
  state.apiBaseUrl = data.apiBaseUrl || DEFAULT_API_BASE_URL;
  state.authToken = data.authToken || "";
  state.draft = data.draft || state.draft;
  el.apiBaseUrl.value = state.apiBaseUrl;
  el.authToken.value = state.authToken;
  updateFormFromDraft();
  setResult(state.authToken ? "Session token loaded." : "No session token yet.", state.authToken ? "ok" : "warn");
}

async function persistSettings() {
  readFormIntoDraft();
  state.apiBaseUrl = el.apiBaseUrl.value.trim() || DEFAULT_API_BASE_URL;
  state.authToken = el.authToken.value.trim();
  await chrome.storage.local.set({ apiBaseUrl: state.apiBaseUrl, authToken: state.authToken, draft: state.draft });
  setResult("Settings saved.", "ok");
}

async function captureLinkedInProfile() {
  setLoading(true);
  setResult("Reading the current tab...");

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab?.id) {
      throw new Error("No active tab found.");
    }

    if (
      !tab.url ||
      !/^https:\/\/(www\.)?linkedin\.com\/in\//i.test(tab.url)
    ) {
      throw new Error("Open a LinkedIn profile page first.");
    }

    let response;

    try {
      // Try the automatically injected content script first.
      response = await chrome.tabs.sendMessage(tab.id, {
        type: "APPLYAI_EXTRACT_LINKEDIN_PROFILE",
      });
    } catch (error) {
      console.log(
        "[ApplyAI] Content script not available. Injecting it...",
        error
      );

      // Content script wasn't running.
      await chrome.scripting.executeScript({
        target: {
          tabId: tab.id,
        },
        files: ["content-scripts/linkedin.js"],
      });

      // Allow the injected script to register its listener.
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Try again.
      response = await chrome.tabs.sendMessage(tab.id, {
        type: "APPLYAI_EXTRACT_LINKEDIN_PROFILE",
      });
    }

    if (!response?.success) {
      throw new Error(
        response?.error ||
          "Could not extract the LinkedIn profile."
      );
    }

    const profile = response.profile || {};

    state.draft = {
      name: profile.name || "",
      title: profile.title || "",
      company: profile.company || "",
      profileUrl: profile.profileUrl || "",
      notes: profile.notes || "",
    };

    updateFormFromDraft();

    await chrome.storage.local.set({
      draft: state.draft,
    });

    await ErrorTracker.logBreadcrumb('Profile captured successfully', 'linkedin-extraction');
    setResult("Profile captured.", "ok");
  } catch (error) {
    console.error(
      "[ApplyAI] LinkedIn capture failed:",
      error
    );

    await ErrorTracker.captureException(error, {
      context: 'linkedin_capture',
      send: false,
    });

    setResult(
      error instanceof Error
        ? error.message
        : String(error),
      "warn"
    );
  } finally {
    setLoading(false);
  }
}

async function importSessionToken() {
  setLoading(true);
  setResult("Looking for a Supabase session in this tab...");
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("No active tab found.");

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const keys = Object.keys(localStorage).filter((key) => key.startsWith("sb-"));
        for (const key of keys) {
          try {
            const raw = localStorage.getItem(key);
            if (!raw) continue;
            const parsed = JSON.parse(raw);
            const token = parsed?.access_token || parsed?.currentSession?.access_token || parsed?.session?.access_token;
            if (token) return { token, key };
          } catch {
            continue;
          }
        }
        return null;
      },
    });

    if (!result?.token) {
      throw new Error("No Supabase session token was found on this tab.");
    }

    state.authToken = result.token;
    el.authToken.value = state.authToken;
    await chrome.storage.local.set({ authToken: state.authToken });
    setResult(`Session imported from ${result.key}.`, "ok");
  } catch (error) {
    setResult(error instanceof Error ? error.message : String(error), "warn");
  } finally {
    setLoading(false);
  }
}

async function saveContact() {
  setLoading(true);
  try {
    readFormIntoDraft();
    await chrome.storage.local.set({ draft: state.draft });

    if (!state.authToken) {
      throw new Error("Import a session token before saving.");
    }
    if (!state.draft.name) {
      throw new Error("A LinkedIn name is required.");
    }

    await ErrorTracker.logBreadcrumb(`Saving contact: ${state.draft.name}`, 'contact-save');

    const res = await fetch(`${state.apiBaseUrl.replace(/\/+$/, "")}/api/networking`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${state.authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: state.draft.name,
        title: state.draft.title || undefined,
        company: state.draft.company || undefined,
        profileUrl: state.draft.profileUrl || undefined,
        platform: "LinkedIn",
        relationships: ["peer"],
        status: "connected",
        notes: state.draft.notes || undefined,
        referralPotential: false,
        tags: [],
      }),
    });

    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      const errorMsg = payload?.error || payload?.message || `Save failed (${res.status})`;
      throw new Error(errorMsg);
    }

    await ErrorTracker.logBreadcrumb(`Contact saved: ${payload?.name || state.draft.name}`, 'contact-save');
    setResult(`Saved ${payload?.name || state.draft.name} to networking.`, "ok");
  } catch (error) {
    await ErrorTracker.captureException(error, {
      context: 'save_contact',
      send: false,
    });
    setResult(error instanceof Error ? error.message : String(error), "warn");
  } finally {
    setLoading(false);
  }
}

function wireEvents() {
  el.saveSettingsBtn.addEventListener("click", persistSettings);

  el.importTokenBtn.addEventListener(
    "click",
    importSessionToken
  );

  el.extractBtn.addEventListener(
    "click",
    captureLinkedInProfile
  );

  el.saveContactBtn.addEventListener(
    "click",
    saveContact
  );

  el.clearTokenBtn.addEventListener("click", async () => {
    state.authToken = "";
    el.authToken.value = "";

    await chrome.storage.local.remove("authToken");

    setResult("Session token cleared.", "warn");
  });

  [
    el.name,
    el.title,
    el.company,
    el.profileUrl,
    el.notes,
  ].forEach((field) => {
    field.addEventListener("input", () => {
      readFormIntoDraft();

      chrome.storage.local.set({
        draft: state.draft,
      });
    });
  });
}


wireEvents();

loadSettings().catch((error) =>
  setResult(
    error instanceof Error
      ? error.message
      : String(error),
    "warn"
  )
);