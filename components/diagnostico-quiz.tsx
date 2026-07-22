"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { trackPixelEvent } from "@/components/MetaPixel"
import {
  generateEventId,
  captureTrackingParams,
  pushToDataLayer,
  getOrCreateLeadEventId,
  sanitizeErrorMessage,
  getTimeOnFormBucket,
  type TrackingParams,
} from "@/lib/tracking"
import {
  calcularDiagnostico,
  frequenciaBucketMap,
  gastoAnualBucketMap,
  gastoCartaoBucketMap,
  maturidadeBucketMap,
  type DiagnosticoFormData,
} from "@/lib/diagnostico"

interface ValidationError {
  field_name: string
  error_type: string
  error_message: string
}

interface DiagnosticoQuizProps {
  open: boolean
  onClose: () => void
}

const TOTAL_STEPS = 5

const loadingMessages = [
  "Analisando suas respostas...",
  "Cruzando com tarifas e programas reais...",
  "Calculando sua faixa de economia...",
  "Preparando sua estimativa...",
]

const frequenciaOptions = [
  { value: "1-2", label: "1 a 2 vezes" },
  { value: "3-5", label: "3 a 5 vezes" },
  { value: "6+", label: "6 vezes ou mais" },
  { value: "raramente", label: "Raramente" },
]

const gastoAnualOptions = [
  { value: "ate-10k", label: "Até R$ 10 mil" },
  { value: "10-25k", label: "R$ 10 a 25 mil" },
  { value: "25-50k", label: "R$ 25 a 50 mil" },
  { value: "acima-50k", label: "Acima de R$ 50 mil" },
]

const gastoCartaoOptions = [
  { value: "ate-5k", label: "Até R$ 5 mil" },
  { value: "5-15k", label: "R$ 5 a 15 mil" },
  { value: "15-30k", label: "R$ 15 a 30 mil" },
  { value: "acima-30k", label: "Acima de R$ 30 mil" },
]

const maturidadeOptions = [
  { value: "nunca-estruturei", label: "Ninguém, nunca estruturei" },
  { value: "eu-mesmo", label: "Eu mesmo, quando dá tempo" },
  { value: "curso-pouco", label: "Fiz curso, aplico pouco" },
  { value: "quero-delegar", label: "Quero delegar de vez" },
]

const stepSlugMap: Record<number, string> = {
  1: "frequencia_viagens",
  2: "gasto_anual_viagens",
  3: "gasto_mensal_cartao",
  4: "maturidade_milhas",
  5: "dados_contato",
}

function getStepMeta(stepIndex: number) {
  const slug = stepSlugMap[stepIndex] ?? `step_${stepIndex}`
  return { step_index: stepIndex, step_name: slug, step_slug: slug }
}

