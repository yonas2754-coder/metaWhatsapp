// src/lib/complaint-flow-manager.ts

import { Zone } from "@/generated/prisma/enums";
import { TaskClassification } from "@/generated/prisma/enums";
import { RequestType } from "@/generated/prisma/enums";
import { SpecificRequestType } from "@/generated/prisma/enums";

import { prisma } from "@/lib/prisma";
import { sendMessage, sendButtons } from "@/lib/whatsapp";

const CLASSIFICATION_OPTIONS = [
  { key: "1", enum: TaskClassification.TECHNICAL, label: "Technical Fault" },
  { key: "2", enum: TaskClassification.BILLING, label: "Billing & Invoicing" },
  { key: "3", enum: TaskClassification.PROVISIONING, label: "Service Provisioning" }
];

const REQUEST_TYPE_OPTIONS = [
  { key: "1", enum: RequestType.FAULT, label: "Report a Fault / Outage" },
  { key: "2", enum: RequestType.NEW_SERVICE, label: "Request New Installation" },
  { key: "3", enum: RequestType.MODIFICATION, label: "Modify Existing Line Account" }
];

const SPECIFIC_REQUEST_OPTIONS = [
  { key: "1", enum: SpecificRequestType.BROADBAND_DOWN, label: "Fixed Broadband Link Down" },
  { key: "2", enum: SpecificRequestType.FIBER_CUT, label: "Physical Fiber Line Cut / Drop" },
  { key: "3", enum: SpecificRequestType.INVOICE_DISPUTE, label: "Incorrect Balance / Bill Dispute" },
  { key: "4", enum: SpecificRequestType.SPEED_UPGRADE, label: "Bandwidth Speed Upgrade Query" }
];

const ZONE_OPTIONS = [
  { key: "1", enum: Zone.EAAZ, label: "East Addis Ababa Zone (EAAZ)" },
  { key: "2", enum: Zone.CAAZ, label: "Central Addis Ababa Zone (CAAZ)" },
  { key: "3", enum: Zone.SAAZ, label: "South Addis Ababa Zone (SAAZ)" },
  { key: "4", enum: Zone.NAAZ, label: "North Addis Ababa Zone (NAAZ)" },
  { key: "5", enum: Zone.SWAAZ, label: "South West Addis Ababa Zone (SWAAZ)" },
  { key: "6", enum: Zone.WAAZ, label: "West Addis Ababa Zone (WAAZ)" },
  { key: "7", enum: Zone.NR_Mekele, label: "North Region - Mekele" },
  { key: "8", enum: Zone.NWR_Bahirdar, label: "North West Region - Bahirdar" },
  { key: "9", enum: Zone.ER_Dire_Dawa, label: "East Region - Dire Dawa" },
  { key: "10", enum: Zone.CER_Harar, label: "Central East Region - Harar" },
  { key: "11", enum: Zone.CNR_D_Birhan, label: "Central North Region - Debre Birhan" },
  { key: "12", enum: Zone.WR_Nekempt, label: "West Region - Nekemte" },
  { key: "13", enum: Zone.SER_Adama, label: "South East Region - Adama" },
  { key: "14", enum: Zone.SR_Hawassa, label: "South Region - Hawassa" },
  { key: "15", enum: Zone.SWR_Jimma, label: "South West Region - Jimma" },
  { key: "16", enum: Zone.CWR_Ambo, label: "Central West Region - Ambo" },
  { key: "17", enum: Zone.EER_Jigiiga, label: "Eastern East Region - Jigjiga" },
  { key: "18", enum: Zone.NEER_Semera, label: "North Eastern East Region - Semera" },
  { key: "19", enum: Zone.NNWR_Gonder, label: "North North West Region - Gondar" },
  { key: "20", enum: Zone.NER_Dessie, label: "North East Region - Dessie" },
  { key: "21", enum: Zone.SWWR_Gambela, label: "South West West Region - Gambela" },
  { key: "22", enum: Zone.WWR_Assosa, label: "West West Region - Assosa" },
  { key: "23", enum: Zone.SSWR_Wolyta, label: "South South West Region - Wolaita" },
  { key: "24", enum: Zone.Bill_Section, label: "Billing Section" },
  { key: "25", enum: Zone.Enterprise_office, label: "Enterprise Office HQ" }
];

