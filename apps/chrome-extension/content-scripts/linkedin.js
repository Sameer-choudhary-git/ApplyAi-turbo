function normalizeText(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanLinkedInText(value) {
  return normalizeText(value)
    .replace(/\s*\|\s*LinkedIn.*$/i, "")
    .replace(/\s*-\s*LinkedIn.*$/i, "")
    .trim();
}

function getMeta(selector) {
  const element = document.querySelector(selector);
  return normalizeText(element?.getAttribute("content"));
}

function getCanonicalUrl() {
  const canonical = document.querySelector("link[rel='canonical']")?.href;

  if (canonical) {
    return canonical.split("?")[0].replace(/\/$/, "");
  }

  return location.href.split("?")[0].replace(/\/$/, "");
}

function getProfileSlug(url) {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/^\/in\/([^/]+)/i);
    return match ? decodeURIComponent(match[1]) : "";
  } catch {
    return "";
  }
}

function getJsonLdProfiles() {
  const results = [];

  document.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
    try {
      const parsed = JSON.parse(script.textContent || "");

      const items = Array.isArray(parsed)
        ? parsed
        : parsed?.["@graph"]
          ? parsed["@graph"]
          : [parsed];

      for (const item of items) {
        if (!item || typeof item !== "object") continue;

        const type = item["@type"];

        if (
          type === "Person" ||
          (Array.isArray(type) && type.includes("Person"))
        ) {
          results.push(item);
        }
      }
    } catch {
      // LinkedIn sometimes contains invalid/incomplete JSON-LD.
    }
  });

  return results;
}

function getPersonFromJsonLd() {
  const people = getJsonLdProfiles();

  if (!people.length) return null;

  const person = people[0];

  return {
    name: normalizeText(person.name),
    headline: normalizeText(
      person.jobTitle ||
      person.description ||
      ""
    ),
    company:
      normalizeText(person.worksFor?.name) ||
      normalizeText(person.affiliation?.name) ||
      "",
    location:
      normalizeText(person.address?.addressLocality) ||
      normalizeText(person.address?.addressRegion) ||
      "",
  };
}

function getNameFromDom() {
  /*
   * Do NOT depend on LinkedIn's generated class names.
   *
   * Prefer headings near the top of the profile.
   */

  const candidates = [];

  // LinkedIn has used h1, h2 and other heading structures.
  document.querySelectorAll("main h1, main h2, main h3").forEach((element) => {
    const text = normalizeText(element.textContent);

    if (!text) return;

    if (
      text.length >= 2 &&
      text.length <= 100 &&
      !/^(about|experience|education|skills|activity|contact info)$/i.test(text)
    ) {
      candidates.push(text);
    }
  });

  // Some newer LinkedIn layouts don't expose a useful <main>.
  document.querySelectorAll("h1, h2, h3").forEach((element) => {
    const text = normalizeText(element.textContent);

    if (!text) return;

    if (
      text.length >= 2 &&
      text.length <= 100 &&
      !/^(about|experience|education|skills|activity|contact info)$/i.test(text)
    ) {
      candidates.push(text);
    }
  });

  return candidates[0] || "";
}

function getHeadlineFromDom(name) {
  /*
   * Search text around the profile name rather than relying
   * on LinkedIn's generated CSS classes.
   */

  const headings = Array.from(
    document.querySelectorAll("main h1, main h2, main h3, h1, h2, h3")
  );

  const nameIndex = headings.findIndex(
    (element) => normalizeText(element.textContent) === name
  );

  if (nameIndex !== -1) {
    const nameElement = headings[nameIndex];

    /*
     * Check the nearby parent container.
     * LinkedIn usually keeps name + headline + location
     * inside the same profile intro section.
     */
    let parent = nameElement.parentElement;

    for (let depth = 0; depth < 6 && parent; depth++) {
      const texts = Array.from(parent.querySelectorAll("*"))
        .map((element) => normalizeText(element.textContent))
        .filter((text) => text.length > 0 && text.length < 300);

      const uniqueTexts = [...new Set(texts)];

      for (const text of uniqueTexts) {
        if (
          text !== name &&
          text.length > 3 &&
          text.length < 250 &&
          !/^(about|experience|education|skills|activity)$/i.test(text)
        ) {
          /*
           * Avoid obvious navigation / button text.
           */
          if (
            !/^(connect|message|follow|more|open to|subscribe)$/i.test(text)
          ) {
            return text;
          }
        }
      }

      parent = parent.parentElement;
    }
  }

  /*
   * Fallback: inspect common semantic attributes.
   */
  const attributeSelectors = [
    "[data-generated-suggestion-target]",
    "[aria-label*='headline' i]",
    "[data-testid*='headline' i]",
  ];

  for (const selector of attributeSelectors) {
    const element = document.querySelector(selector);
    const text = normalizeText(element?.textContent);

    if (text && text !== name && text.length < 300) {
      return text;
    }
  }

  return "";
}

