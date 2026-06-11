// src/lib/whatsapp.ts

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const API_VERSION = "v20.0";

// Updated interface to optionally support URL payload items
interface ReplyButton {
  id?: string;
  title: string;
  url?: string;
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

  // Check if any item in the button payload contains a URL indicator action
  const targetUrlButton = buttons.find((btn) => btn.url);

  if (targetUrlButton) {
    /**
     * NOTE: Meta Cloud API requires a dynamic template for CTA URLs.
     * Before using this block, register a template in your Meta Developer Console:
     * - Name: ticket_share_cta
     * - Category: UTILITY
     * - Body text: {{1}}
     * - Buttons: Call to Action -> Visit Website -> URL Type: Dynamic -> Value: https://api.whatsapp.com/send?text={{2}}
     */
    const encodedPayloadText = targetUrlButton.url ? targetUrlButton.url.split("text=")[1] || "" : "";

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
          type: "template",
          template: {
            name: "ticket_share_cta",
            language: { code: "en" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: text } // Replaces custom message block body variable {{1}}
                ]
              },
              {
                type: "button",
                sub_type: "url",
                index: "0",
                parameters: [
                  { type: "text", text: decodeURIComponent(encodedPayloadText) } // Appends to base URL string parameter {{2}}
                ]
              }
            ]
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ WhatsApp Template CTA API Transport Error:", JSON.stringify(errorData));
        return false;
      }
      return true;
    } catch (error) {
      console.error("⛔ WhatsApp Template CTA Network Failure:", error);
      return false;
    }
  }

  // Fallback to traditional native Interactive Quick Reply Buttons if no link actions are detected
  const sanitizedButtons = buttons.slice(0, 3).map((btn) => ({
    type: "reply",
    reply: {
      id: btn.id || `ACTION_${btn.title.toUpperCase().replace(/\s+/g, "_")}`,
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