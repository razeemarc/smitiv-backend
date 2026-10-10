import type { WorkOrderStatus } from "./work-order.js";

export interface InvoiceWorkOrderSource {
  id: string;
  status: WorkOrderStatus;
  customerName: string;
  customerAddress: string;
  billingAddress: string;
  service: string;
  quantity: number;
  unitPrice: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  workOrderId: string;
  customerName: string;
  customerAddress: string;
  billingAddress: string;
  service: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
  gstRate: 9;
  gstAmount: string;
  grandTotal: string;
  createdAt: Date;
}

export interface CreateInvoiceRecord {
  workOrderId: string;
  subtotal: string;
  gstAmount: string;
  grandTotal: string;
}

export interface GeneratedInvoice {
  invoice: Invoice;
  created: boolean;
}

export interface InvoiceWithRecipient {
  invoice: Invoice;
  recipientEmail: string;
}

export interface InvoicePage {
  items: Invoice[];
  total: number;
  page: number;
  pageSize: number;
}

export interface InvoiceEmailSender {
  sendInvoice(to: string, invoice: Invoice, idempotencyKey?: string): Promise<string>;
}

export interface InvoiceRepository {
  findWorkOrderSource(id: string): Promise<InvoiceWorkOrderSource | null>;
  createOrGet(input: CreateInvoiceRecord): Promise<GeneratedInvoice>;
  findById(id: string): Promise<InvoiceWithRecipient | null>;
  findPage(page: number, pageSize: number): Promise<InvoicePage>;
}
