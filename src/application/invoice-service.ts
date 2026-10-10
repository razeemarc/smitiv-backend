import { WorkOrderNotCompletedError, WorkOrderNotFoundError } from "./errors.js";
import { InvoiceNotFoundError } from "./errors.js";
import type { GeneratedInvoice, InvoiceEmailSender, InvoiceRepository } from "../domain/invoice.js";

function decimalToCents(amount: string): bigint {
  const [whole, fraction = ""] = amount.split(".");
  return BigInt(whole!) * 100n + BigInt(fraction.padEnd(2, "0").slice(0, 2));
}

function formatCents(cents: bigint): string {
  return `${cents / 100n}.${(cents % 100n).toString().padStart(2, "0")}`;
}

export class InvoiceService {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly emailSender: InvoiceEmailSender,
  ) {}

  async generateForWorkOrder(workOrderId: string): Promise<GeneratedInvoice> {
    const workOrder = await this.invoices.findWorkOrderSource(workOrderId);
    if (!workOrder) throw new WorkOrderNotFoundError();
    if (workOrder.status !== "COMPLETED") throw new WorkOrderNotCompletedError();

    const subtotalCents = decimalToCents(workOrder.unitPrice) * BigInt(workOrder.quantity);
    const gstCents = (subtotalCents * 9n + 50n) / 100n;
    const grandTotalCents = subtotalCents + gstCents;

    return this.invoices.createOrGet({
      workOrderId: workOrder.id,
      subtotal: formatCents(subtotalCents),
      gstAmount: formatCents(gstCents),
      grandTotal: formatCents(grandTotalCents),
    });
  }

  async findById(id: string) {
    const result = await this.invoices.findById(id);
    if (!result) throw new InvoiceNotFoundError();
    return result.invoice;
  }

  list(page: number, pageSize: number) {
    return this.invoices.findPage(page, pageSize);
  }

  async sendById(id: string, idempotencyKey?: string) {
    const result = await this.invoices.findById(id);
    if (!result) throw new InvoiceNotFoundError();
    const emailId = await this.emailSender.sendInvoice(result.recipientEmail, result.invoice, idempotencyKey);
    return { invoiceNumber: result.invoice.invoiceNumber, sentTo: result.recipientEmail, emailId };
  }
}