function formatWhatsappDisplay(digits: string): string {
  const d = digits.slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export default function DiagnosticoQuiz({ open, onClose }: DiagnosticoQuizProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [animating, setAnimating] = useState(false)
  const [formData, setFormData] = useState<DiagnosticoFormData>({
    frequencia: "" as DiagnosticoFormData["frequencia"],
    gastoAnual: "" as DiagnosticoFormData["gastoAnual"],
    gastoCartao: "" as DiagnosticoFormData["gastoCartao"],
    maturidade: "" as DiagnosticoFormData["maturidade"],
    nome: "",
    whatsapp: "",
    email: "",
  })
  const [whatsappDisplay, setWhatsappDisplay] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [showLoading, setShowLoading] = useState(false)
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0)

  const trackingParamsRef = useRef<TrackingParams | null>(null)
  const startedRef = useRef(false)
  const leadCreatedRef = useRef(false)
  const formOpenTimeRef = useRef<number>(0)
  const lastStepRef = useRef(1)

  // iOS Safari: overflow:hidden no body não trava o scroll de verdade — a página
  // desliza a cada abertura/fechamento do teclado. Fixar o body e compensar o scrollY.
  useEffect(() => {
    if (!open) return
    const scrollY = window.scrollY
    const body = document.body
    const prev = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
    }
    body.style.position = "fixed"
    body.style.top = `${-scrollY}px`
    body.style.left = "0"
    body.style.right = "0"
    body.style.width = "100%"
    return () => {
      body.style.position = prev.position
      body.style.top = prev.top
      body.style.left = prev.left
      body.style.right = prev.right
      body.style.width = prev.width
      window.scrollTo(0, scrollY)
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      setStep(1)
      setErrors({})
      setSubmitting(false)
      setShowLoading(false)
      setWhatsappDisplay("")
      setFormData({
        frequencia: "" as DiagnosticoFormData["frequencia"],
        gastoAnual: "" as DiagnosticoFormData["gastoAnual"],
        gastoCartao: "" as DiagnosticoFormData["gastoCartao"],
        maturidade: "" as DiagnosticoFormData["maturidade"],
        nome: "",
        whatsapp: "",
        email: "",
      })
      return
    }

    startedRef.current = false
    leadCreatedRef.current = false
    formOpenTimeRef.current = Date.now()
    lastStepRef.current = 1

    trackingParamsRef.current = captureTrackingParams()
    const eventId = generateEventId()

    trackPixelEvent("InitiateCheckout", { content_name: "diagnostico-viagens-b" }, eventId)
    fetch("/api/meta-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName: "InitiateCheckout",
        eventId,
        fbc: trackingParamsRef.current.fbc,
        fbp: trackingParamsRef.current.fbp,
        customData: { content_name: "diagnostico-viagens-b" },
      }),
    }).catch(() => {})

    startedRef.current = true
    pushToDataLayer("diagnostico_b_start", { ...getStepMeta(1), action_name: "start" })
    pushToDataLayer("diagnostico_b_step_view", {
      ...getStepMeta(1),
      action_name: "step_view",
      completion_percentage: Math.round((1 / TOTAL_STEPS) * 100),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleBeforeUnload = () => {
      if (!startedRef.current || leadCreatedRef.current) return
      const lastStep = getStepMeta(lastStepRef.current)
      pushToDataLayer("diagnostico_b_form_abandon", {
        ...lastStep,
        action_name: "form_abandon",
        completion_percentage: Math.round((lastStepRef.current / TOTAL_STEPS) * 100),
        time_on_form_bucket: getTimeOnFormBucket(Date.now() - formOpenTimeRef.current),
      })
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [open])

  useEffect(() => {
    if (!open) return

    const handleWindowError = (event: ErrorEvent) => {
      pushToDataLayer("diagnostico_b_js_error", {
        ...getStepMeta(lastStepRef.current),
        action_name: "javascript_error",
        error_type: "javascript_error",
        error_message: sanitizeErrorMessage(event.message),
        file_name: event.filename ?? "",
        line_number: event.lineno ?? "",
      })
    }
    const handleRejection = (event: PromiseRejectionEvent) => {
      pushToDataLayer("diagnostico_b_js_error", {
        ...getStepMeta(lastStepRef.current),
        action_name: "unhandled_promise_rejection",
        error_type: "unhandled_promise_rejection",
        error_message: sanitizeErrorMessage(String(event.reason)),
      })
    }
    window.addEventListener("error", handleWindowError)
    window.addEventListener("unhandledrejection", handleRejection)
    return () => {
      window.removeEventListener("error", handleWindowError)
      window.removeEventListener("unhandledrejection", handleRejection)
    }
  }, [open])

  function validateStep(stepIndex: number): ValidationError[] {
    const errs: ValidationError[] = []
    if (stepIndex === 1 && !formData.frequencia) {
      errs.push({ field_name: "frequencia", error_type: "required_field", error_message: "Selecione uma opção." })
    }
    if (stepIndex === 2 && !formData.gastoAnual) {
      errs.push({ field_name: "gasto_anual", error_type: "required_field", error_message: "Selecione uma opção." })
    }
    if (stepIndex === 3 && !formData.gastoCartao) {
      errs.push({ field_name: "gasto_cartao", error_type: "required_field", error_message: "Selecione uma opção." })
    }
    if (stepIndex === 4 && !formData.maturidade) {
      errs.push({ field_name: "maturidade", error_type: "required_field", error_message: "Selecione uma opção." })
    }
    if (stepIndex === 5) {
      if (!formData.nome.trim()) {
        errs.push({ field_name: "nome", error_type: "required_field", error_message: "Informe seu nome." })
      }
      const digits = whatsappDisplay.replace(/\D/g, "")
      if (digits.length < 10) {
        errs.push({ field_name: "whatsapp", error_type: "invalid_phone", error_message: "Informe o WhatsApp com DDD." })
      }
      if (!/\S+@\S+\.\S+/.test(formData.email)) {
        errs.push({ field_name: "email", error_type: "invalid_email", error_message: "Informe um e-mail válido." })
      }
    }
    return errs
  }

  function trackValidationErrors(stepMeta: ReturnType<typeof getStepMeta>, validationErrors: ValidationError[]) {
    validationErrors.forEach((error) => {
      pushToDataLayer("diagnostico_b_validation_error", {
        ...stepMeta,
        action_name: "validation_error",
        field_name: error.field_name,
        error_type: error.error_type,
        error_message: sanitizeErrorMessage(error.error_message),
        validation_errors_count: validationErrors.length,
      })
    })
  }

  const handleSubmit = useCallback(async () => {
    setSubmitting(true)
    setShowLoading(true)
    setLoadingMsgIndex(0)

    const resultado = calcularDiagnostico(formData)
    sessionStorage.setItem("diagnostico_b_resultado", JSON.stringify(resultado))

    let msgIndex = 0
    const msgInterval = setInterval(() => {
      msgIndex++
      if (msgIndex < loadingMessages.length) setLoadingMsgIndex(msgIndex)
    }, 700)

    const finalStep = getStepMeta(TOTAL_STEPS)
    const leadEventId = getOrCreateLeadEventId()
    const tracking = trackingParamsRef.current ?? captureTrackingParams()

    pushToDataLayer("diagnostico_b_submit_attempt", {
      ...finalStep,
      event_id: leadEventId,
      action_name: "submit_attempt",
    })

    try {
      const leadRes = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: formData.nome,
          email: formData.email,
          whatsapp: `+55 ${whatsappDisplay}`,
          frequencia: formData.frequencia,
          gastoAnual: formData.gastoAnual,
          gastoCartao: formData.gastoCartao,
          maturidade: formData.maturidade,
          temperatura: resultado.temperatura,
          mql: resultado.mql,
          economiaMin: resultado.economiaMin,
          economiaMax: resultado.economiaMax,
          gastoAnualEstimado: resultado.gastoAnualEstimado,
          utm_source: tracking.utm_source,
          utm_medium: tracking.utm_medium,
          utm_campaign: tracking.utm_campaign,
          utm_term: tracking.utm_term,
          utm_content: tracking.utm_content,
          fbclid: tracking.fbclid,
          gclid: tracking.gclid,
          referrer: tracking.referrer,
          fbp: tracking.fbp,
          fbc: tracking.fbc,
          client_user_agent: tracking.client_user_agent,
        }),
      })

      if (leadRes.ok) {
        leadCreatedRef.current = true

        trackPixelEvent(
          "Lead",
          { content_name: "diagnostico-viagens-b", currency: "BRL", value: resultado.economiaMin },
          leadEventId
        )
        fetch("/api/meta-event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventName: "Lead",
            eventId: leadEventId,
            email: formData.email,
            phone: `55${whatsappDisplay.replace(/\D/g, "")}`,
            firstName: formData.nome.split(" ")[0],
            fbc: tracking.fbc,
            fbp: tracking.fbp,
            clientUserAgent: tracking.client_user_agent,
            customData: {
              content_name: "diagnostico-viagens-b",
              currency: "BRL",
              value: resultado.economiaMin,
              temperatura_lead: resultado.temperatura,
            },
          }),
        }).catch(() => {})

        pushToDataLayer("generate_lead", {
          ...finalStep,
          event_id: leadEventId,
          action_name: "lead_created",
          source_event: "diagnostico_b_generate_lead",
          lead_source: "site",
          temperatura_lead: resultado.temperatura,
          mql: resultado.mql,
          crm_status: "success",
        })
      } else {
        pushToDataLayer("diagnostico_b_integration_error", {
          ...finalStep,
          event_id: leadEventId,
          action_name: "integration_error",
          error_type: "crm_create_failed",
          error_message: sanitizeErrorMessage(`Lead API respondeu HTTP ${leadRes.status}`),
          crm_status: "failed",
        })
      }
    } catch (error) {
      pushToDataLayer("diagnostico_b_integration_error", {
        ...finalStep,
        event_id: leadEventId,
        action_name: "integration_error",
        error_type: "network_error",
        error_message: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)),
        crm_status: "failed",
      })
    }

    setTimeout(() => {
      clearInterval(msgInterval)
      onClose()
      router.push("/resultado")
    }, 2600)
  }, [formData, whatsappDisplay, onClose, router])

  const goNext = useCallback(() => {
    setStep((currentStep) => {
      const currentStepMeta = getStepMeta(currentStep)
      pushToDataLayer("diagnostico_b_next_click", { ...currentStepMeta, action_name: "next_click" })

      const validationErrors = validateStep(currentStep)

      if (currentStep === TOTAL_STEPS) {
        if (validationErrors.length > 0) {
          setErrors(Object.fromEntries(validationErrors.map((e) => [e.field_name, e.error_message])))
          pushToDataLayer("diagnostico_b_submit_blocked", {
            ...currentStepMeta,
            action_name: "submit_blocked",
            blocked_reason: "validation_failed",
            validation_errors_count: validationErrors.length,
          })
          trackValidationErrors(currentStepMeta, validationErrors)
          return currentStep
        }
        setErrors({})
        pushToDataLayer("diagnostico_b_next_success", { ...currentStepMeta, action_name: "next_success" })
        setTimeout(() => handleSubmit(), 0)
        return currentStep
      }

      if (validationErrors.length > 0) {
        setErrors(Object.fromEntries(validationErrors.map((e) => [e.field_name, e.error_message])))
        pushToDataLayer("diagnostico_b_next_blocked", {
          ...currentStepMeta,
          action_name: "next_blocked",
          blocked_reason: "validation_failed",
          validation_errors_count: validationErrors.length,
        })
        trackValidationErrors(currentStepMeta, validationErrors)
        return currentStep
      }

      setErrors({})

      const answerBucketMap: Record<number, string> = {
        1: frequenciaBucketMap[formData.frequencia] ?? "unknown",
        2: gastoAnualBucketMap[formData.gastoAnual] ?? "unknown",
        3: gastoCartaoBucketMap[formData.gastoCartao] ?? "unknown",
        4: maturidadeBucketMap[formData.maturidade] ?? "unknown",
      }

      pushToDataLayer("diagnostico_b_step_answered", {
        ...currentStepMeta,
        action_name: "step_answered",
        answer_bucket: answerBucketMap[currentStep] ?? "unknown",
        completion_percentage: Math.round((currentStep / TOTAL_STEPS) * 100),
      })

      const nextStep = currentStep < TOTAL_STEPS ? currentStep + 1 : currentStep
      const nextStepMeta = getStepMeta(nextStep)
      lastStepRef.current = nextStep

      pushToDataLayer("diagnostico_b_next_success", {
        ...currentStepMeta,
        next_step_index: nextStepMeta.step_index,
        next_step_name: nextStepMeta.step_name,
        action_name: "next_success",
      })
      pushToDataLayer("diagnostico_b_step_view", {
        ...nextStepMeta,
        action_name: "step_view",
        completion_percentage: Math.round((nextStep / TOTAL_STEPS) * 100),
      })
      trackPixelEvent("ViewContent", { step: nextStep, content_name: "diagnostico-viagens-b" })

      setAnimating(true)
      setTimeout(() => setAnimating(false), 220)
      return nextStep
    })
  }, [formData, whatsappDisplay, handleSubmit])

  const goBack = useCallback(() => {
    if (step > 1) {
      setAnimating(true)
      setTimeout(() => {
        setStep((s) => s - 1)
        setAnimating(false)
      }, 220)
    }
  }, [step])

  const setField = <K extends keyof DiagnosticoFormData>(field: K, value: DiagnosticoFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setErrors({})
  }

  const handleWhatsappInput = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 11)
    setWhatsappDisplay(formatWhatsappDisplay(digits))
    setFormData((prev) => ({ ...prev, whatsapp: digits }))
    setErrors({})
  }

  if (!open) return null

  if (showLoading) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        className="flex flex-col items-center justify-center"
        style={{ position: "fixed", inset: 0, zIndex: 9999, height: "100svh", backgroundColor: "#111111" }}
      >
        <div className="flex flex-col items-center gap-8 px-6 text-center max-w-sm">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border" style={{ borderColor: "rgba(255,255,255,.12)" }} />
            <div
              className="absolute inset-0 rounded-full border animate-spin"
              style={{ borderColor: "var(--gold-mid)", borderTopColor: "transparent" }}
            />
          </div>
          <p key={loadingMsgIndex} className="text-sm font-light" style={{ color: "var(--text-70)" }}>
            {loadingMessages[loadingMsgIndex]}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="flex flex-col"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100svh",
        backgroundColor: "#111111",
        zIndex: 9999,
        overscrollBehavior: "contain",
      }}
    >
      <div
        className="flex items-center justify-between px-6 py-5 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <span className="text-sm tracking-widest uppercase" style={{ color: "var(--text-70)" }}>
          Viagente
        </span>
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="w-8 h-8 flex items-center justify-center"
          style={{ color: "var(--text-70)" }}
        >
          <svg width="14" height="14" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M2 2l14 14M16 2L2 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="px-6 pt-6 pb-2 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-light tracking-wide" style={{ color: "var(--text-muted)" }}>
            {step} de {TOTAL_STEPS}
          </span>
        </div>
        <div className="h-0.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%`, background: "var(--gold-mid)" }}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0" style={{ overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        <div className="flex flex-col min-h-full px-6 pt-10">
          <div
            className="transition-opacity"
            style={{ opacity: animating ? 0 : 1, transitionDuration: animating ? "200ms" : "300ms" }}
          >
            {step === 1 && (
              <StepWrapper title="Com que frequência você viaja por ano?">
                <OptionGrid options={frequenciaOptions} value={formData.frequencia} onChange={(v) => setField("frequencia", v as DiagnosticoFormData["frequencia"])} />
                {errors.frequencia && <ErrorMsg>{errors.frequencia}</ErrorMsg>}
              </StepWrapper>
            )}

            {step === 2 && (
              <StepWrapper title="Quanto você gasta com viagens por ano, aproximadamente?">
                <OptionGrid options={gastoAnualOptions} value={formData.gastoAnual} onChange={(v) => setField("gastoAnual", v as DiagnosticoFormData["gastoAnual"])} />
                {errors.gasto_anual && <ErrorMsg>{errors.gasto_anual}</ErrorMsg>}
              </StepWrapper>
            )}

            {step === 3 && (
              <StepWrapper title="Gasto mensal no cartão de crédito, somando PF e PJ">
                <OptionGrid options={gastoCartaoOptions} value={formData.gastoCartao} onChange={(v) => setField("gastoCartao", v as DiagnosticoFormData["gastoCartao"])} />
                {errors.gasto_cartao && <ErrorMsg>{errors.gasto_cartao}</ErrorMsg>}
              </StepWrapper>
            )}

            {step === 4 && (
              <StepWrapper title="Hoje, quem cuida das suas milhas e emissões?">
                <OptionGrid options={maturidadeOptions} value={formData.maturidade} onChange={(v) => setField("maturidade", v as DiagnosticoFormData["maturidade"])} />
                {errors.maturidade && <ErrorMsg>{errors.maturidade}</ErrorMsg>}
              </StepWrapper>
            )}

            {step === 5 && (
              <StepWrapper title="Seus dados para receber a análise">
                <div className="flex flex-col gap-6">
                  <div>
                    <label className="block text-[11px] mb-2 uppercase tracking-widest font-light" style={{ color: "var(--text-muted)" }}>
                      Nome
                    </label>
                    <input
                      type="text"
                      value={formData.nome}
                      onChange={(e) => setField("nome", e.target.value)}
                      placeholder="Seu nome"
                      className="w-full bg-transparent px-0 py-3 font-light focus:outline-none"
                      style={{ fontSize: "16px", color: "var(--text)", borderBottom: "1px solid var(--border)" }}
                    />
                    {errors.nome && <ErrorMsg>{errors.nome}</ErrorMsg>}
                  </div>

                  <div>
                    <label className="block text-[11px] mb-2 uppercase tracking-widest font-light" style={{ color: "var(--text-muted)" }}>
                      WhatsApp com DDD
                    </label>
                    <input
                      inputMode="numeric"
                      type="tel"
                      value={whatsappDisplay}
                      onChange={(e) => handleWhatsappInput(e.target.value)}
                      placeholder="(11) 90000-0000"
                      className="w-full bg-transparent px-0 py-3 font-light focus:outline-none"
                      style={{ fontSize: "16px", color: "var(--text)", borderBottom: "1px solid var(--border)" }}
                    />
                    {errors.whatsapp && <ErrorMsg>{errors.whatsapp}</ErrorMsg>}
                  </div>

                  <div>
                    <label className="block text-[11px] mb-2 uppercase tracking-widest font-light" style={{ color: "var(--text-muted)" }}>
                      E-mail
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setField("email", e.target.value)}
                      placeholder="voce@email.com"
                      className="w-full bg-transparent px-0 py-3 font-light focus:outline-none"
                      style={{ fontSize: "16px", color: "var(--text)", borderBottom: "1px solid var(--border)" }}
                    />
                    {errors.email && <ErrorMsg>{errors.email}</ErrorMsg>}
                  </div>

                  <p className="text-[11px] font-light" style={{ color: "var(--text-muted)" }}>
                    Ao enviar, um estrategista da Viagente vai te chamar no WhatsApp para agendar a devolutiva. Sem
                    spam, sem robô.
                  </p>
                </div>
              </StepWrapper>
            )}
          </div>

          <div
            className="flex items-center gap-3 pt-4 mt-auto flex-shrink-0"
            style={{
              borderTop: "1px solid var(--border)",
              paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))",
            }}
          >
            {step > 1 && (
              <button
                onClick={goBack}
                className="flex items-center gap-1.5 text-sm font-light px-3 py-2.5"
                style={{ color: "var(--text-70)" }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Voltar
              </button>
            )}
            <button onClick={goNext} disabled={submitting} className="btn-primary flex-1">
              {submitting ? "Processando..." : step === TOTAL_STEPS ? "Ver minha estimativa" : "Próximo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function StepWrapper({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-8 max-w-md mx-auto w-full">
      <h2 className="text-xl md:text-2xl font-light leading-snug" style={{ color: "var(--text)", letterSpacing: "0.01em" }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

function OptionGrid({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((opt) => {
        const selected = value === opt.value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className="w-full text-left px-4 py-3.5 rounded-xl text-sm font-light transition-all duration-200"
            style={{
              border: `1px solid ${selected ? "var(--gold-mid)" : "var(--border)"}`,
              background: selected ? "rgba(212,165,55,0.08)" : "transparent",
              color: selected ? "var(--text)" : "var(--text-70)",
            }}
          >
            <span className="flex items-center gap-3">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{
                  border: `1px solid ${selected ? "var(--gold-mid)" : "rgba(255,255,255,.3)"}`,
                  background: selected ? "var(--gold-mid)" : "transparent",
                }}
              />
              {opt.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function ErrorMsg({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs mt-2 font-light" style={{ color: "#e0685f" }}>
      {children}
    </p>
  )
}
