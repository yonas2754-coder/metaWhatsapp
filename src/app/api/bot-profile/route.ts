// src/app/api/bot-profile/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return NextResponse.json({ error: "Image URL is required" }, { status: 400 });
    }

    const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
    const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
    const API_VERSION = "v20.0";

    // 1. Fetch the target image as a binary buffer
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return NextResponse.json({ error: "Failed to fetch source asset image stream" }, { status: 400 });
    }
    const imageBuffer = await imageResponse.arrayBuffer();

    // 2. Upload the raw image bytes to Meta's Graph CDN media repository
    const uploadUrl = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/media`;
    
    const formData = new FormData();
    formData.append("messaging_product", "whatsapp");
    formData.append("file", new Blob([imageBuffer]), "profile.jpg");
    formData.append("type", "image/jpeg");

    const metaUploadResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
      },
      body: formData,
    });

    if (!metaUploadResponse.ok) {
      const err = await metaUploadResponse.json();
      console.error("Meta Media Upload Error:", err);
      return NextResponse.json({ error: "Failed uploading media asset to Meta CDN" }, { status: 500 });
    }

    const { id: mediaAssetHandleId } = await metaUploadResponse.json();

    // 3. Attach the generated Media Handle ID directly to your WhatsApp Business Profile
    const profileUrl = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/whatsapp_business_profile`;
    
    const metaProfileResponse = await fetch(profileUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        profile_picture_handle: mediaAssetHandleId, // Associates the uploaded image asset
      }),
    });

    if (!metaProfileResponse.ok) {
      const err = await metaProfileResponse.json();
      console.error("Meta Profile Update Error:", err);
      return NextResponse.json({ error: "Failed updating profile layout configurations" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Profile image synced successfully across Meta networks!" });
  } catch (error) {
    console.error("Critical Profile API Route Error:", error);
    return NextResponse.json({ error: "Internal processing layer breakdown" }, { status: 500 });
  }
}