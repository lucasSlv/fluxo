import { AuthForm } from "@/components/finance/auth-form";

export const metadata = { title: "Criar conta" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const { deleted } = await searchParams;
  return (
    <>
      {deleted && <p className="mb-6 rounded-xl bg-muted px-4 py-3 text-sm font-medium text-ink-2">Sua conta e todos os dados foram excluídos. Se quiser, crie uma nova conta abaixo.</p>}
      <AuthForm mode="register" />
    </>
  );
}