export class ComplaintFlowManager {
  private phone: string;

  constructor(phone: string) {
    this.phone = phone;
  }

  async handleMessage(text: string): Promise<void> {
    const sanitizedText = text.trim();
    const cleanLower = sanitizedText.toLowerCase();

    if (cleanLower === "summary" || sanitizedText === "ACTION_SUMMARY") {
      await this.sendSummaryData();
      return;
    }
    if (cleanLower === "cancel" || sanitizedText === "ACTION_CANCEL") {
      await this.resetSession("Ticket draft discarded successfully.");
      return;
    }

    const session = await this.getOrCreateSession();

    // Catch action triggers for generating shareable layout data copies
    if (sanitizedText.startsWith("SHARE_TICKET_")) {
      const targetTicketId = sanitizedText.replace("SHARE_TICKET_", "");
      const ticketToShare = await prisma.complaint.findUnique({
        where: { ticketNumber: targetTicketId }
      });

      if (!ticketToShare) {
        await sendMessage(this.phone, "❌ *Error:* Requested ticket log could not be generated for sharing.");
        return;
      }

      // Pre-format clean plain text message that will populate the destination conversation input box
      const shareContent = 
        `📋 *FORWARDED TICKET DATA*\n` +
        `---------------------------\n` +
        `🎫 *Ticket:* ${ticketToShare.ticketNumber}\n` +
        `📞 *Service Identifier:* ${ticketToShare.serviceNumber}\n` +
        `📊 *Classification:* ${ticketToShare.tasksClassification}\n` +
        `⚙️ *Type:* ${ticketToShare.requestType} ➔ ${ticketToShare.specificRequestType}\n` +
        `📍 *Operational Zone:* ${ticketToShare.zone}\n` +
        `📝 *Status:* [${ticketToShare.status}]\n` +
        `💬 *Remarks:* "${ticketToShare.remarks}"`;

      // Generate the native WhatsApp API contact-selection deep link
      const whatsappNativeShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareContent)}`;

      /**
       * Note: For interactive WhatsApp buttons to trigger an external Link Action, your underlying
       * WhatsApp channel engine handler (e.g., Baileys, Venom, or Official Cloud API) must configure 
       * the button payload as a URL type button. 
       * * If your client uses text action triggers exclusively, we supply the direct blue click link line 
       * below alongside the button so users can tap it to launch their native contacts list right away.
       */
      const instructionsMessage = 
        `${shareContent}\n\n` +
        `🔗 *Select Contact to Forward Ticket:*\n` +
        `${whatsappNativeShareUrl}\n\n` +
        `💡 _Tap the blue link above to open your WhatsApp contact list, pick a person, and send this ticket record directly!_`;

      await sendButtons(this.phone, instructionsMessage, [
        { id: "ACTION_SUMMARY", title: "📊 Main Dashboard" }
      ]);
      return;
    }

    switch (session.step) {
      case "IDLE":
        if (cleanLower.includes("complaint") || sanitizedText === "START_COMPLAINT") {
          await this.updateSession({ step: "AWAITING_SERVICE_NUM" });
          await sendButtons(
            this.phone,
            "📋 *New Service Ticket Request*\n\nPlease reply with your registered *Service Number* :",
            [{ id: "ACTION_CANCEL", title: "❌ Cancel Draft" }]
          );
        } else if (cleanLower.includes("find") || sanitizedText === "START_SEARCH") {
          await this.updateSession({ step: "AWAITING_SEARCH_SERVICE_NUM" });
          await sendButtons(
            this.phone,
            "🔍 *Find Complaints Dashboard*\n\nPlease type and reply with the *Service Number* to look up its historical log records:",
            [{ id: "ACTION_CANCEL", title: "❌ Back to Menu" }]
          );
        } else {
          await sendButtons(
            this.phone,
            "👋 *Welcome to the IP Service Support Portal*\n\nChoose an action below to manage or file your service tickets.",
            [
              { id: "START_COMPLAINT", title: "📝 File Complaint" },
              { id: "START_SEARCH", title: "🔍 Find Complaint" },
              { id: "ACTION_SUMMARY", title: "📊 View Summary" }
            ]
          );
        }
        break;

      case "AWAITING_SEARCH_SERVICE_NUM":
        if (sanitizedText.length < 4) {
          await sendMessage(this.phone, "❌ *Format Error.* The Service Number string is too short. Please try again:");
          return;
        }

        const foundComplaints = await prisma.complaint.findMany({
          where: { serviceNumber: sanitizedText },
          orderBy: { createdAt: "desc" }
        });

        await this.updateSession({ step: "IDLE" });

        if (foundComplaints.length === 0) {
          await sendButtons(
            this.phone,
            `🔍 *Search Results for:* "${sanitizedText}"\n\n❌ No historical complaints found in the database system for this service number string.`,
            [{ id: "START_COMPLAINT", title: "📝 File Complaint" }]
          );
        } else {
          let resultsMessage = `🔍 *Search Results for:* "${sanitizedText}"\nFound *${foundComplaints.length}* ticket log asset(s):\n`;

          foundComplaints.forEach((ticket, idx) => {
            const badge = ticket.status === "PENDING" ? "⏳" : "✅";
            resultsMessage += 
              `\n*${idx + 1}. Ticket Reference: ${ticket.ticketNumber}*\n` +
              ` • Status: ${badge} _${ticket.status}_\n` +
              ` • Classification: ${ticket.tasksClassification} ➔ ${ticket.specificRequestType}\n` +
              ` • Remarks: "${ticket.remarks}"\n`;
          });

          await sendButtons(this.phone, resultsMessage, [
            { id: "START_COMPLAINT", title: "📝 File Complaint" },
            { id: "ACTION_SUMMARY", title: "📊 Main Dashboard" }
          ]);
        }
        break;

      case "AWAITING_SERVICE_NUM":
        if (sanitizedText.length < 4) {
          await sendMessage(this.phone, "❌ *Format Error.* The Service Number string is too short. Please provide a valid identifier:");
          return;
        }

        await this.updateSession({ 
          step: "AWAITING_CLASS", 
          tempServiceNumber: sanitizedText 
        });

        const classMenu = CLASSIFICATION_OPTIONS.map(o => `*${o.key}*. ${o.label}`).join("\n");
        await sendButtons(
          this.phone,
          `✅ *Service Identifier Logged*\n\nSelect **Task Classification** (Reply with option number):\n\n${classMenu}`,
          [
            { id: "ACTION_SUMMARY", title: "📊 Current Summary" },
            { id: "ACTION_CANCEL", title: "❌ Cancel Ticket" }
          ]
        );
        break;

      case "AWAITING_CLASS":
        const selectedClass = CLASSIFICATION_OPTIONS.find(o => o.key === sanitizedText);
        if (!selectedClass) {
          await sendMessage(this.phone, "❌ *Selection Out of Bounds.* Reply with a number from the menu options provided.");
          return;
        }

        await this.updateSession({ 
          step: "AWAITING_REQ_TYPE", 
          tempTasksClassification: selectedClass.enum 
        });

        const typeMenu = REQUEST_TYPE_OPTIONS.map(o => `*${o.key}*. ${o.label}`).join("\n");
        await sendButtons(
          this.phone,
          `Select **Request Type** (Reply with option number):\n\n${typeMenu}`,
          [
            { id: "ACTION_SUMMARY", title: "📊 Current Summary" },
            { id: "ACTION_CANCEL", title: "❌ Cancel Ticket" }
          ]
        );
        break;

      case "AWAITING_REQ_TYPE":
        const selectedType = REQUEST_TYPE_OPTIONS.find(o => o.key === sanitizedText);
        if (!selectedType) {
          await sendMessage(this.phone, "❌ *Selection Out of Bounds.* Reply with a valid menu number option.");
          return;
        }

        await this.updateSession({ 
          step: "AWAITING_SPECIFIC", 
          tempRequestType: selectedType.enum 
        });

        const specificMenu = SPECIFIC_REQUEST_OPTIONS.map(o => `*${o.key}*. ${o.label}`).join("\n");
        await sendButtons(
          this.phone,
          `Select **Specific Request Type** (Reply with option number):\n\n${specificMenu}`,
          [
            { id: "ACTION_SUMMARY", title: "📊 Current Summary" },
            { id: "ACTION_CANCEL", title: "❌ Cancel Ticket" }
          ]
        );
        break;

      case "AWAITING_SPECIFIC":
        const selectedSpecific = SPECIFIC_REQUEST_OPTIONS.find(o => o.key === sanitizedText);
        if (!selectedSpecific) {
          await sendMessage(this.phone, "❌ *Selection Out of Bounds.* Reply with a valid selection number option.");
          return;
        }

        await this.updateSession({ 
          step: "AWAITING_ZONE", 
          tempSpecificRequestType: selectedSpecific.enum 
        });

        const zoneMenu = ZONE_OPTIONS.map(o => `*${o.key}*. ${o.label}`).join("\n");
        await sendButtons(
          this.phone,
          `Select **Operational Regional Zone** (Reply with option number):\n\n${zoneMenu}`,
          [
            { id: "ACTION_SUMMARY", title: "📊 Current Summary" },
            { id: "ACTION_CANCEL", title: "❌ Cancel Ticket" }
          ]
        );
        break;

      case "AWAITING_ZONE":
        const selectedZone = ZONE_OPTIONS.find(o => o.key === sanitizedText);
        if (!selectedZone) {
          await sendMessage(this.phone, "❌ *Unknown Zone Code.* Please select a numeric value between 1 and 25:");
          return;
        }

        await this.updateSession({ 
          step: "AWAITING_REMARKS", 
          tempZone: selectedZone.enum 
        });

        await sendButtons(
          this.phone,
          "Understood. Finally, type any **Specific Remarks / Detailed Descriptions** concerning this regional ticket entry:",
          [{ id: "ACTION_CANCEL", title: "❌ Cancel Ticket" }]
        );
        break;

      case "AWAITING_REMARKS":
        if (sanitizedText.length < 5) {
          await sendMessage(this.phone, "❌ *Remarks too brief.* Please supply deeper context for technical evaluation:");
          return;
        }

        const ticketId = `TK-${Date.now().toString().slice(-5)}-${Math.floor(100 + Math.random() * 900)}`;

        await prisma.$transaction([
          prisma.complaint.create({
            data: {
              ticketNumber: ticketId,
              phone: this.phone,
              serviceNumber: session.tempServiceNumber!,
              tasksClassification: session.tempTasksClassification as TaskClassification,
              requestType: session.tempRequestType as RequestType,
              specificRequestType: session.tempSpecificRequestType as SpecificRequestType,
              zone: session.tempZone as Zone,
              remarks: sanitizedText,
            },
          }),
          prisma.userSession.update({
            where: { phone: this.phone },
            data: { 
              step: "IDLE", 
              tempServiceNumber: { set: null },
              tempTasksClassification: { set: null },
              tempRequestType: { set: null },
              tempSpecificRequestType: { set: null },
              tempZone: { set: null }
            },
          }),
        ]);

        const localizedZoneLabel = ZONE_OPTIONS.find(o => o.enum === session.tempZone)?.label || session.tempZone;

        const receipt =
          `✅ *Service Complaint Dispatched*\n\n` +
          `🎫 *Ticket Code:* ${ticketId}\n` +
          `📞 *Service Identifier:* ${session.tempServiceNumber}\n` +
          `📊 *Classification:* ${session.tempTasksClassification}\n` +
          `⚙️ *Type:* ${session.tempRequestType} ➔ ${session.tempSpecificRequestType}\n` +
          `📍 *Dispatched Zone:* ${localizedZoneLabel}\n` +
          `📝 *Remarks:* "${sanitizedText}"`;

        await sendButtons(
          this.phone,
          receipt,
          [
            { id: `SHARE_TICKET_${ticketId}`, title: "🔗 Share Ticket" },
            { id: "ACTION_SUMMARY", title: "📊 Main Dashboard" }
          ]
        );
        break;

      default:
        await this.resetSession("Session data reset. Re-initializing.");
        break;
    }
  }

  private async sendSummaryData(): Promise<void> {
    const activeSession = await this.getOrCreateSession();
    const historicalTickets = await prisma.complaint.findMany({
      where: { phone: this.phone },
      orderBy: { createdAt: "desc" },
      take: 3,
    });

    let messagePayload = `📊 *IP Service Portal Account Summary Dashboard*\n\n`;

    if (activeSession.step !== "IDLE") {
      messagePayload += 
        `⏳ *In-Progress Draft Form:*\n` +
        `• Next Phase Needed: _${activeSession.step.replace("AWAITING_", "Entering ")}_\n` +
        `• Logged Service Number: _${activeSession.tempServiceNumber || "Pending input"}_\n` +
        `• Class Selection: _${activeSession.tempTasksClassification || "Pending select"}_\n` +
        `• Zone Targeted: _${activeSession.tempZone || "Pending select"}_\n\n`;
    }

    messagePayload += `📋 *Recent System Logs Submissions (${historicalTickets.length}):*\n`;

    if (historicalTickets.length === 0) {
      messagePayload += `_No existing ticket assets registered to this identifier line._`;
    } else {
      historicalTickets.forEach((ticket, idx) => {
        const badge = ticket.status === "PENDING" ? "⏳" : "✅";
        messagePayload += 
          `\n*${idx + 1}. Ticket Reference: ${ticket.ticketNumber}*\n` +
          ` • Status: ${badge} _${ticket.status}_\n` +
          ` • Service Line: ${ticket.serviceNumber}\n` +
          ` • Path: ${ticket.tasksClassification} ➔ ${ticket.specificRequestType}\n`;
      });
    }

    if (activeSession.step !== "IDLE") {
      await sendButtons(this.phone, messagePayload, [
        { id: "ACTION_CANCEL", title: "❌ Discard Draft" }
      ]);
    } else {
      await sendButtons(this.phone, messagePayload, [
        { id: "START_COMPLAINT", title: "📝 File Complaint" },
        { id: "START_SEARCH", title: "🔍 Find Complaint" }
      ]);
    }
  }

  private async getOrCreateSession() {
    let session = await prisma.userSession.findUnique({ where: { phone: this.phone } });
    if (!session) {
      session = await prisma.userSession.create({ data: { phone: this.phone, step: "IDLE" } });
    }
    return session;
  }

  private async updateSession(data: {
    step?: string;
    tempServiceNumber?: string | null;
    tempTasksClassification?: string | null;
    tempRequestType?: string | null;
    tempSpecificRequestType?: string | null;
    tempZone?: string | null;
  }) {
    return await prisma.userSession.update({
      where: { phone: this.phone },
      data: {
        step: data.step,
        tempServiceNumber: data.tempServiceNumber !== undefined ? { set: data.tempServiceNumber } : undefined,
        tempTasksClassification: data.tempTasksClassification !== undefined ? { set: data.tempTasksClassification } : undefined,
        tempRequestType: data.tempRequestType !== undefined ? { set: data.tempRequestType } : undefined,
        tempSpecificRequestType: data.tempSpecificRequestType !== undefined ? { set: data.tempSpecificRequestType } : undefined,
        tempZone: data.tempZone !== undefined ? { set: data.tempZone } : undefined,
      },
    });
  }

  private async resetSession(alertText: string): Promise<void> {
    await prisma.userSession.update({
      where: { phone: this.phone },
      data: { 
        step: "IDLE", 
        tempServiceNumber: { set: null },
        tempTasksClassification: { set: null },
        tempRequestType: { set: null },
        tempSpecificRequestType: { set: null },
        tempZone: { set: null }
      },
    });
    
    await sendButtons(
      this.phone,
      `🔄 ${alertText}\nReturned to main portal window menu.`,
      [{ id: "START_COMPLAINT", title: "📝 Start New Ticket" }]
    );
  }
}