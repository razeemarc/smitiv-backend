import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import {
  CustomerEmailConflictError,
  CustomerHasWorkOrdersError,
  CustomerNotFoundError,
  InvoiceEmailConfigurationError,
  InvoiceEmailDeliveryError,
  InvoiceNotFoundError,
  WorkOrderCustomerNotFoundError,
  WorkOrderNotCompletedError,
  WorkOrderNotFoundError,
} from "../../application/errors.js";

export const notFoundHandler: RequestHandler = (_request, response) => {
  response.status(404).json({
    error: { code: "NOT_FOUND", message: "The requested resource was not found" },
  });
};

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  if (error instanceof CustomerNotFoundError) {
    response.status(404).json({ error: { code: "CUSTOMER_NOT_FOUND", message: error.message } });
    return;
  }
  if (error instanceof CustomerEmailConflictError) {
    response.status(409).json({ error: { code: "CUSTOMER_EMAIL_CONFLICT", message: error.message } });
    return;
  }
  if (error instanceof CustomerHasWorkOrdersError) {
    response.status(409).json({ error: { code: "CUSTOMER_HAS_WORK_ORDERS", message: error.message } });
    return;
  }
  if (error instanceof WorkOrderCustomerNotFoundError) {
    response.status(404).json({ error: { code: "WORK_ORDER_CUSTOMER_NOT_FOUND", message: error.message } });
    return;
  }
  if (error instanceof WorkOrderNotFoundError) {
    response.status(404).json({ error: { code: "WORK_ORDER_NOT_FOUND", message: error.message } });
    return;
  }
  if (error instanceof WorkOrderNotCompletedError) {
    response.status(409).json({ error: { code: "WORK_ORDER_NOT_COMPLETED", message: error.message } });
    return;
  }
  if (error instanceof InvoiceNotFoundError) {
    response.status(404).json({ error: { code: "INVOICE_NOT_FOUND", message: error.message } });
    return;
  }
  if (error instanceof InvoiceEmailConfigurationError) {
    response.status(503).json({ error: { code: "EMAIL_SERVICE_NOT_CONFIGURED", message: error.message } });
    return;
  }
  if (error instanceof InvoiceEmailDeliveryError) {
    response.status(502).json({
      error: {
        code: "EMAIL_DELIVERY_FAILED",
        message: error.message,
        ...(error.providerDetails ? { provider: error.providerDetails } : {}),
      },
    });
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: error.issues.map((issue) => ({ path: issue.path.map(String), message: issue.message })),
      },
    });
    return;
  }

  if (error instanceof SyntaxError && "status" in error && error.status === 400) {
    response.status(400).json({ error: { code: "INVALID_JSON", message: "Request body contains invalid JSON" } });
    return;
  }

  console.error("Unhandled API error", error);
  response.status(500).json({ error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred" } });
};
