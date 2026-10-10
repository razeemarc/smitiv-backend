import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

test("Prisma persists customer CRUD against an isolated PostgreSQL test database", { skip: !testDatabaseUrl }, async () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = testDatabaseUrl!;
  const [{ prisma }, { PrismaCustomerRepository }] = await Promise.all([
    import("../src/infrastructure/database/prisma.js"),
    import("../src/infrastructure/repositories/prisma-customer-repository.js"),
  ]);
  const repository = new PrismaCustomerRepository();
  const email = `customer-test-${randomUUID()}@example.com`;

  try {
    const created = await repository.create({
      customerName: "Test Customer",
      email,
      phoneNumber: "+1 415 555 0100",
      customerAddress: "Customer test address",
      billingAddress: "Billing test address",
    });
    assert.equal((await repository.findById(created.id))?.email, email);

    const page = await repository.findPage(1, 5);
    assert.ok(page.items.some((item) => item.id === created.id));
    assert.ok(page.total >= 1);

    const updated = await repository.update(created.id, { customerName: "Updated Test Customer" });
    assert.equal(updated.customerName, "Updated Test Customer");

    await repository.delete(created.id);
    assert.equal(await repository.findById(created.id), null);
  } finally {
    await prisma.customer.deleteMany({ where: { email } });
    await prisma.$disconnect();
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
  }
});
