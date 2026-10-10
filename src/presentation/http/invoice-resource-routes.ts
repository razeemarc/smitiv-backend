import { Router } from "express";
import type { InvoiceController } from "./invoice-controller.js";

export function createInvoiceResourceRouter(controller: InvoiceController): Router {
  const router = Router();
  router.get("/", controller.list);
  router.get("/:invoiceId", controller.getById);
  router.post("/:invoiceId/send", controller.send);
  return router;
}
