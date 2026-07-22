import { createHash } from "crypto"

export const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? ""
const TEST_EVENT_CODE = process.env.META_TEST_EVENT_CODE ?? ""

/** Hash SHA-256 para dados pessoais enviados via Conversions API */
export function hashData(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex")
}

export interface MetaEventPayload {
  eventName: string
  eventId?: string
  eventTime?: number
  email?: string
  phone?: string
  firstName?: string
  customData?: Record<string, unknown>
  eventSourceUrl?: string
  clientUserAgent?: string
  clientIpAddress?: string
  fbc?: string
  fbp?: string
}

/** Envia evento para a Meta Conversions API via fetch server-side */
export async function sendMetaEvent(payload: MetaEventPayload): Promise<void> {
  const token = process.env.META_ACCESS_TOKEN
  if (!token || !PIXEL_ID) {
    console.error("[meta] META_ACCESS_TOKEN ou NEXT_PUBLIC_META_PIXEL_ID não configurados")
    return
  }

  const userData: Record<string, string> = {}
  if (payload.email) userData.em = hashData(payload.email)
  if (payload.phone) userData.ph = hashData(payload.phone.replace(/\D/g, ""))
  if (payload.firstName) userData.fn = hashData(payload.firstName.toLowerCase())
  if (payload.fbc) userData.fbc = payload.fbc
  if (payload.fbp) userData.fbp = payload.fbp
  if (payload.clientUserAgent) userData.client_user_agent = payload.clientUserAgent
  if (payload.clientIpAddress) userData.client_ip_address = payload.clientIpAddress

  const eventData: Record<string, unknown> = {
    event_name: payload.eventName,
    event_time: payload.eventTime ?? Math.floor(Date.now() / 1000),
    action_source: "website",
    user_data: userData,
  }

  if (payload.eventId) eventData.event_id = payload.eventId
  if (payload.eventSourceUrl) eventData.event_source_url = payload.eventSourceUrl
  if (payload.customData) eventData.custom_data = payload.customData

  const body: Record<string, unknown> = { data: [eventData] }
  if (TEST_EVENT_CODE) body.test_event_code = TEST_EVENT_CODE

  const res = await fetch(`https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error("[meta] Conversions API error:", text)
  }
}
