import type { Request, Response } from "express";
import type { InvoiceService } from "../../application/invoice-service.js";
import { invoiceIdSchema, listInvoicesQuerySchema, sendInvoiceHeadersSchema } from "./invoice-schemas.js";
import { generateInvoiceBodySchema, invoiceWorkOrderIdSchema } from "./work-order-schemas.js";

export class InvoiceController {
  list = async (request: Request, response: Response): Promise<void> => {
    const { page, pageSize } = listInvoicesQuerySchema.parse(request.query);
    const result = await this.invoices.list(page, pageSize);
    response.status(200).json({
      data: result.items,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / result.pageSize),
      },
    });
  };

  constructor(private readonly invoices: InvoiceService) {}

  generate = async (request: Request, response: Response): Promise<void> => {
    const { id } = invoiceWorkOrderIdSchema.parse(request.params);
    generateInvoiceBodySchema.parse(request.body);
    const result = await this.invoices.generateForWorkOrder(id);
    response.status(result.created ? 201 : 200).json({ data: result.invoice });
  };

  getById = async (request: Request, response: Response): Promise<void> => {
    const { invoiceId } = invoiceIdSchema.parse(request.params);
    const invoice = await this.invoices.findById(invoiceId);
    response.status(200).json({ data: invoice });
  };

  send = async (request: Request, response: Response): Promise<void> => {
    const { invoiceId } = invoiceIdSchema.parse(request.params);
    const headers = sendInvoiceHeadersSchema.parse({
      "idempotency-key": request.get("Idempotency-Key") ?? undefined,
    });
    const result = await this.invoices.sendById(invoiceId, headers["idempotency-key"]);
    response.status(202).json({ data: { ...result, status: "accepted" } });
  };
}
