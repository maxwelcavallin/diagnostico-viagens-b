export type Frequencia = "1-2" | "3-5" | "6+" | "raramente"
export type GastoAnual = "ate-10k" | "10-25k" | "25-50k" | "acima-50k"
export type GastoCartao = "ate-5k" | "5-15k" | "15-30k" | "acima-30k"
export type Maturidade = "nunca-estruturei" | "eu-mesmo" | "curso-pouco" | "quero-delegar"

export interface DiagnosticoFormData {
  frequencia: Frequencia
  gastoAnual: GastoAnual
  gastoCartao: GastoCartao
  maturidade: Maturidade
  nome: string
  whatsapp: string
  email: string
}

export type Temperatura = "quente" | "morno" | "frio"

export interface DiagnosticoResult {
  nome: string
  temperatura: Temperatura
  mql: boolean
  economiaMin: number
  economiaMax: number
  gastoAnualEstimado: number
  ctaLabel: string
  ctaTom: "direto" | "consultivo"
}

// Ponto médio de cada faixa declarada de gasto anual com viagens — usado só como
// base de cálculo da estimativa, nunca exibido como valor exato "declarado" pelo lead.
const GASTO_ANUAL_ESTIMADO: Record<GastoAnual, number> = {
  "ate-10k": 7000,
  "10-25k": 17500,
  "25-50k": 37500,
  "acima-50k": 65000,
}

const FAIXA_ECONOMIA: Record<Temperatura, { min: number; max: number }> = {
  quente: { min: 0.25, max: 0.4 },
  morno: { min: 0.15, max: 0.25 },
  frio: { min: 0.05, max: 0.1 },
}

function freqAlta(frequencia: Frequencia): boolean {
  return frequencia === "3-5" || frequencia === "6+"
}

function classificarTemperatura(data: DiagnosticoFormData): Temperatura {
  const cartaoAlto = data.gastoCartao === "acima-30k"
  const cartaoMedio = data.gastoCartao === "15-30k"
  const frequenciaAlta = freqAlta(data.frequencia)

  if (cartaoAlto && frequenciaAlta) return "quente"
  if (cartaoMedio || frequenciaAlta) return "morno"
  return "frio"
}

function classificarMql(data: DiagnosticoFormData): boolean {
  const cartao15Mais = data.gastoCartao === "15-30k" || data.gastoCartao === "acima-30k"
  const perfilDelegador =
    data.maturidade === "nunca-estruturei" || data.maturidade === "quero-delegar"
  return cartao15Mais || (freqAlta(data.frequencia) && perfilDelegador)
}

export function calcularDiagnostico(data: DiagnosticoFormData): DiagnosticoResult {
  const temperatura = classificarTemperatura(data)
  const mql = classificarMql(data)
  const gastoAnualEstimado = GASTO_ANUAL_ESTIMADO[data.gastoAnual]
  const faixa = FAIXA_ECONOMIA[temperatura]

  const economiaMin = Math.round((gastoAnualEstimado * faixa.min) / 50) * 50
  const economiaMax = Math.round((gastoAnualEstimado * faixa.max) / 50) * 50

  const leadPronto = temperatura === "quente" || mql

  return {
    nome: data.nome,
    temperatura,
    mql,
    economiaMin,
    economiaMax,
    gastoAnualEstimado,
    ctaLabel: leadPronto ? "Escolher meu horário agora" : "Agendar minha devolutiva",
    ctaTom: leadPronto ? "direto" : "consultivo",
  }
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value)
}

// Buckets padronizados para tracking — nunca o valor bruto declarado no dataLayer.
export const frequenciaBucketMap: Record<Frequencia, string> = {
  "1-2": "1_2_year",
  "3-5": "3_5_year",
  "6+": "6_plus_year",
  raramente: "rarely",
}

export const gastoAnualBucketMap: Record<GastoAnual, string> = {
  "ate-10k": "up_to_10k",
  "10-25k": "10k_25k",
  "25-50k": "25k_50k",
  "acima-50k": "above_50k",
}

export const gastoCartaoBucketMap: Record<GastoCartao, string> = {
  "ate-5k": "up_to_5k",
  "5-15k": "5k_15k",
  "15-30k": "15k_30k",
  "acima-30k": "above_30k",
}

export const maturidadeBucketMap: Record<Maturidade, string> = {
  "nunca-estruturei": "never_structured",
  "eu-mesmo": "self_managed",
  "curso-pouco": "trained_low_usage",
  "quero-delegar": "wants_to_delegate",
}
