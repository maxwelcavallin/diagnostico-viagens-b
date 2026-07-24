import { NextRequest, NextResponse } from "next/server"

interface LeadPayload {
  nome: string
  email: string
  whatsapp: string
  frequencia: string
  gastoAnual: string
  cartoes: string[]
  gastoCartaoMensal: number
  maturidade: string
  // Campos calculados
  temperatura: string
  mql: boolean
  economiaAte: number
  gastoAnualEstimado: number
  // UTMs
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
  // Tracking params
  fbclid?: string
  gclid?: string
  referrer?: string
  fbp?: string
  fbc?: string
  client_user_agent?: string
}

function formatarFrequencia(v: string): string {
  const map: Record<string, string> = {
    "1-2": "1 a 2 vezes por ano",
    "3-5": "3 a 5 vezes por ano",
    "6+": "6 vezes ou mais por ano",
    raramente: "Raramente",
  }
  return map[v] ?? v
}

function formatarGastoAnual(v: string): string {
  const map: Record<string, string> = {
    "ate-10k": "Até R$ 10 mil",
    "10-25k": "R$ 10 a 25 mil",
    "25-50k": "R$ 25 a 50 mil",
    "acima-50k": "Acima de R$ 50 mil",
  }
  return map[v] ?? v
}

function formatarMoeda(v: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v)
}

function formatarMaturidade(v: string): string {
  const map: Record<string, string> = {
    "nunca-estruturei": "Ninguém, nunca estruturei",
    "eu-mesmo": "Eu mesmo, quando dá tempo",
    "curso-pouco": "Fiz curso, aplico pouco",
    "quero-delegar": "Quero delegar de vez",
  }
  return map[v] ?? v
}

/**
 * CRM (Pipe) — fonte comercial real do lead. Se PIPE_WEBHOOK_URL não estiver
 * configurado (ambiente local/dev), apenas loga e considera sucesso simulado
 * para não travar o desenvolvimento; em produção a env var é obrigatória.
 */
async function sendPipe(payload: LeadPayload): Promise<{ simulated: boolean }> {
  const webhookUrl = process.env.PIPE_WEBHOOK_URL

  const body = {
    nome: payload.nome,
    email: payload.email,
    whatsapp: payload.whatsapp,

    frequencia_viagens: formatarFrequencia(payload.frequencia),
    gasto_anual_viagens: formatarGastoAnual(payload.gastoAnual),
    cartoes_credito: payload.cartoes,
    gasto_mensal_cartao: formatarMoeda(payload.gastoCartaoMensal),
    maturidade_milhas: formatarMaturidade(payload.maturidade),

    temperatura_lead: payload.temperatura,
    mql: payload.mql,

    economia_ate: payload.economiaAte,
    gasto_anual_estimado: payload.gastoAnualEstimado,

    data_lead: new Date().toISOString(),
    origem: "diagnostico-viagens-b",

    utm_source: payload.utm_source ?? "",
    utm_medium: payload.utm_medium ?? "",
    utm_campaign: payload.utm_campaign ?? "",
    utm_term: payload.utm_term ?? "",
    utm_content: payload.utm_content ?? "",

    fbclid: payload.fbclid ?? "",
    gclid: payload.gclid ?? "",
    referrer: payload.referrer ?? "",
    fbp: payload.fbp ?? "",
    fbc: payload.fbc ?? "",
    client_user_agent: payload.client_user_agent ?? "",
  }

  if (!webhookUrl) {
    console.warn("[lead/api] PIPE_WEBHOOK_URL não configurado — lead não enviado ao CRM:", body)
    return { simulated: true }
  }

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    throw new Error(`Pipe webhook retornou ${res.status}`)
  }

  return { simulated: false }
}

export async function POST(req: NextRequest) {
  try {
    const payload: LeadPayload = await req.json()

    if (!payload.email || !payload.nome || !payload.whatsapp) {
      return NextResponse.json({ ok: false, error: "Dados incompletos" }, { status: 400 })
    }

    const results = await Promise.allSettled([sendPipe(payload)])
    const pipeResult = results[0]

    if (pipeResult.status === "rejected") {
      console.error("[lead/api] Pipe error:", pipeResult.reason)
      // Pipe/CRM é a fonte comercial real do lead — se falhar, o lead NÃO é
      // considerado criado. generate_lead nunca deve disparar neste caso.
      return NextResponse.json({ ok: false, error: "crm_create_failed" }, { status: 502 })
    }

    return NextResponse.json({ ok: true, simulated: pipeResult.value.simulated })
  } catch (err) {
    console.error("[lead/api] Unexpected error:", err)
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 })
  }
}
