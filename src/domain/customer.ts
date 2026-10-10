export interface Customer {
  id: string;
  customerName: string;
  email: string;
  phoneNumber: string;
  customerAddress: string;
  billingAddress: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateCustomerInput = Omit<Customer, "id" | "createdAt" | "updatedAt">;
export type UpdateCustomerInput = Partial<CreateCustomerInput>;
export interface CustomerPage {
  items: Customer[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CustomerRepository {
  create(input: CreateCustomerInput): Promise<Customer>;
  findPage(page: number, pageSize: number): Promise<CustomerPage>;
  findById(id: string): Promise<Customer | null>;
  update(id: string, input: UpdateCustomerInput): Promise<Customer>;
  delete(id: string): Promise<void>;
}
