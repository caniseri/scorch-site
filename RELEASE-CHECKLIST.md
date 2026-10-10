# Website / App Parity

## Source Of Truth

caniseri/scorch-site owns the website moving from scorchapp.xyz to catchfire.run. The app repo's
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

The screen plates in assets/screens/ are illustrative component previews with
synthetic data, not live races, real runners or device screenshots. They do
not claim that a specific TestFlight or Play build is available.

Source: caniseri/scorch at commit 75e0cda2fd96cd42cd5ab1d09df4bb7136c486d8
(branch codex/option-6-visual-refresh), rendered by the dev-only preview
harness in tools/preview (Vite, http://127.0.0.1:5173). Component content was
not edited.

Capture settings: headless Chromium, deviceScaleFactor 3, dark colour scheme,
locale en-US, time zone America/New_York, clock fixed at
2026-10-10T07:41:00-04:00 so relative start times read as one morning.

- Full screen: /option6.html?screen=find at a 402 x 874 viewport, element
  .option6-device with .option6-status and the review toolbar hidden.
  Cropped to the content between the app header and the tab bar.
- Components: /?scenario=NAME&capture=1 at 440 CSS px wide, with 24px / 20px
  padding added around main.capture so content does not touch the plate edge.
  Scenarios: race-day, start-open, recording, final, upcoming, countdown,
  start-line, field-progress, under-review, just-run-finished, all-runners,
  manage-rules-fair.

Each capture is cropped at a clean boundary between elements, padded with its
own background to a fixed frame, resized with Lanczos and saved as WebP at
quality 82:

| File | Source | Frame (CSS px) | Size |
| --- | --- | --- | --- |
| strip-find | screen=find | 402 x 720 | 540 x 967 |
| strip-start, race-start | race-day | 440 x 788 | 540 x 967, 720 x 1289 |
| strip-line | start-open | 440 x 788 | 540 x 967 |
| strip-chase | recording (to 712px) | 440 x 788 | 540 x 967 |
| strip-result, race-result | final (to 720px) | 440 x 788 | 540 x 967, 720 x 1289 |
| step-start | upcoming | 440 x 657 | 720 x 1075 |
| step-countdown | countdown | 440 x 657 | 720 x 1075 |
| step-line | start-line | 440 x 657 | 720 x 1075 |
| step-chase | field-progress | 440 x 657 | 720 x 1075 |
| step-result | under-review (to 620px) | 440 x 657 | 720 x 1075 |
| way-solo | just-run-finished (to 470px) | 440 x 525 | 720 x 859 |
| way-race | all-runners | 440 x 525 | 720 x 859 |
| way-host | manage-rules-fair | 440 x 525 | 720 x 859 |

Every file is under 25 KB. Images are served at or above twice their displayed
CSS size. The previous assets/product/ PNGs were removed once nothing used them.

Known harness defects, avoided rather than shown: the full Race detail screen
hides "2 min after the first runner" and "Check recording before you run"
under its fixed action panel; the just-run-finished fixture clips "You showed
up. This effort is now in your solo history" under its fixed buttons; the
solo fixture shows race-only stats (Gap to winner, Head start, Finishers) on a
solo result; the full Profile screen uses "verified" wording; the find-*
component scenarios render a placeholder header.

Icons are a vendored subset of Lucide, with its license in assets. Fonts are
self-hosted. No third-party analytics or scripts were added.

## Scope Limits

The flame chase uses fictional runners and per-kilometre splits, not race
predictions, GPS positions or a guarantee of equal finishes. It explains the
leader; it does not advertise a shipped native flame-tracking feature. The
homepage has a compact replay; How It Works adds chapters and finish results.
The flame changes only on a lead change and stays with the first finisher.
Individual run times do not determine fair-start placing.

Check that both modes finish, replay resets, offscreen/hidden tabs pause,
reduced motion disables autoplay, and chapter controls work by keyboard.
The three names, colors and initials must stay constant across lead changes.
No third-party scripts, artwork or fonts were added; the existing owned mark
and site assets are reused. The provided flame-chase prototype informed the
fictional splits and sequence, not the page layout or embedded asset payloads.

Unrestricted Same start does not
need a pace; pace limits still do. Website previews do not reserve entry.

No paid races, prizes, public Weekly leaderboard, automatic Garmin/Strava sync,
automatic calendar updates, or production Health Connect are advertised.

The rebrand changes the product name and public website URLs, and adds a
former-name continuity sentence to privacy and terms. It does not change
data practices, liability, waiver, or safety clauses. Public contacts now use
support@catchfire.run and legal@catchfire.run, confirmed working by the owner.

Do not merge the CNAME cutover until catchfire.run DNS and GitHub Pages HTTPS
are coordinated and the old domain has a path/query-preserving HTTPS redirect.
