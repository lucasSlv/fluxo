"use client";

import { Download, FileText, Printer } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";

export function ExportButtons({ txQuery, reportQuery }: { txQuery: string; reportQuery: string }) {
  return (
    <div className="no-print flex flex-wrap gap-2">
      <a href={`/api/export/transactions?${txQuery}`} className={buttonStyles("outline", "sm")} download>
        <Download size={14} /> Exportar CSV
      </a>
      <a href={`/api/export/report?${reportQuery}`} className={buttonStyles("outline", "sm")} download>
        <FileText size={14} /> Resumo CSV
      </a>
      <button type="button" onClick={() => window.print()} className={buttonStyles("primary", "sm")}>
        <Printer size={14} /> Exportar PDF
      </button>
    </div>
  );
}
