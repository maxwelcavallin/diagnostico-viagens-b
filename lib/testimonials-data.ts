export interface Testimonial {
  texto: string
  nome: string
  fonte: string
  foto: string
  /** Variante de borda exatamente como está na apresentação oficial */
  borderVariant: "gold" | "gold-soft"
}

// Depoimentos reais do Google, replicados da apresentação oficial
// (assessoria-proposta-desktop.html, slide "O que nossos clientes falam.").
export const testimonials: Testimonial[] = [
  {
    texto: "Atendimento top de verdade. Sempre com as melhores taxas e agilidade.",
    nome: "Júlia de Castilho Lázaro",
    fonte: "Google",
    foto: "/depoimentos/julia.jpg",
    borderVariant: "gold",
  },
  {
    texto:
      "Super pontuais pra tudo o que precisamos, boas oportunidades de compra/resgate. Sempre disponíveis! Adoro e recomendo.",
    nome: "Cesar Felicio e Gabriela Sayago",
    fonte: "Google",
    foto: "/depoimentos/gabriela.jpg",
    borderVariant: "gold",
  },
  {
    texto:
      "O atendimento da Viagente é excelente! Além de serem atenciosos, transmitem segurança durante a viagem, desde o início do processo de emissão, da partida, até a volta. Super recomendo!",
    nome: "Fernanda Cunha",
    fonte: "Google",
    foto: "/depoimentos/fernanda.jpg",
    borderVariant: "gold-soft",
  },
]
