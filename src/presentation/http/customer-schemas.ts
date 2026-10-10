import { z } from "zod";

const nonEmptyText = (max: number) => z.string().trim().min(1).max(max);
const phoneNumber = z.string().trim().regex(/^[+()\-\s.0-9]+$/, "Phone number contains unsupported characters").refine(
  (value) => {
    const digitCount = value.replace(/\D/g, "").length;
    return digitCount >= 7 && digitCount <= 20;
  },
  "Phone number must contain between 7 and 20 digits",
);

export const createCustomerSchema = z.object({
  customerName: nonEmptyText(150),
  email: z.string().trim().email().max(254),
  phoneNumber,
  customerAddress: nonEmptyText(500),
  billingAddress: nonEmptyText(500),
}).strict();

export const updateCustomerSchema = createCustomerSchema.partial().strict().refine(
  (value) => Object.keys(value).length > 0,
  "At least one customer field must be provided",
);

export const customerIdSchema = z.object({ id: z.uuid() }).strict();
export const listCustomersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
}).strict();

export type CreateCustomerRequest = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerRequest = z.infer<typeof updateCustomerSchema>;
