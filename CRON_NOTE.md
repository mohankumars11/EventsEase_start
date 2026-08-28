# Why the wave cron runs once a day

`api/dispatch-waves.js` widens the search radius for lines nobody has
accepted yet: 5 km, then 10, then 15. It wants to run every minute,
because an offer window is 45 seconds and a line that nobody answered
should move outward on the next pass, not tomorrow.

The Vercel **Hobby plan allows one cron run per day.** A `* * * * *`
schedule does not fail at runtime — it fails the DEPLOY, with
`deploy_failed: Hobby accounts are limited to daily cron jobs`. That is
why production sat at a 15-hour-old build.

## What runs instead

The customer's own matching screen advances its waves. It is already
polling every few seconds while lines are hunting, so it nudges
`/api/dispatch-waves` on the same tick. Waves therefore widen in real
time for exactly the case that matters — somebody watching the screen,
waiting to be matched.

The daily cron is the floor underneath that: it catches lines belonging
to a customer who closed the tab, and moves lines that have run out of
waves into `standing` so migration 069's triggers can re-dispatch them
when supply appears.

## What is actually lost

A customer who starts a booking and closes the app before anyone accepts
waits until the next daily run instead of the next minute. Nobody is
dropped and no line is lost — the wait is longer.

## To restore per-minute

Upgrade the Vercel project to Pro, then set the schedule back:

    "schedule": "* * * * *"

That is the only change needed; the endpoint is unmodified.
