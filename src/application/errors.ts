export class CustomerNotFoundError extends Error {
  constructor() {
    super("Customer not found");
    this.name = "CustomerNotFoundError";
  }
}

export class CustomerEmailConflictError extends Error {
  constructor() {
    super("A customer with this email already exists");
    this.name = "CustomerEmailConflictError";
  }
}

export class WorkOrderCustomerNotFoundError extends Error {
  constructor() {
    super("Selected customer not found");
    this.name = "WorkOrderCustomerNotFoundError";
  }
}

export class WorkOrderNotFoundError extends Error {
  constructor() {
    super("Work order not found");
    this.name = "WorkOrderNotFoundError";
  }
}

export class WorkOrderNotCompletedError extends Error {
  constructor() {
    super("An invoice can only be generated for a completed work order");
    this.name = "WorkOrderNotCompletedError";
  }
}

export class InvoiceNotFoundError extends Error {
  constructor() {
    super("Invoice not found");
    this.name = "InvoiceNotFoundError";
  }
}

export class InvoiceEmailConfigurationError extends Error {
  constructor() {
    super("Invoice email delivery is not configured");
    this.name = "InvoiceEmailConfigurationError";
  }
}

export class InvoiceEmailDeliveryError extends Error {
  constructor(
    readonly providerDetails?: { status?: number; code?: string; message?: string },
  ) {
    super("Invoice email could not be sent. Check the backend logs for the provider rejection reason.");
    this.name = "InvoiceEmailDeliveryError";
  }
}

export class CustomerHasWorkOrdersError extends Error {
  constructor() {
    super("Customer cannot be deleted while work orders are linked to it");
    this.name = "CustomerHasWorkOrdersError";
  }
}
