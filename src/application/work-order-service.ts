import type {
  CreateWorkOrderInput,
  WorkOrder,
  WorkOrderPage,
  WorkOrderRepository,
  WorkOrderStatus,
} from "../domain/work-order.js";

function formatCents(cents: bigint): string {
  return `${cents / 100n}.${(cents % 100n).toString().padStart(2, "0")}`;
}

export class WorkOrderService {
  constructor(private readonly workOrders: WorkOrderRepository) {}

  create(input: CreateWorkOrderInput): Promise<WorkOrder> {
    const unitPriceCents = BigInt(Math.round(input.unitPrice * 100));
    const totalAmountCents = unitPriceCents * BigInt(input.quantity);

    return this.workOrders.create({
      ...input,
      unitPrice: formatCents(unitPriceCents),
      totalAmount: formatCents(totalAmountCents),
    });
  }

  list(page: number, pageSize: number): Promise<WorkOrderPage> {
    return this.workOrders.findPage(page, pageSize);
  }

  updateStatus(id: string, status: WorkOrderStatus): Promise<WorkOrder> {
    return this.workOrders.updateStatus(id, status);
  }
}
