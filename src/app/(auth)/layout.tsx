import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth/dal";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[32px] bg-surface shadow-float md:grid-cols-2">
        <section className="relative hidden flex-col justify-between bg-ink p-10 text-white md:flex">
          <span className="text-4xl font-extrabold tracking-tighter">F.</span>
          <div>
            <svg viewBox="0 0 320 150" className="mb-8 w-full" fill="none" aria-hidden>
              <path d="M10 120 C 50 120, 60 70, 100 80 S 150 130, 180 90 S 230 20, 260 40 S 300 70, 310 60" stroke="white" strokeWidth="3" strokeLinecap="round" />
              {[
                [10, 120],
                [100, 80],
                [180, 90],
                [260, 40],
                [310, 60],
              ].map(([x, y]) => (
                <circle key={x} cx={x} cy={y} r="6" fill="#0b0b0b" stroke="white" strokeWidth="3" />
              ))}
              <rect x="226" y="6" width="68" height="24" rx="6" fill="white" />
              <text x="260" y="22" textAnchor="middle" fontSize="11" fontWeight="700" fill="#0b0b0b">+ R$ 1,2k</text>
            </svg>
            <h2 className="text-3xl font-extrabold leading-tight tracking-tight">Seu dinheiro,<br />com clareza.</h2>
            <p className="mt-3 max-w-xs text-sm text-white/60">Receitas, despesas, cartões, dívidas e objetivos — tudo em um só lugar, com números em que você pode confiar.</p>
          </div>
          <p className="text-xs text-white/40">© Fluxo</p>
        </section>
        <section className="p-8 sm:p-12">{children}</section>
      </div>
    </div>
  );
}
