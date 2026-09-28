# Website Refresh Validation

Date: 2026-09-28

## Passed

- 18 Node regression tests: fair/same starts, pace limits, reference semantics,
  long-duration labels, invalid pace, unavailable races, fixture isolation,
  attribution, secure UUID fallback, clock skew, HTTP failures and script origins.
- Static checks on all seven pages: links, assets, anchors, heading/ID basics,
  image alternatives/dimensions, button names, product wording and invite metadata.
- Current app export flags match the public capabilities snapshot.
- Browser layout checks: main pages at 320, 768 and 1440 CSS pixels;
  invite states and mobile controls at 390 pixels. No horizontal or heading overflow.
- Browser interactions: mobile menu, Escape dismissal, Fair start / Same start,
  animation movement, pause, valid preview followed by invalid input, pace limits.
- Browser invitation cases: fair, same, limited, missing reference pace,
  unmapped route, expired, past and cancelled. No production requests or events.
- All four synthetic product images load. Higher-resolution captures replaced
  the initial soft exports.
- Reviewed privacy-policy body remains byte-identical to the published baseline.
- Reference web files match the app site's copy byte-for-byte.
- App reference validation: typecheck, lint, 168 test files / 1,212 tests;
  release readiness: 185 pass, zero warnings, zero failures.
- Git diff whitespace checks pass.

## Not Claimed

- This is not physical-device QA or verification of installed beta availability.
- Native deep-link opening and invite recovery through authentication were not
  exercised in this website pass. Token/funnel continuity was checked in the
  browser and regression tests.
- Reduced-motion guards are implemented, but an OS-level preference toggle was
  not exercised in this browser session.
- Live Pages checks remain pending merge and deployment.
- No production race, account, email campaign, calendar, provider permission,
  API key, mobile build or backend schema was changed.
