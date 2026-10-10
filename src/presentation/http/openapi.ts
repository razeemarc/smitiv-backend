import { OpenApiGeneratorV3, OpenAPIRegistry, extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { createCustomerSchema, customerIdSchema, listCustomersQuerySchema, updateCustomerSchema } from "./customer-schemas.js";
import {
  completeWorkOrderSchema,
  createWorkOrderSchema,
  generateInvoiceBodySchema,
  listWorkOrdersQuerySchema,
  workOrderIdSchema,
  workOrderStatusSchema,
} from "./work-order-schemas.js";
import { invoiceIdSchema, listInvoicesQuerySchema, sendInvoiceHeadersSchema } from "./invoice-schemas.js";

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();
const documentedWorkOrderStatusSchema = z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
  .openapi({ description: "Work order lifecycle status", example: "PENDING" });
const customerSchema = registry.register("Customer", z.object({
  id: z.uuid().openapi({ description: "Customer UUID", example: "4d6b00d5-10c7-4ad4-8e88-6e74dfc775ec" }),
  customerName: z.string().openapi({ example: "Ada Lovelace" }),
  email: z.email().openapi({ example: "ada@example.com" }),
  phoneNumber: z.string().openapi({ example: "+1 (415) 555-0100" }),
  customerAddress: z.string().openapi({ example: "12 Analytical Engine Lane" }),
  billingAddress: z.string().openapi({ example: "PO Box 1" }),
  createdAt: z.iso.datetime().openapi({ example: "2026-10-10T10:30:00.000Z" }),
  updatedAt: z.iso.datetime().openapi({ example: "2026-10-10T10:30:00.000Z" }),
}).openapi({ description: "A customer record", example: {
  id: "4d6b00d5-10c7-4ad4-8e88-6e74dfc775ec",
  customerName: "Ada Lovelace",
  email: "ada@example.com",
  phoneNumber: "+1 (415) 555-0100",
  customerAddress: "12 Analytical Engine Lane",
  billingAddress: "PO Box 1",
  createdAt: "2026-10-10T10:30:00.000Z",
  updatedAt: "2026-10-10T10:30:00.000Z",
} }));
const customerResponse = z.object({ data: customerSchema });
const workOrderSchema = registry.register("WorkOrder", z.object({
  id: z.uuid().openapi({ example: "5d6b00d5-10c7-4ad4-8e88-6e74dfc775ec" }),
  customerId: z.uuid().openapi({ example: "4d6b00d5-10c7-4ad4-8e88-6e74dfc775ec" }),
  customerName: z.string().openapi({ example: "Ada Lovelace" }),
  customerEmail: z.email().openapi({ example: "ada@example.com" }),
  service: z.string().openapi({ example: "Equipment maintenance" }),
  quantity: z.number().int().openapi({ example: 2 }),
  unitPrice: z.string().openapi({ example: "100.00", description: "Currency amount with two decimal places" }),
  totalAmount: z.string().openapi({ example: "200.00", description: "Quantity multiplied by unit price" }),
  serviceAddress: z.string().openapi({ example: "12 Analytical Engine Lane" }),
  billingAddress: z.string().openapi({ example: "PO Box 1" }),
  serviceDate: z.iso.date().openapi({ example: "2026-10-15" }),
  status: documentedWorkOrderStatusSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}).openapi({ description: "A scheduled or completed customer work order" }));
const invoiceSchema = registry.register("Invoice", z.object({
  id: z.uuid().openapi({ example: "7d6b00d5-10c7-4ad4-8e88-6e74dfc775ec" }),
  invoiceNumber: z.string().openapi({ example: "INV-000001" }),
  workOrderId: z.uuid().openapi({ example: "5d6b00d5-10c7-4ad4-8e88-6e74dfc775ec" }),
  customerName: z.string().openapi({ example: "Ada Lovelace" }),
  customerAddress: z.string().openapi({ example: "12 Analytical Engine Lane" }),
  billingAddress: z.string().openapi({ example: "PO Box 1" }),
  service: z.string().openapi({ example: "Equipment maintenance" }),
  quantity: z.number().int().openapi({ example: 2 }),
  unitPrice: z.string().openapi({ example: "100.00" }),
  subtotal: z.string().openapi({ example: "200.00" }),
  gstRate: z.literal(9).openapi({ description: "GST percentage, currently fixed at 9", example: 9 }),
  gstAmount: z.string().openapi({ example: "18.00" }),
  grandTotal: z.string().openapi({ example: "218.00" }),
  createdAt: z.iso.datetime().openapi({ example: "2026-10-10T10:30:00.000Z" }),
}).openapi({ description: "An invoice generated for a completed work order" }));
const invoiceListResponse = z.object({
  data: z.array(invoiceSchema),
  pagination: z.object({ page: z.number(), pageSize: z.number(), total: z.number(), totalPages: z.number() }),
});
const completedWorkOrderResponse = z.object({
  data: workOrderSchema,
  invoice: invoiceSchema,
});
const invoiceEmailResponse = z.object({
  data: z.object({
    invoiceNumber: z.string(),
    sentTo: z.email(),
    emailId: z.string(),
    status: z.literal("accepted"),
  }),
});
const errorResponse = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(z.object({ path: z.array(z.string()), message: z.string() })).optional(),
    provider: z.object({
      status: z.number().int().optional(),
      code: z.string().optional(),
      message: z.string().optional(),
    }).optional(),
  }),
});
const listResponse = z.object({
  data: z.array(customerSchema),
  pagination: z.object({ page: z.number(), pageSize: z.number(), total: z.number(), totalPages: z.number() }),
});
const workOrderListResponse = z.object({
  data: z.array(z.object({
    id: z.uuid(),
    customerName: z.string(),
    service: z.string(),
    serviceDate: z.iso.date(),
    totalAmount: z.string(),
    status: workOrderStatusSchema,
  })),
  pagination: z.object({ page: z.number(), pageSize: z.number(), total: z.number(), totalPages: z.number() }),
});
const healthResponse = z.object({ status: z.literal("ok") });
const json = (schema: z.ZodType) => ({ content: { "application/json": { schema } } });
const standardErrors = {
  400: { description: "Invalid request", ...json(errorResponse) },
  404: { description: "Requested resource not found", ...json(errorResponse) },
  409: { description: "Request conflicts with the current resource state", ...json(errorResponse) },
  500: { description: "Unexpected server error", ...json(errorResponse) },
};