function getLocationFromDom(name) {
  const selectors = [
    "[aria-label*='location' i]",
    "[data-testid*='location' i]",
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);

    const text = normalizeText(
      element?.getAttribute("aria-label") ||
      element?.textContent
    );

    if (text) return text;
  }

  /*
   * Search profile intro area for likely location strings.
   */
  const headings = Array.from(
    document.querySelectorAll("main h1, main h2, main h3, h1, h2, h3")
  );

  const nameElement = headings.find(
    (element) => normalizeText(element.textContent) === name
  );

  if (!nameElement) return "";

  let parent = nameElement.parentElement;

  for (let depth = 0; depth < 6 && parent; depth++) {
    const elements = Array.from(parent.querySelectorAll("span, div"));

    for (const element of elements) {
      const text = normalizeText(element.textContent);

      if (
        text &&
        text.length >= 2 &&
        text.length <= 100 &&
        !text.includes(name) &&
        !/^(connect|message|follow|more)$/i.test(text)
      ) {
        /*
         * This is only a fallback, so don't aggressively guess.
         */
        if (
          /\b(india|delhi|mumbai|bangalore|bengaluru|gurgaon|gurugram|noida|hyderabad|pune|chennai|kolkata|usa|united states|uk|london|canada|singapore)\b/i.test(
            text
          )
        ) {
          return text;
        }
      }
    }

    parent = parent.parentElement;
  }

  return "";
}

function parseHeadline(headline) {
  const value = cleanLinkedInText(headline);

  if (!value) {
    return {
      title: "",
      company: "",
    };
  }

  /*
   * Example:
   * Software Engineer at Google
   */
  const atMatch = value.match(/^(.+?)\s+at\s+(.+)$/i);

  if (atMatch) {
    return {
      title: normalizeText(atMatch[1]),
      company: normalizeText(atMatch[2]),
    };
  }

  /*
   * Example:
   * Software Engineer • Google
   */
  const separatorParts = value
    .split(/\s*(?:•|\||·)\s*/)
    .map(normalizeText)
    .filter(Boolean);

  if (separatorParts.length >= 2) {
    return {
      title: separatorParts[0],
      company: separatorParts[1],
    };
  }

  return {
    title: value,
    company: "",
  };
}

function getCompanyFromDom(headline) {
  /*
   * Search for explicit company/organization information.
   */
  const selectors = [
    "[aria-label*='company' i]",
    "[data-testid*='company' i]",
    "a[href*='/company/']",
  ];

  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);

    for (const element of elements) {
      const text = normalizeText(
        element.getAttribute("aria-label") ||
        element.textContent
      );

      if (
        text &&
        text.length >= 2 &&
        text.length <= 150 &&
        text !== headline
      ) {
        return text;
      }
    }
  }

  return "";
}

function getDescriptionHeadline() {
  const description =
    getMeta("meta[name='description']") ||
    getMeta("meta[property='og:description']");

  if (!description) return "";

  /*
   * LinkedIn descriptions often look like:
   *
   * "John Doe - Software Engineer at Google - Delhi..."
   */

  return cleanLinkedInText(description);
}

function extractLinkedInProfile() {
  const profileUrl = getCanonicalUrl();

  const jsonPerson = getPersonFromJsonLd();

  /*
   * -----------------------------
   * NAME
   * -----------------------------
   */

  let name =
    jsonPerson?.name ||
    getMeta("meta[property='profile:first_name']") ||
    getNameFromDom();

  /*
   * og:title is one of the most stable fallbacks.
   */
  if (!name) {
    const ogTitle = cleanLinkedInText(
      getMeta("meta[property='og:title']")
    );

    if (ogTitle) {
      name = ogTitle
        .replace(/\s*-\s*.*$/, "")
        .replace(/\s*\|\s*.*$/, "")
        .trim();
    }
  }

  /*
   * -----------------------------
   * HEADLINE
   * -----------------------------
   */

  let headline =
    jsonPerson?.headline ||
    getHeadlineFromDom(name);

  if (!headline) {
    headline = getDescriptionHeadline();
  }

  /*
   * -----------------------------
   * TITLE / COMPANY
   * -----------------------------
   */

  let { title, company } = parseHeadline(headline);

  if (!company) {
    company =
      jsonPerson?.company ||
      getCompanyFromDom(headline);
  }

  /*
   * If description contains a better "Title at Company"
   * structure, use that as fallback.
   */
  if ((!title || !company) && headline) {
    const parsed = parseHeadline(headline);

    if (!title) title = parsed.title;
    if (!company) company = parsed.company;
  }

  /*
   * -----------------------------
   * LOCATION
   * -----------------------------
   */

  const location =
    jsonPerson?.location ||
    getLocationFromDom(name);

  /*
   * -----------------------------
   * NOTES
   * -----------------------------
   */

  const notes = [
    "Captured from LinkedIn",
    headline ? `Headline: ${headline}` : "",
    location ? `Location: ${location}` : "",
  ]
    .filter(Boolean)
    .join(" • ");

  return {
    name: normalizeText(name),
    title: normalizeText(title),
    company: normalizeText(company),
    profileUrl,
    notes,
  };
}

function isLinkedInProfilePage() {
  return (
    location.hostname === "linkedin.com" ||
    location.hostname === "www.linkedin.com"
  ) && /^\/in\/[^/]+/i.test(location.pathname);
}

chrome.runtime.onMessage.addListener(
  (message, _sender, sendResponse) => {
    if (message?.type !== "APPLYAI_EXTRACT_LINKEDIN_PROFILE") {
      return false;
    }

    try {
      if (!isLinkedInProfilePage()) {
        sendResponse({
          success: false,
          error: "Open a LinkedIn profile page first.",
        });

        return false;
      }

      const profile = extractLinkedInProfile();

      /*
       * Don't silently return an empty profile.
       */
      if (!profile.name && !profile.profileUrl) {
        sendResponse({
          success: false,
          error:
            "Could not extract the LinkedIn profile. Wait for the page to finish loading and try again.",
        });

        return false;
      }

      sendResponse({
        success: true,
        profile,
      });
    } catch (error) {
      console.error(
        "[ApplyAI] LinkedIn extraction failed:",
        error
      );

      sendResponse({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      });
    }

    return true;
  }
);