import { z } from "zod";

export const invoiceIdSchema = z.object({ invoiceId: z.uuid() }).strict();
export const listInvoicesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
}).strict();

export const sendInvoiceHeadersSchema = z.object({
  "idempotency-key": z.string().trim().min(1).max(256).optional(),
}).strict();
