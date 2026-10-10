import { Prisma, type WorkOrder as PrismaWorkOrder } from "../../generated/prisma/client.js";
import { WorkOrderCustomerNotFoundError, WorkOrderNotFoundError } from "../../application/errors.js";
import type { CreateWorkOrderRecord, WorkOrder, WorkOrderListItem, WorkOrderPage, WorkOrderRepository, WorkOrderStatus } from "../../domain/work-order.js";
import { prisma } from "../database/prisma.js";

const workOrderSelect = {
  id: true,
  customerId: true,
  service: true,
  quantity: true,
  unitPrice: true,
  totalAmount: true,
  serviceAddress: true,
  billingAddress: true,
  serviceDate: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  customer: { select: { customerName: true, email: true } },
} satisfies Prisma.WorkOrderSelect;

const workOrderListSelect = {
  id: true,
  service: true,
  serviceDate: true,
  totalAmount: true,
  status: true,
  customer: { select: { customerName: true } },
} satisfies Prisma.WorkOrderSelect;

function toDomain(record: PrismaWorkOrder & { customer: { customerName: string; email: string } }): WorkOrder {
  return {
    id: record.id,
    customerId: record.customerId,
    customerName: record.customer.customerName,
    customerEmail: record.customer.email,
    service: record.service,
    quantity: record.quantity,
    unitPrice: record.unitPrice.toFixed(2),
    totalAmount: record.totalAmount.toFixed(2),
    serviceAddress: record.serviceAddress,
    billingAddress: record.billingAddress,
    serviceDate: record.serviceDate.toISOString().slice(0, 10),
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export class PrismaWorkOrderRepository implements WorkOrderRepository {
  async create(input: CreateWorkOrderRecord): Promise<WorkOrder> {
    try {
      const record = await prisma.workOrder.create({
        data: {
          customer: { connect: { id: input.customerId } },
          service: input.service,
          quantity: input.quantity,
          unitPrice: input.unitPrice,
          totalAmount: input.totalAmount,
          serviceAddress: input.serviceAddress,
          billingAddress: input.billingAddress,
          serviceDate: new Date(`${input.serviceDate}T00:00:00.000Z`),
          status: input.status,
        },
        select: workOrderSelect,
      });
      return toDomain(record);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new WorkOrderCustomerNotFoundError();
      }
      throw error;
    }
  }

  async findPage(page: number, pageSize: number): Promise<WorkOrderPage> {
    const [records, total] = await Promise.all([
      prisma.workOrder.findMany({
        select: workOrderListSelect,
        orderBy: [{ serviceDate: "asc" }, { id: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.workOrder.count(),
    ]);

    const items: WorkOrderListItem[] = records.map((record) => ({
      id: record.id,
      customerName: record.customer.customerName,
      service: record.service,
      serviceDate: record.serviceDate.toISOString().slice(0, 10),
      totalAmount: record.totalAmount.toFixed(2),
      status: record.status,
    }));

    return { items, total, page, pageSize };
  }

  async updateStatus(id: string, status: WorkOrderStatus): Promise<WorkOrder> {
    try {
      const record = await prisma.workOrder.update({
        where: { id },
        data: { status },
        select: workOrderSelect,
      });
      return toDomain(record);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new WorkOrderNotFoundError();
      }
      throw error;
    }
  }
}
