import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMessage } from "@/lib/whatsapp";
import { parseTT } from "@/lib/parser";

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
  const body = await req.json();

  const message =
    body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

  if (!message) return NextResponse.json({ ok: true });

  const from = message.from;
  const text = message.text?.body || "";

  const parsed = parseTT(text);

  if (!parsed) {
    await sendMessage(from, "❌ Invalid TT format. Use: TT:123 name:John desc:issue");
    return NextResponse.json({ ok: true });
  }

  const ticket = `TT-${Date.now()}`;

  await prisma.complaint.create({
    data: {
      ticketNumber: ticket,
      phone: from,
      ttNumber: parsed.ttNumber,
      name: parsed.name,
      description: parsed.description,
    },
  });

  await sendMessage(
    from,
    `✅ Thank you for registration\n\nTicket: ${ticket}`
  );

  return NextResponse.json({ ok: true });
}