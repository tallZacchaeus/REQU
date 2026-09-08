/**
 * Kept at module scope on purpose: generating an id or reading the clock is
 * impure, and the React Compiler rejects impure calls made from a function
 * declared inside a component body even when it only ever runs in a handler.
 */
export const newId = (prefix: string) => `${prefix}${Math.random().toString(36).slice(2, 8)}`

/** Today as an ISO date (YYYY-MM-DD). */
export const isoToday = () => new Date().toISOString().slice(0, 10)
