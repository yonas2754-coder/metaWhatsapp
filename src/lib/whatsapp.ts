// src/utils/whatsapp.ts
import axios from "axios";

const TOKEN = process.env.WHATSAPP_TOKEN!;
const PHONE_ID = process.env.PHONE_NUMBER_ID!;

const whatsappApi = axios.create({
  baseURL: `https://graph.facebook.com/v19.0/${PHONE_ID}`,
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
  },
});

// Send normal text messages
export async function sendMessage(to: string, text: string) {
  await whatsappApi.post("/messages", {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text },
  });
}

// Send structural interactive buttons (Looks like a clean UI menu)
export async function sendButtons(to: string, text: string, buttons: { id: string; title: string }[]) {
  await whatsappApi.post("/messages", {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: text },
      action: {
        buttons: buttons.map((btn) => ({
          type: "reply",
          reply: { id: btn.id, title: btn.title },
        })),
      },
    },
  });
}