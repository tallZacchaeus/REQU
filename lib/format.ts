const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
]
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]
const SCALES: [number, string][] = [
  [1_000_000_000, "Billion"],
  [1_000_000, "Million"],
  [1_000, "Thousand"],
]

function underThousand(n: number): string {
  if (n < 20) return ONES[n]
  if (n < 100) {
    const rest = n % 10
    return TENS[Math.floor(n / 10)] + (rest ? `-${ONES[rest]}` : "")
  }
  const rest = n % 100
  return `${ONES[Math.floor(n / 100)]} Hundred${rest ? ` and ${underThousand(rest)}` : ""}`
}

function toWords(n: number): string {
  if (n === 0) return "Zero"
  const parts: string[] = []
  let left = n
  for (const [value, name] of SCALES) {
    if (left >= value) {
      parts.push(`${underThousand(Math.floor(left / value))} ${name}`)
      left %= value
    }
  }
  if (left > 0) parts.push(underThousand(left))
  return parts.join(" ")
}

/** "One Hundred and Fifty Thousand Naira Only" — as written on a voucher. */
export function amountInWords(amount: number): string {
  if (!amount) return ""
  return `${toWords(amount)} Naira Only`
}

const NAIRA = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 })

/** 150000 -> "150,000". The ₦ is rendered separately so it can be styled down. */
export const formatAmount = (amount: number) => NAIRA.format(amount)

export const formatNaira = (amount: number) => `₦${NAIRA.format(amount)}`

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short" })
}

/** "3 days" — used to show how long a request has sat at a stage. */
export function durationSince(iso: string, now = new Date()) {
  const days = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 86_400_000))
  if (days === 0) return "today"
  if (days === 1) return "1 day"
  if (days < 30) return `${days} days`
  const months = Math.round(days / 30)
  return months === 1 ? "1 month" : `${months} months`
}
