export type WorkOrderStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface CreateWorkOrderInput {
  customerId: string;
  service: string;
  quantity: number;
  unitPrice: number;
  serviceAddress: string;
  billingAddress: string;
  serviceDate: string;
  status: WorkOrderStatus;
}

export interface CreateWorkOrderRecord extends Omit<CreateWorkOrderInput, "unitPrice"> {
  unitPrice: string;
  totalAmount: string;
}

export interface WorkOrder {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  service: string;
  quantity: number;
  unitPrice: string;
  totalAmount: string;
  serviceAddress: string;
  billingAddress: string;
  serviceDate: string;
  status: WorkOrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type WorkOrderListItem = Pick<
  WorkOrder,
  "id" | "customerName" | "service" | "serviceDate" | "totalAmount" | "status"
>;

export interface WorkOrderPage {
  items: WorkOrderListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface WorkOrderRepository {
  create(input: CreateWorkOrderRecord): Promise<WorkOrder>;
  findPage(page: number, pageSize: number): Promise<WorkOrderPage>;
  updateStatus(id: string, status: WorkOrderStatus): Promise<WorkOrder>;
}

