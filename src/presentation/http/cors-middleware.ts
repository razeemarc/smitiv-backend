import type { RequestHandler } from "express";

const allowedMethods = "GET, POST, PATCH, DELETE, OPTIONS";
const allowedHeaders = "Content-Type, Idempotency-Key";

export function createCorsMiddleware(
  frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://localhost:3000",
): RequestHandler {
  return (request, response, next) => {
    const origin = request.get("Origin");
    response.vary("Origin");

    if (origin === frontendOrigin) {
      response.setHeader("Access-Control-Allow-Origin", frontendOrigin);
      response.setHeader("Access-Control-Allow-Methods", allowedMethods);
      response.setHeader("Access-Control-Allow-Headers", allowedHeaders);
      response.setHeader("Access-Control-Max-Age", "600");
    }

    if (request.method === "OPTIONS") {
      response.status(204).end();
      return;
    }

    next();
  };
}
