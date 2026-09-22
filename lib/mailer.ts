import nodemailer from "nodemailer"

/**
 * Sends through the parish's own mail server, using the Dovecot master user the same way
 * the mail application does: authenticate as `<from>*<master>` so no individual mailbox
 * password is needed anywhere in this app.
 */
const cfg = () => ({
  host: process.env.MAIL_HOST ?? "mail.rccgyayang.org",
  port: Number(process.env.SMTP_PORT ?? 587),
  from: process.env.MAIL_FROM ?? "onboarding@rccgyayang.org",
  master: process.env.MASTER_USER ?? "",
  password: process.env.MASTER_PASSWORD ?? "",
})

export const mailerConfigured = () => Boolean(cfg().master && cfg().password)

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

export async function sendSignInLink(to: string, opts: { name: string; url: string; minutes: number }) {
  const c = cfg()
  if (!mailerConfigured()) throw new Error("mail is not configured (MASTER_USER / MASTER_PASSWORD)")

  const first = opts.name.split(" ")[0] ?? opts.name
  const text = [
    `Hello ${first},`,
    "",
    "Here is your link to sign in to Requisition:",
    opts.url,
    "",
    `It works once, and stops working after ${opts.minutes} minutes.`,
    "",
    "If you did not ask for this, you can ignore it — nobody can get in without the link.",
    "",
    "RCCG YAYA · Requisitions",
  ].join("\n")

  const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif;font-size:15px;line-height:1.55;color:#0b1524">
  <p style="margin:0 0 14px">Hello ${esc(first)},</p>
  <p style="margin:0 0 20px">Here is your link to sign in to Requisition.</p>
  <p style="margin:0 0 20px">
    <a href="${esc(opts.url)}" style="display:inline-block;background:#0369a1;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600">Sign in to Requisition</a>
  </p>
  <p style="margin:0 0 20px;color:#55606f;font-size:13px">It works once, and stops working after ${opts.minutes} minutes.</p>
  <p style="margin:0 0 20px;color:#55606f;font-size:13px">If the button does not work, copy this into your browser:<br>
    <span style="word-break:break-all">${esc(opts.url)}</span></p>
  <p style="margin:0 0 6px;color:#8a94a2;font-size:12px">If you did not ask for this you can ignore it — nobody can get in without the link.</p>
  <p style="margin:0;color:#8a94a2;font-size:12px">RCCG YAYA · Requisitions</p>
</div>`

  const transport = nodemailer.createTransport({
    host: c.host,
    port: c.port,
    secure: c.port === 465,
    auth: { user: `${c.from}*${c.master}`, pass: c.password },
  })
  await transport.sendMail({
    from: `RCCG YAYA Requisition <${c.from}>`,
    to,
    subject: "Your link to sign in to Requisition",
    text,
    html,
  })
}
