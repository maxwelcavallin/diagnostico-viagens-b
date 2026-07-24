export type Frequencia = "1-2" | "3-5" | "6+" | "raramente"
export type GastoAnual = "ate-10k" | "10-25k" | "25-50k" | "acima-50k"
export type Maturidade = "nunca-estruturei" | "eu-mesmo" | "curso-pouco" | "quero-delegar"

export interface DiagnosticoFormData {
  frequencia: Frequencia
  gastoAnual: GastoAnual
  cartoes: string[]
  gastoCartaoMensal: number
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
  economiaAte: number
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

// Gasto no cartão a partir do qual o lead vira MQL / entra na faixa "quente" —
// mesmos limiares de R$ 15 mil e R$ 30 mil que existiam nos buckets do formulário.
const GASTO_CARTAO_ALTO = 30000
const GASTO_CARTAO_MEDIO = 15000

function freqAlta(frequencia: Frequencia): boolean {
  return frequencia === "3-5" || frequencia === "6+"
}

function classificarTemperatura(data: DiagnosticoFormData): Temperatura {
  const cartaoAlto = data.gastoCartaoMensal >= GASTO_CARTAO_ALTO
  const cartaoMedio = data.gastoCartaoMensal >= GASTO_CARTAO_MEDIO && data.gastoCartaoMensal < GASTO_CARTAO_ALTO
  const frequenciaAlta = freqAlta(data.frequencia)

  if (cartaoAlto && frequenciaAlta) return "quente"
  if (cartaoMedio || frequenciaAlta) return "morno"
  return "frio"
}

function classificarMql(data: DiagnosticoFormData): boolean {
  const cartao15Mais = data.gastoCartaoMensal >= GASTO_CARTAO_MEDIO
  const perfilDelegador =
    data.maturidade === "nunca-estruturei" || data.maturidade === "quero-delegar"
  return cartao15Mais || (freqAlta(data.frequencia) && perfilDelegador)
}

/** Arredonda sempre pra cima — a estimativa exibida como "ATÉ" nunca fica abaixo do valor calculado. */
function arredondarParaCima(valor: number, passo = 100): number {
  return Math.ceil(valor / passo) * passo
}

export function calcularDiagnostico(data: DiagnosticoFormData): DiagnosticoResult {
  const temperatura = classificarTemperatura(data)
  const mql = classificarMql(data)
  const gastoAnualEstimado = GASTO_ANUAL_ESTIMADO[data.gastoAnual]
  const faixa = FAIXA_ECONOMIA[temperatura]

  const economiaAte = arredondarParaCima(gastoAnualEstimado * faixa.max)

  const leadPronto = temperatura === "quente" || mql

  return {
    nome: data.nome,
    temperatura,
    mql,
    economiaAte,
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

export const maturidadeBucketMap: Record<Maturidade, string> = {
  "nunca-estruturei": "never_structured",
  "eu-mesmo": "self_managed",
  "curso-pouco": "trained_low_usage",
  "quero-delegar": "wants_to_delegate",
}

/** Bucket de gasto mensal no cartão — nunca o valor exato declarado no dataLayer. */
export function gastoCartaoBucket(valor: number): string {
  if (valor <= 0) return "none"
  if (valor < 5000) return "up_to_5k"
  if (valor < 15000) return "5k_15k"
  if (valor < 30000) return "15k_30k"
  return "above_30k"
}

/** Bucket de quantidade de cartões selecionados — nunca os nomes reais no dataLayer. */
export function cartoesCountBucket(count: number): string {
  if (count <= 0) return "0"
  if (count === 1) return "1"
  if (count <= 3) return "2_3"
  return "4_plus"
}
