import { Router } from "express";
import type { InvoiceController } from "./invoice-controller.js";

export function createInvoiceRouter(controller: InvoiceController): Router {
  const router = Router();
  router.post("/:id/invoice", controller.generate);
  return router;
}
