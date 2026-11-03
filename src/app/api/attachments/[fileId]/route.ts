import { Readable } from "node:stream";
import type { NextRequest } from "next/server";
import { readAttachment } from "@/modules/transactions/attachments";
import { withUser } from "../../_helpers";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  return withUser(async (user) => {
    const { fileId } = await params;
    const { file, stream } = await readAttachment(user.id, fileId);
    const type = (file.metadata?.contentType as string) ?? "application/octet-stream";
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        "Content-Type": type,
        "Content-Length": String(file.length),
        "Content-Disposition": `inline; filename="${encodeURIComponent(file.filename)}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  });
}
