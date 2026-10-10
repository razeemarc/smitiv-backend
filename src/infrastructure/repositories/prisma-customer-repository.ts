import { Prisma, type Customer as PrismaCustomer } from "../../generated/prisma/client.js";
import { CustomerEmailConflictError, CustomerHasWorkOrdersError, CustomerNotFoundError } from "../../application/errors.js";
import type {
  CreateCustomerInput,
  Customer,
  CustomerPage,
  CustomerRepository,
  UpdateCustomerInput,
} from "../../domain/customer.js";
import { prisma } from "../database/prisma.js";

const customerSelect = {
  id: true,
  customerName: true,
  email: true,
  phoneNumber: true,
  customerAddress: true,
  billingAddress: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CustomerSelect;

function toDomain(customer: PrismaCustomer): Customer {
  return customer;
}

function mapPrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") throw new CustomerEmailConflictError();
    if (error.code === "P2025") throw new CustomerNotFoundError();
  }
  throw error;
}

export class PrismaCustomerRepository implements CustomerRepository {
  async create(input: CreateCustomerInput): Promise<Customer> {
    try {
      return toDomain(await prisma.customer.create({ data: input, select: customerSelect }));
    } catch (error) {
      return mapPrismaError(error);
    }
  }

  async findPage(page: number, pageSize: number): Promise<CustomerPage> {
    const [items, total] = await Promise.all([
      prisma.customer.findMany({
        select: customerSelect,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.customer.count(),
    ]);
    return { items: items.map(toDomain), total, page, pageSize };
  }

  async findById(id: string): Promise<Customer | null> {
    const customer = await prisma.customer.findUnique({ where: { id }, select: customerSelect });
    return customer ? toDomain(customer) : null;
  }

  async update(id: string, input: UpdateCustomerInput): Promise<Customer> {
    try {
      return toDomain(await prisma.customer.update({ where: { id }, data: input, select: customerSelect }));
    } catch (error) {
      return mapPrismaError(error);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await prisma.customer.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        throw new CustomerHasWorkOrdersError();
      }
      mapPrismaError(error);
    }
  }
}
