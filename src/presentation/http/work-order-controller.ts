import type { Request, Response } from "express";
import type { WorkOrderService } from "../../application/work-order-service.js";
import type { InvoiceService } from "../../application/invoice-service.js";
import {
  completeWorkOrderSchema,
  createWorkOrderSchema,
  listWorkOrdersQuerySchema,
  workOrderIdSchema,
} from "./work-order-schemas.js";

export class WorkOrderController {
  constructor(
    private readonly workOrders: WorkOrderService,
    private readonly invoices: InvoiceService,
  ) {}

  create = async (request: Request, response: Response): Promise<void> => {
    const input = createWorkOrderSchema.parse(request.body);
    const workOrder = await this.workOrders.create(input);
    response.status(201).json({ data: workOrder });
  };

  list = async (request: Request, response: Response): Promise<void> => {
    const { page, pageSize } = listWorkOrdersQuerySchema.parse(request.query);
    const result = await this.workOrders.list(page, pageSize);
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

  complete = async (request: Request, response: Response): Promise<void> => {
    const { id } = workOrderIdSchema.parse(request.params);
    const { status } = completeWorkOrderSchema.parse(request.body);
    const workOrder = await this.workOrders.updateStatus(id, status);
    const { invoice } = await this.invoices.generateForWorkOrder(id);
    response.status(200).json({ data: workOrder, invoice });
  };
}
