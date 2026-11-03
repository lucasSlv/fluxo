import { AuthForm } from "@/components/finance/auth-form";

export const metadata = { title: "Criar conta" };

export default function RegisterPage() {
  return <AuthForm mode="register" />;
}
