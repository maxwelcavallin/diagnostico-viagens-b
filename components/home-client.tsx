"use client"

import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import Image from "next/image"
import { pushToDataLayer } from "@/lib/tracking"
import { testimonials } from "@/lib/testimonials-data"

/** Contador animado ao entrar na tela — replicado do app Viagente (12,8%) */
function useCountUp(target: number, duration = 1200, decimals = 0) {
  const [value, setValue] = useState(0)
  const ref = useRef<HTMLDivElement | null>(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true
          let start: number | null = null
          const step = (timestamp: number) => {
            if (!start) start = timestamp
            const elapsed = timestamp - start
            const t = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - t, 3)
            setValue(parseFloat((eased * target).toFixed(decimals)))
            if (t < 1) requestAnimationFrame(step)
            else setValue(target)
          }
          requestAnimationFrame(step)
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [target, duration, decimals])

  return { value, ref }
}

/** Pulso de glow roxo ao entrar na seção na tela — replicado do app Viagente */
function useSectionGlow() {
  const ref = useRef<HTMLElement | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          el.classList.add("glow-active")
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return ref
}

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

/**
 * Seção "12,8%" — réplica exata (copy, efeitos, gradientes) da StatsSection
 * do app Viagente (v0-landing-page-app-viagente/components/stats-section.tsx).
 */
