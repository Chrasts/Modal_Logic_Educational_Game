# Privacy and analytics

Models, formulas, settings, learning history, authored content, and detailed attempt records are stored in the browser's local storage. Export and share-link actions happen only when the user explicitly invokes them; anyone receiving an exported file or generated URL can read the included content.

The public GitHub Pages deployment uses **Umami Cloud** for privacy-focused usage analytics. Umami's tracker is cookieless and does not store personally identifiable information. It records ordinary aggregate traffic metadata such as page views, referrers, browser/OS/device class, country, and anonymous sessions, plus selected custom interaction events described below. The tracker is restricted to `chrasts.github.io` and respects the browser's Do Not Track setting.

The application sends only coarse interaction metadata needed to understand how the educational game is used. Current custom events cover navigation choices, Learn/campaign/practice item openings, guided-task views and completions, task-check clicks, hint reveals, fixed prediction choices, and selected workspace actions. Event properties use built-in identifiers, section/item labels, action names, indexes, modes, and completion state. **Formulas, Kripke-model contents, custom mission/campaign payloads, free-form text, local learning-history records, and exported data are not included in analytics events.**

Share links encode validated mission or campaign JSON in the URL fragment. Umami is explicitly configured not to collect URL fragments, so those payloads are excluded from analytics.

Umami Cloud is operated by the creators of Umami. According to Umami's documentation, the service uses no tracking cookies, does not track visitors across websites, anonymizes collected analytics data, and offers EU and US Cloud regions. Retention and account-region settings are controlled by the Umami Cloud account and plan rather than by this static application.

Users who enable the browser's Do Not Track setting are excluded by the configured tracker. Browser extensions and content blockers may also block the analytics script. Deployments other than the public GitHub Pages site can remove or replace the tracker and should document their own analytics provider, retention, legal basis, and opt-out mechanism as required for their context.
