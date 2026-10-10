import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
import { CustomerService } from "../src/application/customer-service.js";
import { CustomerEmailConflictError, CustomerNotFoundError } from "../src/application/errors.js";
import type {
  CreateCustomerInput,
  Customer,
  CustomerPage,
  CustomerRepository,
  UpdateCustomerInput,
} from "../src/domain/customer.js";
import { createApp } from "../src/app.js";
import { CustomerController } from "../src/presentation/http/customer-controller.js";
import { createCustomerRouter } from "../src/presentation/http/customer-routes.js";
import { errorHandler } from "../src/presentation/http/error-middleware.js";
import { openApiDocument } from "../src/presentation/http/openapi.js";

const customerId = "4d6b00d5-10c7-4ad4-8e88-6e74dfc775ec";
const secondId = "a86fbb70-cd9c-44a0-9b3a-86c2a1f33d63";
const validInput: CreateCustomerInput = {
  customerName: "Ada Lovelace",
  email: "ada@example.com",
  phoneNumber: "+1 (415) 555-0100",
  customerAddress: "12 Analytical Engine Lane",
  billingAddress: "PO Box 1",
};

class MemoryCustomerRepository implements CustomerRepository {
  private customers: Customer[] = [];
  failOnFind = false;

  async create(input: CreateCustomerInput): Promise<Customer> {
    if (this.customers.some((customer) => customer.email === input.email)) throw new CustomerEmailConflictError();
    const now = new Date();
    const customer = { ...input, id: customerId, createdAt: now, updatedAt: now };
    this.customers.push(customer);
    return customer;
  }

  async findPage(page: number, pageSize: number): Promise<CustomerPage> {
    const start = (page - 1) * pageSize;
    return { items: this.customers.slice(start, start + pageSize), total: this.customers.length, page, pageSize };
  }

  async findById(id: string): Promise<Customer | null> {
    if (this.failOnFind) throw new Error("sensitive database detail");
    return this.customers.find((customer) => customer.id === id) ?? null;
  }

  async update(id: string, input: UpdateCustomerInput): Promise<Customer> {
    const index = this.customers.findIndex((customer) => customer.id === id);
    if (index === -1) throw new CustomerNotFoundError();
    if (input.email && this.customers.some((customer) => customer.id !== id && customer.email === input.email)) {
      throw new CustomerEmailConflictError();
    }
    const existing = this.customers[index]!;
    const updated = { ...existing, ...input, updatedAt: new Date() };
    this.customers[index] = updated;
    return updated;
  }

  async delete(id: string): Promise<void> {
    const index = this.customers.findIndex((customer) => customer.id === id);
    if (index === -1) throw new CustomerNotFoundError();
    this.customers.splice(index, 1);
  }
}

class MockResponse {
  statusCode = 200;
  body: unknown;
  ended = false;
  status(code: number): this { this.statusCode = code; return this; }
  json(body: unknown): this { this.body = body; return this; }
  end(): this { this.ended = true; return this; }
}

function request(value: Partial<Request>): Request {
  return value as Request;
}

function createController(repository = new MemoryCustomerRepository()) {
  return { controller: new CustomerController(new CustomerService(repository)), repository };
}

async function invoke(handler: (req: Request, res: Response) => Promise<void>, req: Partial<Request>) {
  const response = new MockResponse();
  await handler(request(req), response as unknown as Response);
  return response;
}

test("customer create, list, get, patch, and delete handlers work", async () => {
  const { controller } = createController();
  const createdResponse = await invoke(controller.create, { body: validInput });
  assert.equal(createdResponse.statusCode, 201);
  const created = (createdResponse.body as { data: Customer }).data;
  assert.equal(created.email, validInput.email);

  const listResponse = await invoke(controller.list, { query: { page: "1", pageSize: "1" } as never });
  assert.equal(listResponse.statusCode, 200);
  const list = listResponse.body as { data: Customer[]; pagination: { total: number; pageSize: number } };
  assert.equal(list.data.length, 1);
  assert.equal(list.pagination.total, 1);
  assert.equal(list.pagination.pageSize, 1);

  assert.equal((await invoke(controller.get, { params: { id: customerId } as never })).statusCode, 200);
  const updateResponse = await invoke(controller.update, {
    params: { id: customerId } as never,
    body: { customerName: "Ada Byron" },
  });
  assert.equal(updateResponse.statusCode, 200);
  assert.equal((updateResponse.body as { data: Customer }).data.customerName, "Ada Byron");

  const deleted = await invoke(controller.delete, { params: { id: customerId } as never });
  assert.equal(deleted.statusCode, 204);
  assert.equal(deleted.ended, true);
  await assert.rejects(() => controller.get(request({ params: { id: customerId } as never }), new MockResponse() as unknown as Response), CustomerNotFoundError);
});

