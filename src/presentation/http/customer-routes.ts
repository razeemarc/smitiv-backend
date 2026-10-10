import { Router } from "express";
import type { CustomerController } from "./customer-controller.js";

export function createCustomerRouter(controller: CustomerController): Router {
  const router = Router();
  router.post("/", controller.create);
  router.get("/", controller.list);
  router.get("/:id", controller.get);
  router.patch("/:id", controller.update);
  router.delete("/:id", controller.delete);
  return router;
}
