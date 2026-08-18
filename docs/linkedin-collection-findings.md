# LinkedIn collection findings

Research date: 2026-08-18

## Official API catalog

LinkedIn’s official product catalog exposes consumer products such as Sign In with LinkedIn and Share on LinkedIn, plus marketing products such as Community Management. The catalog does not present a general-purpose API for reading an individual member’s home/feed timeline with all posts, reactions, commenters, and jobs.

Source: https://developer.linkedin.com/product-catalog

## Official platform policy

LinkedIn’s official Help page says it does not permit third-party software including crawlers, bots, browser plug-ins, or browser extensions that scrape, modify the appearance of, or automate activity on LinkedIn’s website. It also states that using unauthorized automated methods to access or download data, bypass access controls or use limits, or copy/distribute information obtained from the Services can violate the User Agreement and may result in account restriction or shutdown.

Source: https://www.linkedin.com/help/linkedin/answer/a1341387

## Engineering decision

Do not build a stealth scraper, CAPTCHA bypass, rate-limit bypass, or background account automation. Build a user-invoked, local export utility that operates only on data the user explicitly opens and can see in their own authenticated browser session. The utility should be conservative about completeness: it must record extraction gaps, DOM/selector failures, and the exact collection window rather than claiming that LinkedIn data is universally complete. It should support official APIs for future company-page or approved use cases, but the initial implementation should not rely on undocumented private endpoints.
