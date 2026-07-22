"use client"

import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import Image from "next/image"
import { pushToDataLayer } from "@/lib/tracking"
import { testimonials } from "@/lib/testimonials-data"

const DiagnosticoQuiz = dynamic(() => import("@/components/diagnostico-quiz"), {
  ssr: false,
  loading: () => null,
})

function useReveal() {
  const ref = useRef<HTMLElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { ref, visible }
}

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const { ref, visible } = useReveal()
  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`reveal ${visible ? "visible" : ""} ${className}`}
      style={{ ["--delay" as string]: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

export default function HomeClient() {
  const [quizOpen, setQuizOpen] = useState(false)

  useEffect(() => {
    pushToDataLayer("diagnostico_b_lp_view", { action_name: "lp_view" })

    const onScroll = () => {}
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const openQuiz = (position: "hero" | "final") => {
    pushToDataLayer("diagnostico_b_cta_click", { action_name: "cta_click", cta_position: position })
    setQuizOpen(true)
  }

  return (
    <main style={{ background: "var(--bg)", color: "var(--text)" }}>
      {/* ---------- HERO ---------- */}
      <section className="relative overflow-hidden px-6 pt-28 pb-24 md:pt-36 md:pb-32">
        <div className="dot-grid" aria-hidden="true" />
        <div className="aurora-blob aurora-blob-gold" aria-hidden="true" />
        <div className="aurora-blob aurora-blob-purple" style={{ bottom: "-100px", right: "-100px" }} aria-hidden="true" />

        <div className="relative z-10 max-w-3xl mx-auto text-center flex flex-col items-center">
          <Image src="/logo-viagente.svg" alt="Viagente" width={140} height={28} className="h-6 w-auto mb-10" priority />

          <Reveal>
            <h1
              className="font-light leading-tight"
              style={{ fontSize: "clamp(32px, 5.5vw, 56px)", letterSpacing: "0.9px", color: "var(--text)" }}
            >
              Descubra quanto as suas viagens estão custando{" "}
              <span className="text-gold-gradient font-normal">a mais</span>.
            </h1>
          </Reveal>

          <Reveal delay={120}>
            <div className="divisor-dourado mx-auto" />
          </Reveal>

          <Reveal delay={180}>
            <p className="text-base md:text-lg font-light leading-relaxed max-w-xl" style={{ color: "var(--text-70)" }}>
              E receba a análise de um estrategista, não de um robô. Você responde em 3 minutos e sai daqui com uma
              estimativa. A análise completa é apresentada por uma pessoa do nosso time, numa devolutiva de 15
              minutos.
            </p>
          </Reveal>

          <Reveal delay={280} className="mt-10">
            <button onClick={() => openQuiz("hero")} className="btn-primary">
              Começar meu diagnóstico
            </button>
          </Reveal>
        </div>
      </section>

      {/* ---------- COMO FUNCIONA ---------- */}
      <section className="relative px-6 py-24 glow-secao">
        <div className="max-w-4xl mx-auto">
          <Reveal className="text-center mb-16">
            <span
              className="text-xs uppercase font-medium"
              style={{ letterSpacing: "3px", color: "var(--gold-solid)" }}
            >
              Como funciona
            </span>
            <div className="divisor-dourado mx-auto mt-4" />
          </Reveal>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                n: "01",
                title: "Você responde",
                desc: "Você responde 5 perguntas sobre suas viagens e seus gastos. Leva 3 minutos.",
              },
              {
                n: "02",
                title: "Cruzamos os dados",
                desc: "Nosso sistema cruza seus dados com tarifas e programas reais e gera sua estimativa na hora.",
              },
              {
                n: "03",
                title: "Você fala com um estrategista",
                desc: "Um estrategista da Viagente apresenta a análise completa numa devolutiva de 15 minutos, no WhatsApp ou em vídeo. Você escolhe o horário no final.",
              },
            ].map((item, i) => (
              <Reveal key={item.n} delay={i * 120}>
                <div className="card h-full">
                  <span className="text-gold-gradient text-3xl font-semibold">{item.n}</span>
                  <h3 className="mt-4 mb-2 text-lg font-normal" style={{ color: "var(--text)" }}>
                    {item.title}
                  </h3>
                  <p className="text-sm font-light leading-relaxed" style={{ color: "var(--text-70)" }}>
                    {item.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- PROVA / CONFIANÇA ---------- */}
      <section className="relative px-6 py-24">
        <div className="max-w-4xl mx-auto">
          <Reveal className="text-center mb-16">
            <h2 className="font-light" style={{ fontSize: "clamp(26px, 4vw, 36px)", letterSpacing: "0.9px" }}>
              Resultado real, não promessa genérica
            </h2>
            <div className="divisor-dourado mx-auto mt-4" />
          </Reveal>

          <Reveal>
            <div className="card-featured card text-center mb-8">
              <p className="text-4xl md:text-5xl font-semibold text-gold-gradient mb-3">R$ 76 mil</p>
              <p className="text-sm font-light" style={{ color: "var(--text-70)" }}>
                em economia registrada no portal dos clientes da gestão, em 61 emissões.
              </p>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="card mb-8">
              <span className="text-xs uppercase font-medium" style={{ letterSpacing: "2px", color: "var(--gold-solid)" }}>
                Caso real
              </span>
              <h3 className="mt-3 mb-2 text-lg font-normal">Executiva com destino a Buenos Aires</h3>
              <p className="text-sm font-light leading-relaxed" style={{ color: "var(--text-70)" }}>
                R$ 5.700 por pessoa na companhia aérea. Com a estratégia Viagente, R$ 420 mais taxas. E a cliente não
                tinha milhas.
              </p>
            </div>
          </Reveal>

          {/* TODO: case Felipe (Hard Rock) — pendente de números finais, adicionar quando o time confirmar */}

          <div className="grid md:grid-cols-2 gap-6">
            <Reveal delay={150}>
              <div className="card h-full">
                <h3 className="mb-3 text-base font-normal">Segurança dos seus dados</h3>
                <p className="text-sm font-light leading-relaxed" style={{ color: "var(--text-70)" }}>
                  Nunca pedimos senha de banco ou de cartão. Emissões com milhas só acontecem com você na tela,
                  compartilhando o próprio computador, e todo resgate exige o reconhecimento facial do titular na
                  companhia aérea. Contrato formal, nota fiscal e tudo registrado no portal do cliente.
                </p>
              </div>
            </Reveal>
            <Reveal delay={220}>
              <div className="card h-full">
                <h3 className="mb-3 text-base font-normal">Garantia de 12 meses</h3>
                <p className="text-sm font-light leading-relaxed" style={{ color: "var(--text-70)" }}>
                  Se em 12 meses a economia gerada não superar o valor investido na gestão, prorrogamos o contrato por
                  mais um ano, sem nenhum custo.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- DEPOIMENTOS ---------- */}
      <section className="relative px-6 py-24 glow-secao">
        <div className="max-w-3xl mx-auto">
          <Reveal className="text-center mb-14">
            <span className="text-xs uppercase font-medium" style={{ letterSpacing: "3px", color: "var(--gold-solid)" }}>
              Depoimentos
            </span>
            <div className="divisor-dourado mx-auto mt-4" />
          </Reveal>

          <div className="grid gap-6">
            {testimonials.map((t, i) => (
              <Reveal key={i} delay={i * 100}>
                <div className="card">
                  <div className="flex items-center gap-1 mb-4" aria-hidden="true">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <svg key={idx} width="14" height="14" viewBox="0 0 20 20" fill="var(--gold-solid)">
                        <path d="M10 1l2.6 5.9 6.4.6-4.8 4.3 1.4 6.2L10 15l-5.6 3 1.4-6.2L1 7.5l6.4-.6L10 1z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-sm font-light leading-relaxed mb-5" style={{ color: "var(--text-70)" }}>
                    &ldquo;{t.texto}&rdquo;
                  </p>
                  <div className="flex items-center gap-3">
                    <span
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                      style={{
                        background: "rgba(184,134,42,0.2)",
                        border: "1px solid rgba(184,134,42,0.4)",
                        color: "var(--gold-solid)",
                      }}
                    >
                      {t.nome.charAt(0)}
                    </span>
                    <div className="text-xs font-light">
                      <p style={{ color: "var(--text)" }}>{t.nome}</p>
                      <p style={{ color: "var(--text-muted)" }}>{t.profissao}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- QUEM ATENDE ---------- */}
      <section className="relative px-6 py-24">
        <div className="max-w-3xl mx-auto">
          <Reveal className="text-center mb-14">
            <span className="text-xs uppercase font-medium" style={{ letterSpacing: "3px", color: "var(--gold-solid)" }}>
              Quem atende
            </span>
            <div className="divisor-dourado mx-auto mt-4" />
          </Reveal>

          <div className="grid md:grid-cols-2 gap-6">
            <Reveal>
              <div className="card h-full">
                <h3 className="text-lg font-normal mb-1">Murillo Souza</h3>
                <p className="text-sm font-light" style={{ color: "var(--text-70)" }}>
                  Agente de viagens desde 2019, fundador da Viagente.
                </p>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div className="card h-full">
                <h3 className="text-lg font-normal mb-1">Max</h3>
                <p className="text-sm font-light" style={{ color: "var(--text-70)" }}>
                  Sócio e estrategista, conduz as análises.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- CTA FINAL ---------- */}
      <section className="relative px-6 py-24 text-center overflow-hidden">
        <div className="aurora-blob aurora-blob-gold-secondary" style={{ top: "-60px", left: "50%", transform: "translateX(-50%)" }} aria-hidden="true" />
        <div className="relative z-10 max-w-xl mx-auto">
          <Reveal>
            <h2 className="font-light mb-4" style={{ fontSize: "clamp(26px, 4vw, 36px)", letterSpacing: "0.9px" }}>
              Descubra sua <span className="text-gold-gradient font-normal">estimativa</span> agora
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p className="text-sm font-light mb-8" style={{ color: "var(--text-70)" }}>
              Leva 3 minutos. Sem compromisso.
            </p>
          </Reveal>
          <Reveal delay={180}>
            <button onClick={() => openQuiz("final")} className="btn-primary">
              Começar meu diagnóstico
            </button>
          </Reveal>
        </div>
      </section>

      {/* ---------- FOOTER ---------- */}
      <footer className="px-6 py-10 text-center" style={{ borderTop: "1px solid var(--border)" }}>
        <p className="text-xs font-light" style={{ color: "var(--text-muted)" }}>
          Viagente. Agência e gestão de viagens.
        </p>
        <p className="text-xs font-light mt-1" style={{ color: "var(--text-muted)" }}>
          viagente.com.br
        </p>
      </footer>

      <DiagnosticoQuiz open={quizOpen} onClose={() => setQuizOpen(false)} />
    </main>
  )
}
