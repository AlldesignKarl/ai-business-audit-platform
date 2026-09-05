import { NextRequest, NextResponse } from "next/server";
import { verifyUnsubscribeToken } from "@/lib/email/unsubscribe-token";
import { addToSuppressionList } from "@/lib/email/compliance";

/** Enlace público de baja (List-Unsubscribe). No requiere sesión — el token firmado es la autorización. */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Falta el parámetro token" }, { status: 400 });

  try {
    const payload = verifyUnsubscribeToken(token);
    await addToSuppressionList(payload.organizationId, payload.email, "UNSUBSCRIBED");
    return new NextResponse(
      "<html><body style='font-family:sans-serif;padding:40px;text-align:center'><h2>Baja confirmada</h2><p>No recibirás más comunicaciones de este remitente.</p></body></html>",
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  } catch {
    return NextResponse.json({ error: "Token inválido o caducado" }, { status: 400 });
  }
}
