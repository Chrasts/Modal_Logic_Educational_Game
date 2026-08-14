# Privacy and analytics

## Local game data

Models, formulas, settings, learning history, and attempt results are stored in the browser's local storage. The application does not automatically transmit that content. Export and share-link actions happen only when the user explicitly invokes them; anyone receiving an exported file or generated URL can read the included content.

Browser storage remains until the user clears it through Data management or browser controls. The application has no accounts or cloud backend for this game data. A static host may nevertheless retain ordinary access logs under its own policy; the default GitHub Pages deployment is governed by GitHub's hosting and log-retention practices.

## Aggregate site analytics

The default build loads Umami Cloud's analytics script from `https://cloud.umami.is/script.js`, configured with this site's public website identifier. It is retained to measure aggregate site use. The application does not send models, formulas, settings, learning progress, attempt results, export contents, or share-link contents to Umami, and it does not make custom Umami tracking calls.

Umami documents its product as a privacy-focused analytics service, including a cookieless mode and no cross-site tracking. The service is still an external network request: routine request information needed to load and use the analytics service may be processed by Umami Cloud under its own terms and privacy documentation. See the official [Umami documentation](https://docs.umami.is/docs) and [Umami Cloud overview](https://umami.is/docs/cloud/overview).

There is currently no in-app analytics opt-out toggle. A school, research, or other deployment that needs a different consent, notice, retention, or opt-out arrangement must make that decision for its jurisdiction and either adapt or remove the Umami integration. Game and study content must remain excluded from analytics.
