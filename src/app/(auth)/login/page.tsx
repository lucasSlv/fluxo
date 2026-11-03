import { AuthForm } from "@/components/finance/auth-form";

export const metadata = { title: "Entrar" };

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
