# 04 — UI/UX Design Brief

**Related:** [03-App-Flow.md](03-App-Flow.md)

Designed in Figma and converted to code by the project's designer. The tokens in
`app/globals.css` are authoritative — where this document and the code disagree, the code wins.

## 1. Direction

Calm and administrative, closer to a banking back-office than a consumer app. The subject is
other people's money, and the interface should feel like a record rather than a feed. Restraint
over decoration: one accent colour, generous whitespace, figures set in a monospace so columns
line up and digits can be compared at a glance.

## 2. Colour

| Token | Value | Use |
| --- | --- | --- |
| `--brand` | `#0ea5e9` | Primary actions, active navigation |
| `--brand-ink` | `#0369a1` | Brand text, hover states |
| `--ink` | `#0b1524` | Body text |
| `--ink-soft` | `#55606f` | Secondary text |
| `--ink-faint` | `#8a94a2` | Labels, hints, metadata |
| `--canvas` | `#f2f4f7` | Page background |
| `--hairline` | `#e3e8ee` | Borders and rules |
| `--accent` | `#eef0f3` | Quiet surfaces |
| `--destructive` | `#b3261e` | Reject, delete, overspend |

Cards are white on the canvas grey, separated by hairlines rather than heavy shadow.

**Status tones** carry meaning consistently: `neutral` (draft), `motion` (moving through),
`action` (waiting on you), `good` (approved, reconciled), `bad` (rejected). A status is always
shown as a coloured dot plus words — never colour alone.

## 3. Typography

- **Source Sans 3** for everything textual. Humanist, unfussy, legible at small sizes on a phone.
- **IBM Plex Mono** for money and references, so amounts align in a column and a payment
  reference can be read aloud without ambiguity.
- Headings distinguish themselves by weight and size, not by a second display face.

## 4. Layout

- Persistent left sidebar (Home, Requisitions/Queue, Reports, Settings, Profile) with the
  signed-in person at the foot; collapses on small screens.
- Top bar: search, notifications, and the one primary action for that role.
- Content in a centred column; requisition detail runs as a single narrative column with the
  stage rail alongside, rather than a dense two-pane layout.
- **The stage rail** is the signature component: five stages, each done, current, pending or
  blocked, so anyone can see at a glance where a request has got to and who holds it.

## 5. Components

All 20 in `components/app/`: `charts`, `fields`, `logo`, `motion`, `notifications`,
`primitives`, `reports`, `requisition-card`, `requisition-row`, `review-card`, `screen-header`,
`search`, `settings`, `settings-view`, `sheet`, `shell`, `stage-rail`, `switch`, `toast`,
`topbar`. Reviewer variants in `components/reviewer/`; shared primitives in `components/ui/`.

Money is always formatted `₦1,175,000` — grouped, no decimals, never abbreviated to "1.2m" in a
figure anyone might act on.

## 6. Accessibility

- Status never relies on colour alone; a dot is always paired with its label.
- Touch targets sized for a phone held one-handed.
- Plain-language empty states and errors: the audience is volunteers, not operators.
- Text at 14px and above, with generous line height.
- **To verify before production:** focus-visible styling on every interactive element, contrast
  ratios against `--canvas` for `--ink-faint`, and a full keyboard pass through the review
  queue. None of these has been audited yet.

## 7. Brand assets

The REQU mark is a small bar-chart glyph in `--brand`, used at the sidebar head and on the
sign-in screen. There is no favicon yet — one should be added before the app is circulated
more widely.
