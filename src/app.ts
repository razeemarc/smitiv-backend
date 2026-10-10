import express from "express";
import swaggerUi from "swagger-ui-express";
import type { CustomerRepository } from "./domain/customer.js";
import type { InvoiceEmailSender, InvoiceRepository } from "./domain/invoice.js";
import type { WorkOrderRepository } from "./domain/work-order.js";
import { CustomerService } from "./application/customer-service.js";
import { InvoiceService } from "./application/invoice-service.js";
import { WorkOrderService } from "./application/work-order-service.js";
import { CustomerController } from "./presentation/http/customer-controller.js";
import { createCustomerRouter } from "./presentation/http/customer-routes.js";
import { WorkOrderController } from "./presentation/http/work-order-controller.js";
import { createWorkOrderRouter } from "./presentation/http/work-order-routes.js";
import { InvoiceController } from "./presentation/http/invoice-controller.js";
import { createInvoiceRouter } from "./presentation/http/invoice-routes.js";
import { createInvoiceResourceRouter } from "./presentation/http/invoice-resource-routes.js";
import { errorHandler, notFoundHandler } from "./presentation/http/error-middleware.js";
import { openApiDocument } from "./presentation/http/openapi.js";
import { createCorsMiddleware } from "./presentation/http/cors-middleware.js";

export function createApp(
  customerRepository: CustomerRepository,
  workOrderRepository: WorkOrderRepository,
  invoiceRepository: InvoiceRepository,
  invoiceEmailSender: InvoiceEmailSender,
) {
  const app = express();
  const customerController = new CustomerController(new CustomerService(customerRepository));
  const invoiceService = new InvoiceService(invoiceRepository, invoiceEmailSender);
  const workOrderController = new WorkOrderController(new WorkOrderService(workOrderRepository), invoiceService);
  const invoiceController = new InvoiceController(invoiceService);

  app.disable("x-powered-by");
  app.use(createCorsMiddleware());
  app.use(express.json({ limit: "1mb" }));
  app.get("/health", (_request, response) => response.status(200).json({ status: "ok" }));
  app.get("/api-docs.json", (_request, response) => response.json(openApiDocument));
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
  app.use("/api/v1/customers", createCustomerRouter(customerController));
  app.use("/api/v1/work-orders", createWorkOrderRouter(workOrderController));
  app.use("/api/v1/work-orders", createInvoiceRouter(invoiceController));
  app.use("/api/v1/invoices", createInvoiceResourceRouter(invoiceController));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
