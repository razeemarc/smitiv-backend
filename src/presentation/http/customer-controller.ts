import type { Request, Response } from "express";
import type { CustomerService } from "../../application/customer-service.js";
import type { UpdateCustomerInput } from "../../domain/customer.js";
import {
  createCustomerSchema,
  customerIdSchema,
  listCustomersQuerySchema,
  updateCustomerSchema,
} from "./customer-schemas.js";

export class CustomerController {
  constructor(private readonly customers: CustomerService) {}

  create = async (request: Request, response: Response): Promise<void> => {
    const input = createCustomerSchema.parse(request.body);
    const customer = await this.customers.create(input);
    response.status(201).json({ data: customer });
  };

  list = async (request: Request, response: Response): Promise<void> => {
    const { page, pageSize } = listCustomersQuerySchema.parse(request.query);
    const result = await this.customers.list(page, pageSize);
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

  get = async (request: Request, response: Response): Promise<void> => {
    const { id } = customerIdSchema.parse(request.params);
    const customer = await this.customers.get(id);
    response.status(200).json({ data: customer });
  };

  update = async (request: Request, response: Response): Promise<void> => {
    const { id } = customerIdSchema.parse(request.params);
    const parsed = updateCustomerSchema.parse(request.body);
    const input = Object.fromEntries(Object.entries(parsed).filter(([, value]) => value !== undefined)) as UpdateCustomerInput;
    const customer = await this.customers.update(id, input);
    response.status(200).json({ data: customer });
  };

  delete = async (request: Request, response: Response): Promise<void> => {
    const { id } = customerIdSchema.parse(request.params);
    await this.customers.delete(id);
    response.status(204).end();
  };
}
