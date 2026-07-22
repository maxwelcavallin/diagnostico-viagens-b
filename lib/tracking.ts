/**
 * Tracking helpers — dataLayer, event_id/session_id generation, UTM/click ID capture.
 * Segue o padrão obrigatório descrito em Viagente-Tracking-Performance-LPs.md.
 */

export interface TrackingParams {
  utm_source: string
  utm_medium: string
  utm_campaign: string
  utm_term: string
  utm_content: string
  fbclid: string
  gclid: string
  referrer: string
  fbc: string
  fbp: string
  client_user_agent: string
}

const SESSION_KEY = "viagente_diagb_session_id"
const FORM_ATTEMPT_KEY = "viagente_diagb_form_attempt_id"
const LEAD_EVENT_KEY = "viagente_diagb_lead_event_id"

export function generateEventId(prefix = "event"): string {
  if (typeof window !== "undefined" && window.crypto?.randomUUID) {
    return `${prefix}_${window.crypto.randomUUID()}`
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`
}

function getSessionStorageValue(key: string): string | null {
  if (typeof window === "undefined") return null
  try {
    return window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function setSessionStorageValue(key: string, value: string): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(key, value)
  } catch {
    // sessionStorage indisponível (modo privado etc.) — segue sem persistir
  }
}

/** session_id — uma sessão inteira de navegação na LP */
export function getOrCreateSessionId(): string {
  const existing = getSessionStorageValue(SESSION_KEY)
  if (existing) return existing
  const value = generateEventId("diagb_session")
  setSessionStorageValue(SESSION_KEY, value)
  return value
}

/** form_attempt_id — uma tentativa de preenchimento (reseta a cada abertura do quiz) */
export function getOrCreateFormAttemptId(): string {
  const existing = getSessionStorageValue(FORM_ATTEMPT_KEY)
  if (existing) return existing
  return resetFormAttemptId()
}

export function resetFormAttemptId(): string {
  const value = generateEventId("diagb_attempt")
  setSessionStorageValue(FORM_ATTEMPT_KEY, value)
  return value
}

/** lead_event_id — usado para deduplicar generate_lead / Meta Pixel Lead / CAPI Lead */
export function getOrCreateLeadEventId(): string {
  const existing = getSessionStorageValue(LEAD_EVENT_KEY)
  if (existing) return existing
  return resetLeadEventId()
}

export function resetLeadEventId(): string {
  const value = generateEventId("diagb_lead")
  setSessionStorageValue(LEAD_EVENT_KEY, value)
  return value
}

/** Remove e-mail/telefone de mensagens de erro antes de mandar pro dataLayer/GA4 */
export function sanitizeErrorMessage(message: unknown): string {
  if (!message) return ""
  return String(message)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email_removed]")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[phone_removed]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180)
}

export function getTimeOnFormBucket(ms: number): string {
  const sec = ms / 1000
  if (sec < 30) return "0_30_sec"
  if (sec < 60) return "30_60_sec"
  if (sec < 120) return "60_120_sec"
  return "120_plus_sec"
}

/** Browser/OS/device — identifica quebras específicas (Instagram in-app, WebView etc.) */
export function getDebugDeviceInfo() {
  if (typeof window === "undefined") {
    return { debug_browser: "server", debug_os: "server", debug_device: "server" }
  }

  const ua = navigator.userAgent || ""

  let debug_browser = "unknown"
  let debug_os = "unknown"
  let debug_device = "desktop"

  if (/Instagram/i.test(ua)) debug_browser = "instagram_in_app"
  else if (/FBAN|FBAV|FB_IAB|FB4A|FBIOS/i.test(ua)) debug_browser = "facebook_in_app"
  else if (/wv|Android.*Version\/[\d.]+.*Chrome/i.test(ua)) debug_browser = "android_webview"
  else if (/CriOS|Chrome/i.test(ua) && !/Edg/i.test(ua)) debug_browser = "chrome"
  else if (/Safari/i.test(ua) && !/Chrome|CriOS|Android/i.test(ua)) debug_browser = "safari"
  else if (/Edg/i.test(ua)) debug_browser = "edge"
  else if (/Firefox/i.test(ua)) debug_browser = "firefox"

  if (/iPhone|iPad|iPod/i.test(ua)) debug_os = "ios"
  else if (/Android/i.test(ua)) debug_os = "android"
  else if (/Windows/i.test(ua)) debug_os = "windows"
  else if (/Mac OS X|Macintosh/i.test(ua)) debug_os = "macos"
  else if (/Linux/i.test(ua)) debug_os = "linux"

  if (/Mobi|iPhone|Android/i.test(ua)) debug_device = "mobile"
  if (/iPad|Tablet/i.test(ua)) debug_device = "tablet"

  return { debug_browser, debug_os, debug_device }
}

/**
 * Push de evento enriquecido para o dataLayer (GTM/GA4).
 * NUNCA passar nome, e-mail, telefone ou valores exatos de gasto no `payload`.
 */
export function pushToDataLayer(eventName: string, payload: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return

  window.dataLayer = window.dataLayer || []

  const enrichedPayload = {
    event: eventName,

    site_name: "viagente",
    tool_name: "diagnostico_viagens_b",
    form_name: "diagnostico_viagens_b",
    funnel_path: "diagnostico-b",

    diagnostic_session_id: getOrCreateSessionId(),
    form_attempt_id: getOrCreateFormAttemptId(),

    event_id: generateEventId(eventName),

    page_location: window.location.href,
    page_path: window.location.pathname,
    page_title: document.title,
    timestamp_iso: new Date().toISOString(),

    ...getDebugDeviceInfo(),

    ...payload,
  }

  window.dataLayer.push(enrichedPayload)

  if (window.location.search.includes("debug_tracking=true")) {
    console.log("[Viagente Diagnostico B Tracking]", eventName, enrichedPayload)
  }
}

function getFbpCookie(): string {
  if (typeof document === "undefined") return ""
  return document.cookie.match(/_fbp=([^;]+)/)?.[1] ?? ""
}

/**
 * Gera o valor correto de _fbc a partir do fbclid real de clique do Meta.
 * Só é gerado quando há fbclid real na URL ou cookie _fbc já existente — nunca inventado.
 */
function buildFbc(fbclid: string): string {
  if (!fbclid) return ""
  if (typeof document !== "undefined") {
    const cookieFbc = document.cookie.match(/_fbc=([^;]+)/)?.[1] ?? ""
    if (cookieFbc && cookieFbc.includes(fbclid)) return cookieFbc
  }
  return `fb.1.${Date.now()}.${fbclid}`
}

/** Captura UTMs, fbclid, gclid, referrer, cookies Meta e User Agent na primeira renderização */
export function captureTrackingParams(): TrackingParams {
  if (typeof window === "undefined") {
    return {
      utm_source: "",
      utm_medium: "",
      utm_campaign: "",
      utm_term: "",
      utm_content: "",
      fbclid: "",
      gclid: "",
      referrer: "",
      fbc: "",
      fbp: "",
      client_user_agent: "",
    }
  }

  const params = new URLSearchParams(window.location.search)
  const fbclid = params.get("fbclid") ?? ""
  const fbp = getFbpCookie()
  const fbc = buildFbc(fbclid)

  return {
    utm_source: params.get("utm_source") ?? "",
    utm_medium: params.get("utm_medium") ?? "",
    utm_campaign: params.get("utm_campaign") ?? "",
    utm_term: params.get("utm_term") ?? "",
    utm_content: params.get("utm_content") ?? "",
    fbclid,
    gclid: params.get("gclid") ?? "",
    referrer: document.referrer ?? "",
    fbc,
    fbp,
    client_user_agent: navigator.userAgent ?? "",
  }
}

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[]
  }
}
