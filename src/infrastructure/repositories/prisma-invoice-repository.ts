import { Prisma } from "../../generated/prisma/client.js";
import type {
  CreateInvoiceRecord,
  GeneratedInvoice,
  Invoice,
  InvoicePage,
  InvoiceRepository,
  InvoiceWithRecipient,
  InvoiceWorkOrderSource,
} from "../../domain/invoice.js";
import { prisma } from "../database/prisma.js";

const invoiceSelect = {
  id: true,
  invoiceNumber: true,
  workOrderId: true,
  subtotal: true,
  gstAmount: true,
  grandTotal: true,
  createdAt: true,
  workOrder: {
    select: {
      service: true,
      quantity: true,
      unitPrice: true,
      customer: {
        select: { customerName: true, customerAddress: true, billingAddress: true, email: true },
      },
    },
  },
} satisfies Prisma.InvoiceSelect;

type PrismaInvoice = Prisma.InvoiceGetPayload<{ select: typeof invoiceSelect }>;

function toDomain(record: PrismaInvoice): Invoice {
  return {
    id: record.id,
    invoiceNumber: `INV-${String(record.invoiceNumber).padStart(6, "0")}`,
    workOrderId: record.workOrderId,
    customerName: record.workOrder.customer.customerName,
    customerAddress: record.workOrder.customer.customerAddress,
    billingAddress: record.workOrder.customer.billingAddress,
    service: record.workOrder.service,
    quantity: record.workOrder.quantity,
    unitPrice: record.workOrder.unitPrice.toFixed(2),
    subtotal: record.subtotal.toFixed(2),
    gstRate: 9,
    gstAmount: record.gstAmount.toFixed(2),
    grandTotal: record.grandTotal.toFixed(2),
    createdAt: record.createdAt,
  };
}

export class PrismaInvoiceRepository implements InvoiceRepository {
  async findPage(page: number, pageSize: number): Promise<InvoicePage> {
    const [records, total] = await Promise.all([
      prisma.invoice.findMany({
        select: invoiceSelect,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.invoice.count(),
    ]);
    return { items: records.map(toDomain), total, page, pageSize };
  }

  async findWorkOrderSource(id: string): Promise<InvoiceWorkOrderSource | null> {
    const record = await prisma.workOrder.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        service: true,
        quantity: true,
        unitPrice: true,
        customer: {
          select: { customerName: true, customerAddress: true, billingAddress: true },
        },
      },
    });

    if (!record) return null;
    return {
      id: record.id,
      status: record.status,
      customerName: record.customer.customerName,
      customerAddress: record.customer.customerAddress,
      billingAddress: record.customer.billingAddress,
      service: record.service,
      quantity: record.quantity,
      unitPrice: record.unitPrice.toFixed(2),
    };
  }

  async createOrGet(input: CreateInvoiceRecord): Promise<GeneratedInvoice> {
    const existing = await prisma.invoice.findUnique({
      where: { workOrderId: input.workOrderId },
      select: invoiceSelect,
    });
    if (existing) return { invoice: toDomain(existing), created: false };

    try {
      const record = await prisma.invoice.create({
        data: {
          workOrder: { connect: { id: input.workOrderId } },
          subtotal: input.subtotal,
          gstAmount: input.gstAmount,
          grandTotal: input.grandTotal,
        },
        select: invoiceSelect,
      });
      return { invoice: toDomain(record), created: true };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const createdByConcurrentRequest = await prisma.invoice.findUnique({
          where: { workOrderId: input.workOrderId },
          select: invoiceSelect,
        });
        if (createdByConcurrentRequest) {
          return { invoice: toDomain(createdByConcurrentRequest), created: false };
        }
      }
      throw error;
    }
  }

  async findById(id: string): Promise<InvoiceWithRecipient | null> {
    const record = await prisma.invoice.findUnique({
      where: { id },
      select: invoiceSelect,
    });
    if (!record) return null;

    return {
      invoice: toDomain(record),
      recipientEmail: record.workOrder.customer.email,
    };
  }
}
