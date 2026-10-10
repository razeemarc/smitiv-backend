import type {
  CreateCustomerInput,
  Customer,
  CustomerPage,
  CustomerRepository,
  UpdateCustomerInput,
} from "../domain/customer.js";
import { CustomerNotFoundError } from "./errors.js";

export class CustomerService {
  constructor(private readonly customers: CustomerRepository) {}

  create(input: CreateCustomerInput): Promise<Customer> {
    return this.customers.create(input);
  }

  list(page: number, pageSize: number): Promise<CustomerPage> {
    return this.customers.findPage(page, pageSize);
  }

  async get(id: string): Promise<Customer> {
    const customer = await this.customers.findById(id);
    if (!customer) throw new CustomerNotFoundError();
    return customer;
  }

  update(id: string, input: UpdateCustomerInput): Promise<Customer> {
    return this.customers.update(id, input);
  }

  delete(id: string): Promise<void> {
    return this.customers.delete(id);
  }
}
