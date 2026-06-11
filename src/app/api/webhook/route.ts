// src/app/api/webhook/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMessage } from "@/lib/whatsapp";

// META WEBHOOK VERIFICATION (Kept completely intact)
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

// INCOMING MESSAGES HANDLER (Rewritten as a Guided Form Box Step-by-Step Flow)
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message) return NextResponse.json({ ok: true });

    const from = message.from;
    
    // Extract text whether they typed it normally or clicked an interactive button reply
    let text = "";
    if (message.type === "text") {
      text = (message.text?.body || "").trim();
    } else if (message.type === "interactive") {
      text = (message.interactive?.button_reply?.id || "").trim();
    }

    // 1. Fetch or create the user's conversational form state from DB
    let session = await prisma.userSession.findUnique({
      where: { phone: from },
    });

    if (!session) {
      session = await prisma.userSession.create({
        data: { phone: from, step: "IDLE" },
      });
    }

    // 2. Form Box Logic (State Machine)
    switch (session.step) {
      case "IDLE":
        // Kick off process if they text "complaint" or reset
        if (text.toLowerCase().includes("complaint") || text === "START_COMPLAINT") {
          await prisma.userSession.update({
            where: { phone: from },
            data: { step: "AWAITING_TT" },
          });
          await sendMessage(
            from, 
            "📋 *New Complaint Submission*\n\nPlease reply with your *TT Number* (digits only):"
          );
        } else {
          // Send instructions to type 'complaint' or prompt them to initiate 
          await sendMessage(
            from,
            "👋 Welcome! To lodge a professional complaint securely, please reply with the word *'complaint'* to begin the form box setup."
          );
        }
        break;

      case "AWAITING_TT":
        // Extract only digits out of their entry to strip user typos
        const cleanTT = text.replace(/\D/g, "");
        
        if (!cleanTT) {
          await sendMessage(
            from, 
            "❌ Invalid input. Please reply with a valid numerical *TT Number*:"
          );
          return NextResponse.json({ ok: true });
        }

        await prisma.userSession.update({
          where: { phone: from },
          data: { 
            step: "AWAITING_NAME", 
            tempTtNumber: cleanTT 
          },
        });
        await sendMessage(from, "Thank you! Now, please reply with your *Full Name*:");
        break;

      case "AWAITING_NAME":
        if (text.length < 2) {
          await sendMessage(from, "❌ Please reply with a valid name registration text:");
          return NextResponse.json({ ok: true });
        }

        await prisma.userSession.update({
          where: { phone: from },
          data: { 
            step: "AWAITING_DESC", 
            tempName: text 
          },
        });
        await sendMessage(from, "Got it! Finally, please provide a short *Description* of your issue:");
        break;

      case "AWAITING_DESC":
        if (text.length < 5) {
          await sendMessage(from, "❌ Please explain your problem with more details:");
          return NextResponse.json({ ok: true });
        }

        const ticket = `TT-${Date.now()}`;

        // Commit finalized payload into your primary database model
        await prisma.complaint.create({
          data: {
            ticketNumber: ticket,
            phone: from,
            ttNumber: session.tempTtNumber!,
            name: session.tempName!,
            description: text,
          },
        });

        // Clean up the session state back to IDLE for future tickets
        await prisma.userSession.update({
          where: { phone: from },
          data: { 
            step: "IDLE", 
            tempTtNumber: null, 
            tempName: null 
          },
        });

        // Send a beautifully formatted summary receipt back to client chat
        const confirmationMessage = 
          `✅ *Complaint Registered Successfully!*\n\n` +
          `🎫 *Ticket:* ${ticket}\n` +
          `👤 *Name:* ${session.tempName}\n` +
          `🔢 *TT Number:* ${session.tempTtNumber}\n` +
          `📝 *Issue:* ${text}\n\n` +
          `Our technical service representatives are evaluating your submission.`;

        await sendMessage(from, confirmationMessage);
        break;

      default:
        // Resilience Fallback: Force clear session on any exceptions
        await prisma.userSession.update({
          where: { phone: from },
          data: { step: "IDLE" },
        });
        await sendMessage(from, "Session reset. Please text *'complaint'* to submit a ticket.");
        break;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook processing failure:", error);
    // Return 200 to WhatsApp even on error so Meta stops hitting your server repeatedly for retry
    return NextResponse.json({ ok: false, error: "Internal processing error" }, { status: 200 });
  }
}