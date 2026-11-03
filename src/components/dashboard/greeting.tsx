/** Ilustração em traço preto, no espírito da referência (sem copiar o personagem). */
export function Greeting() {
  return (
    <svg viewBox="0 0 220 120" className="hidden h-28 w-auto shrink-0 sm:block" fill="none" stroke="#0b0b0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="20" y="20" width="120" height="86" rx="12" fill="#fff" />
      <path d="M36 86 L60 64 L78 74 L104 44 L124 54" />
      <circle cx="104" cy="44" r="4" fill="#0b0b0b" />
      <path d="M36 36 h40" strokeWidth="4" />
      <circle cx="170" cy="58" r="30" fill="#fff" />
      <path d="M170 42 v32 M178 48 c-2-4-14-4-15 2 c-1 7 16 5 16 12 c0 7-14 7-17 2" />
      <path d="M196 22 l6 -6 M204 34 l8 -2 M186 14 l2 -8" />
    </svg>
  );
}
