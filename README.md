# Catchfire Website

Public deployment source for [catchfire.run](https://catchfire.run).

This repository is intentionally limited to public marketing, support, legal,
and route-preview materials. Application code, backend services, operational
documentation, validation data, and credentials belong in the separate
Catchfire repository.

GitHub Pages publishes the root of `main`. The `CNAME` file binds the deployment
to `catchfire.run`. Do not merge a domain change until DNS, HTTPS and
path/query-preserving redirects from `scorchapp.xyz` are ready. The owner has
confirmed `support@catchfire.run` and `legal@catchfire.run` are working.

## Development

This remains a static site; there is no runtime framework or build step.
npm ci installs development-only validation and formatting tools.

- npm start: local preview at http://127.0.0.1:4185
- npm test: invite, attribution and race-example regression tests
- npm run check: HTML, link, asset, accessibility-basics and product-copy gates
- node scripts/check-app-flags.mjs /path/to/scorch: optional local flag parity

See [RELEASE-CHECKLIST.md](RELEASE-CHECKLIST.md) for publication, synthetic
artwork provenance and checks that require the actual installed app.

Copyright 2026 Katsuko, Inc. All rights reserved. Public access to this
repository does not grant permission to reuse its code, copy, artwork, or brand
assets.
