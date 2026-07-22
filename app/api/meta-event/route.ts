import { NextRequest, NextResponse } from "next/server"
import { sendMetaEvent, MetaEventPayload } from "@/lib/meta"

export async function POST(req: NextRequest) {
  try {
    const body: MetaEventPayload & { email?: string; phone?: string; firstName?: string } =
      await req.json()

    const userAgent = body.clientUserAgent ?? req.headers.get("user-agent") ?? undefined
    const referer = req.headers.get("referer") ?? undefined

    const clientIpAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      undefined

    const cookieHeader = req.headers.get("cookie") ?? ""
    const fbc = body.fbc ?? cookieHeader.match(/_fbc=([^;]+)/)?.[1]
    const fbp = body.fbp ?? cookieHeader.match(/_fbp=([^;]+)/)?.[1]

    await sendMetaEvent({
      ...body,
      clientUserAgent: userAgent,
      clientIpAddress,
      eventSourceUrl: referer,
      fbc,
      fbp,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[meta-event/api] error:", err)
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 })
  }
}
