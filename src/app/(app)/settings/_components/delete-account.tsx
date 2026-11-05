"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useAction } from "@/hooks/use-action";
import { deleteMyAccountAction } from "@/modules/settings/actions";

const WHAT = ["Movimentações, anexos e histórico de alterações", "Contas, cartões, faturas e dívidas", "Recorrências, limites, categorias", "Objetivos e caixinhas", "Login e todas as sessões"];

/** Exclusão definitiva da conta do usuário, com senha e confirmação digitada. */
export function DeleteAccountButton({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const router = useRouter();
  const del = useAction(deleteMyAccountAction, { onSuccess: () => router.replace("/register?deleted=1") });
  const ready = confirmation.trim().toUpperCase() === "EXCLUIR" && password.length > 0;
  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        <Trash2 size={15} /> Excluir minha conta
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Excluir conta definitivamente?" size="md">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (ready) del.run({ password, confirmation });
          }}
        >
          <div className="flex gap-3 rounded-2xl bg-neg-soft p-4 text-sm text-red-900">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-bold">Esta ação não pode ser desfeita.</p>
              <p className="mt-1">
                Tudo de <b>{email}</b> será apagado:
              </p>
              <ul className="mt-1 list-inside list-disc text-xs">
                {WHAT.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs">Depois disso você pode criar uma conta nova (inclusive com o mesmo e-mail), começando do zero.</p>
            </div>
          </div>
          <Field label="Senha atual" error={del.fieldErrors.password}>
            <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} invalid={!!del.fieldErrors.password} />
          </Field>
          <Field label='Para confirmar, digite "EXCLUIR"' error={del.fieldErrors.confirmation}>
            <Input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} autoComplete="off" placeholder="EXCLUIR" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="danger" disabled={!ready} loading={del.pending}>
              Excluir tudo
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
