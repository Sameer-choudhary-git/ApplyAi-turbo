function textFrom(selectors) {
  for (const selector of selectors) {
    const node = document.querySelector(selector);
    const text = node?.textContent?.trim();
    if (text) return text;
  }
  return "";
}

function metaValue(selector) {
  return document.querySelector(selector)?.getAttribute("content")?.trim() || "";
}

function cleanHeadline(value) {
  return value.replace(/\s+/g, " ").replace(/\| LinkedIn$/i, "").trim();
}

function parseHeadline(headline) {
  const normalized = cleanHeadline(headline);
  if (!normalized) return { title: "", company: "" };

  const atMatch = normalized.match(/^(.*?)(?:\s+at\s+)(.+)$/i);
  if (atMatch) {
    return {
      title: atMatch[1].trim(),
      company: atMatch[2].trim(),
    };
  }

  const pipeParts = normalized.split(/\s*[•|]\s*/).map((part) => part.trim()).filter(Boolean);
  return {
    title: pipeParts[0] || normalized,
    company: pipeParts[1] || "",
  };
}

function extractLinkedInProfile() {
  const profileUrl = document.querySelector("link[rel='canonical']")?.href?.split("?")[0] || location.href.split("?")[0];
  const name = textFrom(["main h1", "h1"]) || cleanHeadline(metaValue("meta[property='og:title']").replace(/\s*\|\s*LinkedIn$/i, ""));
  const headerHeadline = textFrom([
    "main .text-body-medium.break-words",
    "main .pv-text-details__left-panel",
    "main [data-generated-suggestion-target]",
  ]) || cleanHeadline(metaValue("meta[name='description']"));
  const { title, company } = parseHeadline(headerHeadline);
  const location = textFrom(["main .text-body-small.inline.t-black--light.break-words", "main .pv-text-details__left-panel .text-body-small"]);

  const notes = [
    "Captured from LinkedIn",
    headerHeadline ? `Headline: ${headerHeadline}` : "",
    location ? `Location: ${location}` : "",
  ]
    .filter(Boolean)
    .join(" • ");

  return {
    name,
    title,
    company,
    profileUrl,
    notes,
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "APPLYAI_EXTRACT_LINKEDIN_PROFILE") return false;

  try {
    if (!location.hostname.includes("linkedin.com")) {
      sendResponse({ success: false, error: "This is not a LinkedIn page." });
      return false;
    }

    sendResponse({ success: true, profile: extractLinkedInProfile() });
  } catch (error) {
    sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) });
  }

  return true;
});