test("invalid fields, malformed IDs, pagination, and empty updates are rejected", async () => {
  const { controller } = createController();
  await assert.rejects(
    () => invoke(controller.create, { body: { ...validInput, email: "not-an-email", phoneNumber: "123" } }),
    { name: "ZodError" },
  );
  await assert.rejects(() => invoke(controller.get, { params: { id: "not-a-uuid" } as never }), { name: "ZodError" });
  await assert.rejects(() => invoke(controller.list, { query: { pageSize: "101" } as never }), { name: "ZodError" });
  await assert.rejects(
    () => invoke(controller.update, { params: { id: customerId } as never, body: {} }),
    { name: "ZodError" },
  );
});

test("duplicate email and missing customer errors map to common responses", async () => {
  const { controller } = createController();
  await invoke(controller.create, { body: validInput });
  await assert.rejects(() => controller.create(request({ body: validInput }), new MockResponse() as unknown as Response), CustomerEmailConflictError);
  await assert.rejects(() => controller.get(request({ params: { id: secondId } as never }), new MockResponse() as unknown as Response), CustomerNotFoundError);

  const response = new MockResponse();
  errorHandler(new CustomerEmailConflictError(), request({}), response as unknown as Response, () => undefined);
  assert.equal(response.statusCode, 409);
  assert.equal((response.body as { error: { code: string } }).error.code, "CUSTOMER_EMAIL_CONFLICT");
});

test("unexpected errors use a generic response without revealing details", async () => {
  const { controller, repository } = createController();
  repository.failOnFind = true;
  await assert.rejects(() => controller.get(request({ params: { id: customerId } as never }), new MockResponse() as unknown as Response), /sensitive database detail/);

  const response = new MockResponse();
  const originalConsoleError = console.error;
  console.error = () => undefined;
  try {
    errorHandler(new Error("sensitive database detail"), request({}), response as unknown as Response, () => undefined);
  } finally {
    console.error = originalConsoleError;
  }
  assert.equal(response.statusCode, 500);
  assert.doesNotMatch(JSON.stringify(response.body), /sensitive database detail/);
});

test("customer routes and OpenAPI describe all CRUD endpoints", () => {
  const { controller, repository } = createController();
  const router = createCustomerRouter(controller);
  const routeMethods = router.stack.map((layer) => Object.keys((layer as unknown as { route?: { methods?: Record<string, boolean> } }).route?.methods ?? {})[0]);
  assert.deepEqual(routeMethods, ["post", "get", "get", "patch", "delete"]);

  const paths = openApiDocument.paths as Record<string, Record<string, unknown>>;
  assert.deepEqual(Object.keys(paths["/api/v1/customers"]!), ["post", "get"]);
  assert.deepEqual(Object.keys(paths["/api/v1/customers/{id}"]!), ["get", "patch", "delete"]);

  const unusedWorkOrderRepository = {
    create: async () => { throw new Error("Work order repository is not used here"); },
    findPage: async () => { throw new Error("Work order repository is not used here"); },
    updateStatus: async () => { throw new Error("Work order repository is not used here"); },
  };
  const unusedInvoiceRepository = {
    findWorkOrderSource: async () => null,
    createOrGet: async () => { throw new Error("Invoice repository is not used here"); },
    findById: async () => null,
  };
  const unusedInvoiceEmailSender = {
    sendInvoice: async () => "email-id",
  };
  const app = createApp(repository, unusedWorkOrderRepository, unusedInvoiceRepository, unusedInvoiceEmailSender);
  assert.ok(app.router.stack.some((layer) => layer.route?.path === "/api-docs.json"));
  assert.ok(app.router.stack.some((layer) => layer.name === "router"));
});
