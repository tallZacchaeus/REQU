# Testing REQU

A prototype of the Youth & Young Adults requisition workflow. Everything below
runs in the browser — there is no server, no database and no real email.

## Sign in

The login screen lists four prototype accounts. Tap one, then **Send login
link**, then **Open email app**. That last button stands in for tapping the
link you would really receive.

| Account | Role | Does |
| --- | --- | --- |
| Pastor David Adeyemi | HOD | Raises requisitions, tracks them, files reconciliations |
| Pastor Grace Ojo | ANYP | Recommends or returns them |
| Pastor Emmanuel Bassey | NYP | Approves, returns or rejects |
| Mrs Ngozi Eze | Finance | Disburses funds and closes reconciliations |

## Test it as one person, not four

**State lives in your own browser.** Everyone who opens the link starts from
the same seed data, but nothing is shared between people. If one tester
recommends a requisition, another tester will not see it.

So walk the whole chain yourself, signing out and back in at each step:

1. **David** — raise a new requisition and submit it
2. **Grace** — find it in the review queue and recommend it
3. **Emmanuel** — approve it
4. **Ngozi** — record the disbursement with any payment reference
5. **David** — the requisition now shows reconciliation due; enter what was
   actually spent, attach a receipt and file it
6. **Ngozi** — accept the reconciliation, which closes it

Sign out from the Profile tab.

Also worth trying: have Grace **request changes** instead of recommending, then
sign in as David to see her comment and the numbered points she asked for.

## Resetting

To get back to the original seed data, open the browser console and run
`localStorage.clear()`, then reload.

## What is not real

- **No authentication.** Anyone with the link can enter as any role.
- **No email.** The magic link is simulated.
- **No file storage.** Attachments record a name and size only; the files are
  not uploaded anywhere.
- **The figures are invented.** Nothing here reflects real church finances.

## Screen sizes

The layout is built for three: a phone at 390px, a tablet at 768px, and a
desktop sidebar layout from 1024px up. All three are worth a look.
