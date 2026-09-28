# Website / App Parity

## Source Of Truth

caniseri/scorch-site owns the deployed root of scorchapp.xyz. The app repo's
site/ is a reference mirror, not a second publishing source. Use a feature
branch and reviewed PR; merging main triggers GitHub Pages.

product-scope.json is the public, dated capabilities snapshot. Treat these as
three different facts: implemented code, production flags, and the build that
a tester can actually install. Do not turn a successful build into an
availability claim.

## Before Every Website Or App Release

1. Reconcile the capabilities snapshot with the app's current release.
2. Run npm ci, npm test, and npm run check.
3. With the app checkout available, run:
   node scripts/check-app-flags.mjs /path/to/scorch
4. Review Solo / Race / Host labels, fair versus same start, result review,
   export availability, calendar limitations and the beta access links.
5. Check 320px, 390px, 768px and desktop widths, keyboard focus, the mobile
   navigation, reduced motion, both simulation modes, pause and replay.
6. Verify valid fair / same / pace-limited invitations, invalid pace after a
   successful preview, missing reference pace, unmapped route, unavailable
   states and network failure. Confirm token and fid survive the handoff.
7. Confirm the reviewed privacy disclosures are not accidentally changed.
8. Merge only after publication approval, wait for Pages success, then verify
   live content and assets. Mirror the approved web files into app site/;
   do not sweep unrelated app changes into a commit.

## Local Invitation Fixtures

Fixtures work only on localhost or 127.0.0.1, never on the production hostname.
They never call the production API or emit funnel events.

    /invite/?fixture=1&token=12345678-1234-4234-8234-123456789abc&fid=abcdefab-1234-4234-8234-123456789abc&case=fair

Cases: fair, same, limited, missing-pace, unmapped, expired, past, cancelled.
Use a real approved QA invitation separately for native app/auth handoff.

## Artwork Provenance

The four images in assets/product/ are captures of current Scorch
presentation components rendered by the local preview harness, with synthetic
runner and result data. They are not live customer data, full native screens,
or claims that a specific TestFlight / Play build is available.

The capture tool exports the component in the top-left half of its bitmap;
the shared component-capture styling frames that region without changing
the component contents. Refresh all four captures together when that tool
behavior changes.

Icons are a vendored subset of Lucide, with its license in assets. Fonts are
self-hosted. No third-party analytics or scripts were added.

## Scope Limits

The diagram illustrates constant example paces, not race predictions, GPS
positions or a guarantee of equal finishes. Unrestricted Same start does not
need a pace; pace limits still do. Website previews do not reserve entry.

No paid races, prizes, public Weekly leaderboard, automatic Garmin/Strava sync,
automatic calendar updates, or production Health Connect are advertised.

The privacy-policy body is preserved. Terms change only the product-scope
sentence and revision date, not liability, waiver or safety clauses.
