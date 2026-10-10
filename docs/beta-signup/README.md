# Beta form review pack

Draft only. The form is not published and the intake function is not deployed.
Do not merge until Can approves the collection/retention policy, that policy is
live, and the backend deployment/security/cleanup gates have passed.

The Home `#beta` section is the only form. How it works and Routes link to it.
Both original mailto fallback links remain usable without JavaScript. No legal
page or existing site-policy/test gate was changed.

The screenshots use synthetic `runner@example.invalid` data and intercepted
responses, never production submissions. Captures show the whole form section;
the viewport height grows to fit it so sticky navigation does not obscure it.
The interaction checks also run at 320/390/1440 x 1000 before capture.

| Width | Idle                              | Sending                              | Sent                              | Error                              |
| ----- | --------------------------------- | ------------------------------------ | --------------------------------- | ---------------------------------- |
| 320   | [View](screenshots/320-idle.png)  | [View](screenshots/320-sending.png)  | [View](screenshots/320-sent.png)  | [View](screenshots/320-error.png)  |
| 390   | [View](screenshots/390-idle.png)  | [View](screenshots/390-sending.png)  | [View](screenshots/390-sent.png)  | [View](screenshots/390-error.png)  |
| 1440  | [View](screenshots/1440-idle.png) | [View](screenshots/1440-sending.png) | [View](screenshots/1440-sent.png) | [View](screenshots/1440-error.png) |

## Checks

`npm ci`, `npm test`, `npm run check` and
`node scripts/check-beta-browser.mjs` (requires an existing Playwright install
and Chrome; use `PLAYWRIGHT_MODULE`/`PLAYWRIGHT_CHANNEL` to select them).
The browser script starts/stops a local-only server, intercepts all submissions,
checks error retry, field validation, disabled sending, no horizontal overflow,
JavaScript-off/module-load-failure fallback, keyboard selection/submission,
duplicate suppression and focus handling, and captures all twelve states. No new browser dependency
is added to the site's production source.

Native Safari/iOS, software-keyboard and screen-reader checks remain manual
follow-ups. The expanded-height captures are not evidence of those device checks.

## Publication order for Can

1. Approve request retention, operator access, invitation sender and the privacy
   paragraph. Publish the policy separately and verify it is live.
2. Follow the app PR's targeted migration, separate 24-hour rate-record cleanup,
   secret, disabled-function deployment and gateway-header verification steps.
   Enable the intake only after those checks pass. No broad database deploy.
3. After separate merge approval, publish this site PR last. Verify new/repeat
   submissions and fallback with synthetic details; remove test records. Do not
   automate invitation emails without deciding on address confirmation first.

## Draft privacy paragraph (not published)

> When you request beta access, we collect your email address, device type, and
> any city or running preference you choose to provide. We use this information
> to organize beta access and send testing instructions, not marketing emails.
> Authorized Catchfire operators manage requests in our Supabase-hosted database.
> We keep beta requests for [approved retention period], then delete them. To
> limit abuse, we store keyed hashes of your IP address and email separately from
> your request. These rate-limit records expire after 24 hours and are removed by
> our scheduled cleanup. Contact legal@catchfire.run to request deletion.

This proposal requires approval, including retention and platform-log handling.
The database request table and the keyed rate-limit table are separate. The
required Cron cleanup runs each minute, deleting rows whose age exceeds 24 hours;
it must be monitored. Request retention is not yet selected or automated.