registry.registerPath({
  method: "get",
  path: "/api/v1/invoices",
  operationId: "listInvoices",
  summary: "List invoices",
  description: "Returns invoices in pages, newest first. Defaults to page 1 with 20 records; pageSize cannot exceed 100.",
  tags: ["Invoices"],
  request: { query: listInvoicesQuerySchema },
  responses: { 200: { description: "Paginated invoice list", ...json(invoiceListResponse) }, 400: standardErrors[400], 500: standardErrors[500] },
});
registry.registerPath({
  method: "get",
  path: "/health",
  summary: "Check API liveness",
  description: "Returns a simple health status when the API process is running.",
  responses: { 200: { description: "API process is healthy", ...json(healthResponse) } },
});
registry.registerPath({
  method: "get",
  path: "/api/v1/work-orders",
  summary: "List work orders",
  description: "Returns work orders for the table, ordered by service date ascending. Defaults to page 1 with 20 records; pageSize cannot exceed 100.",
  tags: ["Work Orders"],
  request: { query: listWorkOrdersQuerySchema },
  responses: {
    200: { description: "Paginated work order list", ...json(workOrderListResponse) },
    400: standardErrors[400],
    500: standardErrors[500],
  },
});
registry.registerPath({
  method: "post",
  path: "/api/v1/customers",
  summary: "Create a customer",
  description: "Creates a customer. Email addresses must be unique. All five customer fields are required.",
  tags: ["Customers"],
  request: { body: { content: { "application/json": { schema: createCustomerSchema } } } },
  responses: { 201: { description: "Customer created", ...json(customerResponse) }, ...standardErrors },
});
registry.registerPath({
  method: "get",
  path: "/api/v1/customers",
  summary: "List customers",
  description: "Returns customers in pages. Defaults to page 1 with 20 records; pageSize cannot exceed 100.",
  tags: ["Customers"],
  request: { query: listCustomersQuerySchema },
  responses: { 200: { description: "Paginated customer list", ...json(listResponse) }, 400: standardErrors[400], 500: standardErrors[500] },
});
registry.registerPath({
  method: "get",
  path: "/api/v1/customers/{id}",
  summary: "Get a customer",
  description: "Returns one customer by its UUID.",
  tags: ["Customers"],
  request: { params: customerIdSchema },
  responses: { 200: { description: "Customer details", ...json(customerResponse) }, 400: standardErrors[400], 404: standardErrors[404], 500: standardErrors[500] },
});
registry.registerPath({
  method: "post",
  path: "/api/v1/work-orders/{id}/invoice",
  operationId: "generateWorkOrderInvoice",
  summary: "Generate an invoice for a completed work order",
  description: "Generates an invoice only after a work order is completed. GST is calculated by the API at a fixed 9%. Repeated requests return the existing invoice.",
  tags: ["Invoices"],
  request: {
    params: workOrderIdSchema,
    body: { required: false, content: { "application/json": { schema: generateInvoiceBodySchema } } },
  },
  responses: {
    201: { description: "Invoice generated", ...json(z.object({ data: invoiceSchema })) },
    200: { description: "Existing invoice returned", ...json(z.object({ data: invoiceSchema })) },
    400: standardErrors[400],
    404: { description: "Work order not found", ...json(errorResponse) },
    409: { description: "Work order is not completed", ...json(errorResponse) },
    500: standardErrors[500],
  },
});
registry.registerPath({
  method: "get",
  path: "/api/v1/invoices/{invoiceId}",
  operationId: "getInvoiceById",
  summary: "Get an invoice by ID",
  description: "Returns an invoice and its related customer and work order details by invoice UUID.",
  tags: ["Invoices"],
  request: { params: invoiceIdSchema },
  responses: {
    200: { description: "Invoice details", ...json(z.object({ data: invoiceSchema })) },
    400: standardErrors[400],
    404: { description: "Invoice not found", ...json(errorResponse) },
    500: standardErrors[500],
  },
});
registry.registerPath({
  method: "post",
  path: "/api/v1/invoices/{invoiceId}/send",
  operationId: "sendInvoiceByEmail",
  summary: "Send an invoice by email",
  description: "Sends the invoice to the email address of the related customer using Resend. Optionally provide Idempotency-Key to safely retry the same request.",
  tags: ["Invoices"],
  request: { params: invoiceIdSchema, headers: sendInvoiceHeadersSchema },
  responses: {
    202: { description: "Email accepted by Resend", ...json(invoiceEmailResponse) },
    400: standardErrors[400],
    404: { description: "Invoice not found", ...json(errorResponse) },
    502: { description: "Email provider rejected or failed to process the request", ...json(errorResponse) },
    503: { description: "Email provider is not configured", ...json(errorResponse) },
    500: standardErrors[500],
  },
});
registry.registerPath({
  method: "patch",
  path: "/api/v1/customers/{id}",
  summary: "Update a customer",
  description: "Updates one or more customer fields. The request must include at least one field; email must remain unique.",
  tags: ["Customers"],
  request: {
    params: customerIdSchema,
    body: { content: { "application/json": { schema: updateCustomerSchema } } },
  },
  responses: { 200: { description: "Customer updated", ...json(customerResponse) }, 400: standardErrors[400], 404: standardErrors[404], 409: standardErrors[409], 500: standardErrors[500] },
});
registry.registerPath({
  method: "delete",
  path: "/api/v1/customers/{id}",
  summary: "Delete a customer",
  description: "Deletes a customer by its UUID. A successful deletion returns no response body.",
  tags: ["Customers"],
  request: { params: customerIdSchema },
  responses: {
    204: { description: "Customer deleted" },
    400: standardErrors[400],
    404: standardErrors[404],
    409: { description: "Customer has linked work orders", ...json(errorResponse) },
    500: standardErrors[500],
  },
});
registry.registerPath({
  method: "patch",
  path: "/api/v1/work-orders/{id}/status",
  summary: "Mark a work order completed",
  description: "Changes the work order status to COMPLETED.",
  tags: ["Work Orders"],
  request: {
    params: workOrderIdSchema,
    body: { content: { "application/json": { schema: completeWorkOrderSchema } } },
  },
  responses: {
    200: { description: "Work order marked completed and its invoice generated or retrieved", ...json(completedWorkOrderResponse) },
    400: standardErrors[400],
    404: { description: "Work order not found", ...json(errorResponse) },
    500: standardErrors[500],
  },
});
registry.registerPath({
  method: "post",
  path: "/api/v1/work-orders",
  summary: "Create a work order",
  description: "Creates a work order for an existing customer. The total is calculated as quantity multiplied by unit price. Status defaults to PENDING.",
  tags: ["Work Orders"],
  request: { body: { content: { "application/json": { schema: createWorkOrderSchema } } } },
  responses: {
    201: { description: "Work order created", ...json(z.object({ data: workOrderSchema })) },
    400: standardErrors[400],
    404: { description: "Selected customer not found", ...json(errorResponse) },
    500: standardErrors[500],
  },
});

export const openApiDocument = new OpenApiGeneratorV3(registry.definitions).generateDocument({
  openapi: "3.0.3",
  info: {
    title: "Customer & Work Order API",
    version: "1.0.0",
    description: "Customer, work order, and invoice API. Request schemas are shared with runtime Zod validation.",
  },
  tags: [
    { name: "Customers", description: "Customer record management" },
    { name: "Work Orders", description: "Work order creation and scheduling" },
    { name: "Invoices", description: "Invoice generation for completed work orders" },
  ],
});