function PainStatSection() {
  const sectionRef = useSectionGlow()
  const { value, ref: countRef } = useCountUp(12.8, 1400, 1)
  const displayValue = value.toFixed(1).replace(".", ",")

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      className="section-glow-trigger relative overflow-hidden flex flex-col justify-center px-6"
      style={{ background: "#0A0A0C", minHeight: "100svh" }}
      aria-label="Estatística sobre resgate de milhas"
    >
      <div
        aria-hidden="true"
        className="absolute rounded-full pointer-events-none"
        style={{
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: "600px",
          height: "600px",
          border: "1px solid rgba(113,105,221,0.06)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute rounded-full pointer-events-none"
        style={{
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: "900px",
          height: "900px",
          border: "1px solid rgba(113,105,221,0.03)",
        }}
      />

      <div className="relative z-10 max-w-2xl mx-auto text-center">
        <div ref={countRef}>
          <p
            className="font-bold"
            style={{
              fontFamily: "var(--font-space-grotesk), sans-serif",
              fontSize: "clamp(64px, 20vw, 160px)",
              background: "linear-gradient(135deg, #7169DD 0%, #A8A3E8 50%, #E59501 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              margin: 0,
              lineHeight: 1,
              letterSpacing: "-0.04em",
            }}
          >
            {displayValue}%
          </p>
        </div>

        <Reveal delay={100}>
          <p
            className="font-medium mx-auto"
            style={{
              fontSize: "clamp(17px, 2.5vw, 22px)",
              color: "rgba(248,249,252,0.75)",
              lineHeight: 1.6,
              margin: "28px auto 0",
              maxWidth: "520px",
            }}
          >
            dos brasileiros resgatam seus pontos em passagens aéreas.
          </p>
        </Reveal>

        <Reveal delay={200}>
          <p
            className="font-bold mx-auto"
            style={{
              fontFamily: "var(--font-space-grotesk), sans-serif",
              fontSize: "clamp(20px, 3vw, 28px)",
              color: "#F8F9FC",
              margin: "20px auto 0",
              maxWidth: "540px",
              lineHeight: 1.35,
            }}
          >
            Você está resgatando os seus{" "}
            <span
              style={{
                background: "linear-gradient(90deg, #E59501, #986300)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              OU PAGANDO A CONTA?
            </span>
          </p>
        </Reveal>
      </div>

      <hr className="glow-divider" style={{ marginTop: "80px" }} />
    </section>
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

      {/* ---------- PAIN STAT — 12,8% (réplica do app Viagente) ---------- */}
      <PainStatSection />

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

      {/* ---------- VOCÊ CHEGOU ATÉ AQUI ---------- */}
      <section className="relative px-6 py-24 glow-secao">
        <div className="max-w-3xl mx-auto text-center">
          <Reveal>
            <span
              className="text-xs uppercase font-medium"
              style={{ letterSpacing: "3px", color: "var(--gold-solid)" }}
            >
              Viagente
            </span>
          </Reveal>

          <Reveal delay={60}>
            <p className="mt-4 text-sm font-light uppercase" style={{ letterSpacing: "2px", color: "var(--text-muted)" }}>
              Você chegou até aqui
            </p>
          </Reveal>

          <Reveal delay={120}>
            <h2
              className="font-light leading-snug mt-4"
              style={{ fontSize: "clamp(26px, 4.5vw, 40px)", letterSpacing: "0.9px", color: "var(--text)" }}
            >
              Cada viagem sem estratégia
              <br />é dinheiro que não volta.
            </h2>
          </Reveal>

          <Reveal delay={180}>
            <div className="divisor-dourado mx-auto mt-6" />
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-12 max-w-md mx-auto">
            {[
              { valor: "1,4x", label: "multiplicador médio do investimento" },
              { valor: "Risco Zero", label: "garantia contratual" },
            ].map((stat, i) => (
              <Reveal key={stat.valor} delay={220 + i * 100}>
                <div className="card h-full text-center">
                  <p className="text-3xl md:text-4xl font-semibold text-gold-gradient mb-2">{stat.valor}</p>
                  <p className="text-xs font-light" style={{ color: "var(--text-70)" }}>
                    {stat.label}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={560}>
            <p
              className="font-light mt-14"
              style={{ fontSize: "clamp(20px, 3vw, 26px)", color: "var(--text)", letterSpacing: "0.4px" }}
            >
              A próxima viagem pode custar muito menos.
            </p>
          </Reveal>

          <Reveal delay={620}>
            <p className="text-sm font-light mt-4" style={{ color: "var(--text-muted)" }}>
              O diagnóstico é o primeiro passo. Gratuito. Sem compromisso.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---------- DEPOIMENTOS ---------- */}
      <section className="relative px-6 py-24">
        <div className="max-w-4xl mx-auto">
          <Reveal className="text-center mb-14">
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="text-xs uppercase font-medium" style={{ letterSpacing: "3px", color: "var(--gold-solid)" }}>
                Avaliações reais · Google
              </span>
              <span
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1"
                style={{
                  borderRadius: "100px",
                  background: "rgba(229,149,1,0.08)",
                  border: "1px solid rgba(229,149,1,0.2)",
                  color: "var(--text)",
                }}
              >
                <span style={{ color: "var(--gold-mid)" }}>★</span> 5,0
              </span>
            </div>
            <h2 className="font-light" style={{ fontSize: "clamp(26px, 4vw, 36px)", letterSpacing: "0.9px" }}>
              O que nossos clientes <span className="text-gold-gradient font-normal">falam.</span>
            </h2>
            <div className="divisor-dourado mx-auto mt-4" />
          </Reveal>

          <div className="grid sm:grid-cols-3 gap-4">
            {testimonials.map((t, i) => {
              const soft = t.borderVariant === "gold-soft"
              return (
                <Reveal key={t.nome} delay={i * 100}>
                  <div
                    className="card h-full"
                    style={{
                      padding: "16px",
                      borderTopWidth: "2px",
                      borderTopColor: soft ? "rgba(212,165,55,0.5)" : "var(--gold-mid)",
                      borderColor: soft ? "rgba(212,165,55,0.2)" : undefined,
                    }}
                  >
                    <div
                      className="relative w-full mb-3 overflow-hidden"
                      style={{ aspectRatio: "1 / 1", borderRadius: "8px" }}
                    >
                      <Image src={t.foto} alt={t.nome} fill sizes="(max-width: 640px) 100vw, 260px" className="object-cover" />
                    </div>
                    <div className="mb-2" style={{ color: "var(--gold-solid)", fontSize: "14px", letterSpacing: "1px" }} aria-hidden="true">
                      ★★★★★
                    </div>
                    <p className="text-xs font-light leading-relaxed mb-3" style={{ color: "var(--text-70)" }}>
                      &ldquo;{t.texto}&rdquo;
                    </p>
                    <div
                      className="flex items-center gap-2.5 pt-2.5"
                      style={{ borderTop: `1px solid ${soft ? "rgba(212,165,55,0.15)" : "var(--border)"}` }}
                    >
                      <span
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                        style={{
                          background: soft ? "rgba(212,165,55,0.1)" : "rgba(42,42,42,1)",
                          border: `1px solid ${soft ? "rgba(212,165,55,0.2)" : "var(--border)"}`,
                          color: "var(--gold-solid)",
                        }}
                      >
                        {t.nome.charAt(0)}
                      </span>
                      <div className="text-xs font-light">
                        <p style={{ color: "var(--text)", fontWeight: 600 }}>{t.nome}</p>
                        <p style={{ color: "var(--text-muted)", fontSize: "9px" }}>{t.fonte}</p>
                      </div>
                    </div>
                  </div>
                </Reveal>
              )
            })}
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
