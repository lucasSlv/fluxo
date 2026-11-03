"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ActionResult } from "@/lib/errors";
import { useToast } from "@/components/ui/toast";

/**
 * Executa uma Server Action, exibe feedback, guarda erros por campo e atualiza os dados da página.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useAction<I, O = any>(action: (input: I) => Promise<ActionResult<O>>, opts: { success?: string; onSuccess?: (data: O) => void } = {}) {
  const [pending, start] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const toast = useToast();
  const router = useRouter();

  const run = (input: I) =>
    new Promise<ActionResult<O>>((resolve) => {
      start(async () => {
        const res = await action(input);
        if (res.ok) {
          setFieldErrors({});
          if (opts.success) toast(opts.success);
          opts.onSuccess?.(res.data);
          router.refresh();
        } else {
          setFieldErrors(res.fieldErrors ?? {});
          toast(res.error, "error");
          if (res.code === "UNAUTHORIZED") router.push("/login");
        }
        resolve(res);
      });
    });

  return { run, pending, fieldErrors, setFieldErrors };
}
