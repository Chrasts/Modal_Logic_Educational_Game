# Privacy and analytics

Models, formulas, settings, learning history, and attempt results are stored in the browser's local storage. The application does not automatically transmit that content. Export and share-link actions happen only when the user explicitly invokes them; anyone receiving an exported file or generated URL can read the included content.

The repository ships without an analytics SDK, tracking cookies, accounts, or a cloud data backend. A static host may retain ordinary access logs under its own policy; the default GitHub Pages deployment is governed by GitHub's hosting and log-retention practices. Browser storage remains until the user clears it through Data management or browser controls.

There is therefore no in-app analytics opt-out toggle: analytics collection is off in the shipped build. School and research deployments can use the same build without modification. If a deployer adds aggregate traffic analytics, they must document the provider, cookies or cookieless mode, retention, legal basis, and an accessible opt-out before deployment; model and study data must remain excluded.
