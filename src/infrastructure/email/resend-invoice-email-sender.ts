import { InvoiceEmailConfigurationError, InvoiceEmailDeliveryError } from "../../application/errors.js";
import type { Invoice, InvoiceEmailSender } from "../../domain/invoice.js";

function escapeHtml(value: string): string {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return value.replace(/[&<>"']/g, (character) => entities[character]!);
}

function invoiceEmail(invoice: Invoice): { html: string; text: string } {
  const fields = [
    ["Invoice Number", invoice.invoiceNumber],
    ["Work Order ID", invoice.workOrderId],
    ["Customer Name", invoice.customerName],
    ["Customer Address", invoice.customerAddress],
    ["Billing Address", invoice.billingAddress],
    ["Service", invoice.service],
    ["Quantity", String(invoice.quantity)],
    ["Unit Price", `₹${invoice.unitPrice}`],
    ["Subtotal", `₹${invoice.subtotal}`],
    [`GST (${invoice.gstRate}%)`, `₹${invoice.gstAmount}`],
    ["Grand Total", `₹${invoice.grandTotal}`],
  ] as const;

  const html = `<h1>Invoice ${escapeHtml(invoice.invoiceNumber)}</h1><table><tbody>${fields
    .map(([label, value]) => `<tr><th style="text-align:left;padding:6px">${escapeHtml(label)}</th><td style="padding:6px">${escapeHtml(value)}</td></tr>`)
    .join("")}</tbody></table>`;
  const text = fields.map(([label, value]) => `${label}: ${value}`).join("\n");
  return { html, text };
}

export class ResendInvoiceEmailSender implements InvoiceEmailSender {
  async sendInvoice(to: string, invoice: Invoice, idempotencyKey?: string): Promise<string> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    if (!apiKey || !from) throw new InvoiceEmailConfigurationError();

    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };
    if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

    const { html, text } = invoiceEmail(invoice);
    let response: Response;
    try {
      response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers,
        body: JSON.stringify({
          from,
          to: [to],
          subject: `Invoice ${invoice.invoiceNumber}`,
          html,
          text,
        }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      console.error("Resend request failed", {
        cause: error instanceof Error ? error.name : "UnknownError",
      });
      throw new InvoiceEmailDeliveryError({
        code: "RESEND_NETWORK_ERROR",
        message: "The email provider could not be reached.",
      });
    }

    if (!response.ok) {
      const providerError = await response.json().catch(() => null) as unknown;
      const diagnostic = typeof providerError === "object" && providerError !== null
        ? providerError as { name?: unknown; message?: unknown }
        : {};
      const providerMessage = typeof diagnostic.message === "string"
        ? diagnostic.message.slice(0, 500)
          .replace(apiKey, "[redacted]")
          .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[email]")
        : "No provider message";
      const providerCode = typeof diagnostic.name === "string"
        ? diagnostic.name.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80)
        : "UnknownProviderError";
      const details = {
        status: response.status,
        code: providerCode,
        message: providerMessage,
      };
      console.error("Resend rejected invoice email", details);
      throw new InvoiceEmailDeliveryError(details);
    }
    try {
      const result: unknown = await response.json();
      if (typeof result === "object" && result !== null && "id" in result && typeof result.id === "string") {
        return result.id;
      }
    } catch {
      console.error("Resend returned an unreadable success response", { status: response.status });
      throw new InvoiceEmailDeliveryError();
    }
    console.error("Resend success response did not include an email ID", { status: response.status });
    throw new InvoiceEmailDeliveryError();
  }
}
