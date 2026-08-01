import { z } from "zod";

export const promptFormSchema = z.object({
  title: z.string().trim().min(1, "Укажите заголовок").max(200),
  content: z.string().trim().min(1, "Укажите текст").max(10000),
  isPublic: z.boolean(),
});

export type PromptFormValues = z.infer<typeof promptFormSchema>;
