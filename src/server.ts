import "dotenv/config";
import { createApp } from "./app.js";
import { prisma } from "./infrastructure/database/prisma.js";
import { PrismaCustomerRepository } from "./infrastructure/repositories/prisma-customer-repository.js";
import { PrismaWorkOrderRepository } from "./infrastructure/repositories/prisma-work-order-repository.js";
import { PrismaInvoiceRepository } from "./infrastructure/repositories/prisma-invoice-repository.js";
import { ResendInvoiceEmailSender } from "./infrastructure/email/resend-invoice-email-sender.js";

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be a valid TCP port");
}

const app = createApp(
  new PrismaCustomerRepository(),
  new PrismaWorkOrderRepository(),
  new PrismaInvoiceRepository(),
  new ResendInvoiceEmailSender(),
);
const server = app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`${signal} received; shutting down`);
  server.close(async (error) => {
    try {
      await prisma.$disconnect();
    } finally {
      if (error) {
        console.error("HTTP server shutdown failed", error);
        process.exitCode = 1;
      }
    }
  });
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
