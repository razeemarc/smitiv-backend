import { z } from "zod";

export const workOrderStatusSchema = z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);

export const createWorkOrderSchema = z.object({
  customerId: z.uuid(),
  service: z.string().trim().min(1).max(250),
  quantity: z.number().int().positive().max(1_000_000),
  unitPrice: z.number().finite().min(0).max(999_999_999.99).refine(
    (value) => Number(value.toFixed(2)) === value,
    "Unit price cannot have more than 2 decimal places",
  ),
  serviceAddress: z.string().trim().min(1).max(500),
  billingAddress: z.string().trim().min(1).max(500),
  serviceDate: z.iso.date(),
  status: workOrderStatusSchema.default("PENDING"),
}).strict();

export const listWorkOrdersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
}).strict();

export const workOrderIdSchema = z.object({ id: z.uuid() }).strict();

export const invoiceWorkOrderIdSchema = workOrderIdSchema;

export const generateInvoiceBodySchema = z.object({}).strict().optional();

export const completeWorkOrderSchema = z.object({
  status: z.literal("COMPLETED"),
}).strict();

export type CreateWorkOrderRequest = z.infer<typeof createWorkOrderSchema>;
export type ListWorkOrdersQuery = z.infer<typeof listWorkOrdersQuerySchema>;
