"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Upload, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useAction } from "@/hooks/use-action";
import { deleteAttachmentAction } from "@/modules/transactions/actions";

export function AttachmentUploader({ transactionId }: { transactionId: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();
  return (
    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-ink/20 px-3 py-3 text-xs font-semibold text-ink-2 hover:bg-surface">
      <Upload size={14} /> {busy ? "Enviando…" : "Adicionar comprovante"}
      <input
        type="file"
        className="hidden"
        accept="application/pdf,image/png,image/jpeg,image/webp"
        disabled={busy}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          const fd = new FormData();
          fd.append("file", file);
          const r = await fetch(`/api/transactions/${transactionId}/attachments`, { method: "POST", body: fd });
          setBusy(false);
          if (r.ok) {
            toast("Comprovante anexado");
            router.refresh();
          } else toast((await r.json().catch(() => ({}))).error ?? "Falha no envio", "error");
          e.target.value = "";
        }}
      />
    </label>
  );
}

export function DeleteAttachment({ transactionId, fileId }: { transactionId: string; fileId: string }) {
  const { run, pending } = useAction(() => deleteAttachmentAction(transactionId, fileId), { success: "Anexo removido" });
  return (
    <button disabled={pending} onClick={() => run(undefined as never)} className="rounded-full p-1 text-ink-3 hover:bg-muted hover:text-neg" aria-label="Remover anexo">
      <X size={14} />
    </button>
  );
}
