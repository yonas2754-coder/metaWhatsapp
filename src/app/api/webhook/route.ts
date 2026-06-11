// src/app/api/webhook/route.ts
import { NextResponse } from "next/server";
import { ComplaintFlowManager } from "@/lib/complaint-flow-manager";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
    return new Response(challenge);
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message) return NextResponse.json({ ok: true });

    const from = message.from;
    let text = "";

    if (message.type === "text") {
      text = message.text?.body;
    } else if (message.type === "interactive") {
      text = message.interactive?.button_reply?.id;
    }

    if (!text) return NextResponse.json({ ok: true });

    const manager = new ComplaintFlowManager(from);
    await manager.handleMessage(text);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("⛔ [Enterprise Webhook Failure]:", error);
    return NextResponse.json({ ok: false, error: "Handled failure execution block" }, { status: 200 });
  }
}