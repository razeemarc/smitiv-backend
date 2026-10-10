import { Router } from "express";
import type { WorkOrderController } from "./work-order-controller.js";

export function createWorkOrderRouter(controller: WorkOrderController): Router {
  const router = Router();
  router.get("/", controller.list);
  router.post("/", controller.create);
  router.patch("/:id/status", controller.complete);
  return router;
}
