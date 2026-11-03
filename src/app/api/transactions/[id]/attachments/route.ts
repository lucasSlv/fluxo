import { NextResponse, type NextRequest } from "next/server";
import { AppError } from "@/lib/errors";
import { addAttachment } from "@/modules/transactions/attachments";
import { withUser } from "../../../_helpers";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withUser(async (user) => {
    const { id } = await params;
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File) || file.size === 0) throw new AppError("VALIDATION", "Envie um arquivo.");
    const res = await addAttachment(user.id, id, file);
    return NextResponse.json(res, { status: 201 });
  });
}
