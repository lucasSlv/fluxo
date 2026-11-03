import { z } from "zod";
import { hexColor, optionalObjectId, text } from "@/modules/shared/validation";

export const categorySchema = z.object({
  name: text(50).min(1, "Informe o nome"),
  kind: z.enum(["income", "expense"]),
  icon: text(30).default("tag"),
  color: hexColor.default("#6b7280"),
  parentId: optionalObjectId,
});
export type CategoryInput = z.input<typeof categorySchema>;
