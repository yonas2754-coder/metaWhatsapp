import axios from "axios";

const TOKEN = process.env.WHATSAPP_TOKEN!;
const PHONE_ID = process.env.PHONE_NUMBER_ID!;

export async function sendMessage(to: string, text: string) {
  await axios.post(
    `https://graph.facebook.com/v19.0/${PHONE_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    },
    {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
}