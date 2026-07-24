"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { formatCurrency, type DiagnosticoResult } from "@/lib/diagnostico"
import { pushToDataLayer } from "@/lib/tracking"

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "5518998041073"
const YCBM_DOMAIN = process.env.NEXT_PUBLIC_YCBM_DOMAIN
const MURILO_LINKEDIN = "https://www.linkedin.com/in/murilosouza-s/"

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
    `Olá! Sou ${resultado.nome} e acabei de fazer o diagnóstico de viagens da Viagente. Minha estimativa foi de até ${formatCurrency(
      resultado.economiaAte
    )} de economia por ano. Quero agendar minha devolutiva de 15 minutos.`
  )
  const whatsappHref = WHATSAPP_NUMBER
    ? `https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMessage}`
    : undefined
  const whatsappDisplayNumber = WHATSAPP_NUMBER
    ? WHATSAPP_NUMBER.replace(/^55/, "").replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
    : "[XXXXX]"

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
            Até {formatCurrency(resultado.economiaAte)}
          </p>
          <div className="divisor-dourado mx-auto" />
          <p className="text-sm font-light leading-relaxed mt-4" style={{ color: "var(--text-70)" }}>
            Estimativa com base nas suas respostas, sempre arredondada pra cima. O valor exato da sua economia vem no
            diagnóstico completo, que a gente entrega pra você no WhatsApp.
          </p>
        </div>

        {/* Aviso de contato — Murilo Souza, sócio da Viagente */}
        <div className="card-featured card w-full mb-10 text-left">
          <h2 className="text-base font-normal mb-4" style={{ color: "var(--text)" }}>
            Fica de olho no seu WhatsApp.
          </h2>

          <div className="flex items-center gap-4 mb-4">
            <div
              className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0"
              style={{ border: "2px solid var(--gold-mid)" }}
            >
              <Image src="/murilo-souza.jpg" alt="Murilo Souza" fill sizes="64px" className="object-cover" />
            </div>
            <div>
              <p className="text-base font-normal" style={{ color: "var(--text)" }}>
                Murilo Souza
              </p>
              <p className="text-xs font-light" style={{ color: "var(--text-muted)" }}>
                Sócio da Viagente
              </p>
            </div>
          </div>

          <p className="text-sm font-light leading-relaxed mb-3" style={{ color: "var(--text-70)" }}>
            Murilo Souza, sócio da Viagente, vai entrar em contato com você através do WhatsApp pelo nosso número{" "}
            <strong style={{ color: "var(--text)" }}>{whatsappDisplayNumber}</strong>, para te entregar o
            diagnóstico completo, com o valor exato da sua economia.
          </p>
          <p
            className="text-gold-gradient font-semibold text-center py-2 mb-2"
            style={{ fontSize: "clamp(18px, 3vw, 22px)", letterSpacing: "0.02em" }}
          >
            {whatsappDisplayNumber}
          </p>

          <a
            href={MURILO_LINKEDIN}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 text-sm font-light py-3"
            style={{ border: "1px solid rgba(255,255,255,0.2)", color: "var(--text-70)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.15 1.45-2.15 2.94v5.67H9.35V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z" />
            </svg>
            Ver o perfil do Murilo no LinkedIn
          </a>
        </div>

        <h2 className="text-lg font-normal mb-2">Quer adiantar a conversa?</h2>
        <p className="text-sm font-light mb-8" style={{ color: "var(--text-70)" }}>
          Se preferir, escolha você mesmo o horário da devolutiva de 15 minutos, no WhatsApp ou em vídeo. Sem
          compromisso.
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
