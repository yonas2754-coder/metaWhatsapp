// src/lib/whatsapp.ts

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const API_VERSION = "v20.0";

interface ReplyButton {
  id: string;
  title: string;
}

export async function sendMessage(to: string, text: string): Promise<boolean> {
  const url = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "text",
        text: { preview_url: false, body: text },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ WhatsApp Text API Transport Error:", JSON.stringify(errorData));
      return false;
    }
    return true;
  } catch (error) {
    console.error("⛔ WhatsApp Service Network Failure:", error);
    return false;
  }
}

export async function sendButtons(to: string, text: string, buttons: ReplyButton[]): Promise<boolean> {
  const url = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`;
  const sanitizedButtons = buttons.slice(0, 3).map((btn) => ({
    type: "reply",
    reply: {
      id: btn.id,
      title: btn.title.substring(0, 20),
    },
  }));

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: text },
          action: { buttons: sanitizedButtons },
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ WhatsApp Buttons API Transport Error:", JSON.stringify(errorData));
      return false;
    }
    return true;
  } catch (error) {
    console.error("⛔ WhatsApp Buttons Network Failure:", error);
    return false;
  }
}