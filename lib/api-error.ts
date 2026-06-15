import { NextResponse } from "next/server";

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
}

export function internalErrorResponse(message = "Interner Serverfehler") {
  return NextResponse.json({ error: message }, { status: 500 });
}

export function handleRouteError(error: unknown, context: string): NextResponse {
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return unauthorizedResponse();
  }
  console.error(`[${context}]`, error);
  return internalErrorResponse();
}
