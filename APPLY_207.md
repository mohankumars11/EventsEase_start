# Apply 207 — Veg check

`supabase/migrations/207_dish_diet_review.sql` — paste into **Supabase → SQL
Editor**, run, then:

```
node --env-file=.env scripts/check-dish-diet-review-live.mjs
```

It touches no real dish or menu: it certifies a temporary **inactive** fixture
dish with a throwaway admin, and deletes both.

## Where to do the review

**Admin Dashboard → Food catalogue → "Veg check — unlock vegetarian menus".**

- **Menu by menu**, closest to done first. 4 dishes unblock the first menu,
  31 unblock five, 113 unblock fifteen.
- **Look at these one at a time** — dishes whose name is where a veg tag most
  often hides egg, stock, fish/oyster sauce or gelatin (Butter Naan, Cream of
  Tomato Soup, Gobi Manchurian…), each with the reason. Answer **Pure veg**,
  **Contains egg** or **Non-veg**. Not sure? Leave it — it stays in the queue.
- **Everyday dishes** — Sambar, Curd, Jalebi — as a tick-list. It starts
  ticked: untick anything you are unsure of, then **Confirm N as pure
  vegetarian**. The press is the act; nothing is certified without it.
- **This menu needs a different dish** — a dish already reviewed as egg or
  non-veg sitting in a veg menu. Reviewing again will not fix that; the menu
  has to change, in **Menu catalogue**.

## What changed in the main list

**Approve now certifies a diet.** Each row has a diet choice (defaulting to
the dish's current tag), and Approve records that diet with who and when.
Before, Approve flipped `review_status` alone — and since 205 that flag is
what makes a veg-tagged dish count as verified vegetarian, so Approve was
certifying whatever tag happened to be there, with no way to correct it.

## What 207 adds

| | |
|---|---|
| `sambramo_review_dish_diet(ids, verdict, note)` | admins only; ≤ 100 at a time; sets the diet, marks reviewed, keeps `contains_egg` consistent |
| `sambramo_dish_diet_reviews` | every verdict, append-only from clients; admins read |
| `sambramo_master_dishes.diet_reviewed_by / _at` | who certified it, and when |
| `sambramo_diet_review_by_menu` | the queue: per veg menu, `to_review` and `needs_swap` |
| `sambramo_diet_review_backlog.problem` | `to_review` / `wrong_for_menu` / `hidden_dish` — so a dish reviewed as egg stops looking like unfinished review work |

Both views now exclude **rejected** templates: customers never see those, so
reviewing their dishes unblocks nothing. (None exist today.)
