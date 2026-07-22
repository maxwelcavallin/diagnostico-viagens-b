"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { formatCurrency, type DiagnosticoResult } from "@/lib/diagnostico"
import { pushToDataLayer } from "@/lib/tracking"

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
const YCBM_DOMAIN = process.env.NEXT_PUBLIC_YCBM_DOMAIN

export default function ResultadoClient() {
  const router = useRouter()
  const [resultado, setResultado] = useState<DiagnosticoResult | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const raw = sessionStorage.getItem("diagnostico_b_resultado")
    if (!raw) {
      router.replace("/")
      return
    }
    try {
      const parsed: DiagnosticoResult = JSON.parse(raw)
      setResultado(parsed)
      pushToDataLayer("diagnostico_b_result_view", {
        action_name: "result_view",
        temperatura_lead: parsed.temperatura,
        mql: parsed.mql,
      })
    } catch {
      router.replace("/")
      return
    }
    setLoaded(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!loaded || !resultado) return null

  const primeiroNome = resultado.nome.trim().split(" ")[0] || resultado.nome

  const whatsappMessage = encodeURIComponent(
    `Olá! Sou ${resultado.nome} e acabei de fazer o diagnóstico de viagens da Viagente. Minha estimativa foi entre ${formatCurrency(
      resultado.economiaMin
    )} e ${formatCurrency(resultado.economiaMax)} de economia por ano. Quero agendar minha devolutiva de 15 minutos.`
  )
  const whatsappHref = WHATSAPP_NUMBER
    ? `https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMessage}`
    : undefined

  return (
    <main
      className="relative min-h-screen flex flex-col items-center px-6 py-20 overflow-hidden"
      style={{ background: "var(--bg)", color: "var(--text)" }}
    >
      <div className="aurora-blob aurora-blob-gold" aria-hidden="true" />
      <div className="dot-grid" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-xl flex flex-col items-center text-center">
        <Image src="/logo-viagente.svg" alt="Viagente" width={130} height={26} className="h-6 w-auto mb-10" priority />

        <span className="text-xs uppercase font-medium mb-4" style={{ letterSpacing: "3px", color: "var(--gold-solid)" }}>
          Sua estimativa inicial
        </span>

        <h1 className="font-light leading-snug mb-8" style={{ fontSize: "clamp(24px, 4vw, 34px)", letterSpacing: "0.6px" }}>
          {primeiroNome}, suas viagens podem estar custando a mais.
        </h1>

        <div className="card-featured card w-full mb-10">
          <p className="text-xs uppercase font-medium mb-4" style={{ letterSpacing: "2px", color: "var(--text-muted)" }}>
            Potencial de economia por ano
          </p>
          <p
            className="text-gold-gradient font-bold leading-none mb-2"
            style={{ fontSize: "clamp(40px, 9vw, 72px)" }}
          >
            {formatCurrency(resultado.economiaMin)} a {formatCurrency(resultado.economiaMax)}
          </p>
          <div className="divisor-dourado mx-auto" />
          <p className="text-sm font-light leading-relaxed mt-4" style={{ color: "var(--text-70)" }}>
            Estimativa com base nas suas respostas. O número exato depende de 3 informações que este formulário não
            captura: seus cartões, seus saldos e suas próximas viagens.
          </p>
        </div>

        <h2 className="text-lg font-normal mb-2">Agende a devolutiva e receba a análise completa.</h2>
        <p className="text-sm font-light mb-8" style={{ color: "var(--text-70)" }}>
          15 minutos com um estrategista, no WhatsApp ou em vídeo. Você escolhe o horário abaixo.
        </p>

        {whatsappHref && (
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="btn-primary mb-6">
            {resultado.ctaLabel}
          </a>
        )}

        {YCBM_DOMAIN && (
          <div className="w-full" style={{ minHeight: 500 }}>
            <iframe
              src={`https://${YCBM_DOMAIN}`}
              title="Agendar devolutiva"
              className="w-full"
              style={{ minHeight: 500, border: "none" }}
              loading="lazy"
            />
          </div>
        )}
      </div>
    </main>
  )
}
