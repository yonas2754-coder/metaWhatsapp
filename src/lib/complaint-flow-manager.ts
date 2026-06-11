// src/lib/complaint-flow-manager.ts
import { RequestType, SpecificRequestType, TaskClassification, Zone } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { sendMessage } from "@/lib/whatsapp";

// HELPER DICTIONARIES FOR CLEAN LIST MENUS MAPPING
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

// Complete array of your exact required telecom deployment zones
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

    // Global Commands Check
    if (cleanLower === "summary" || cleanLower === "status") {
      await this.sendSummaryData();
      return;
    }
    if (cleanLower === "cancel" || cleanLower === "reset") {
      await this.resetSession("Ticket draft discarded successfully.");
      return;
    }

    const session = await this.getOrCreateSession();

    switch (session.step) {
      case "IDLE":
        if (cleanLower.includes("complaint") || sanitizedText === "START_COMPLAINT") {
          await this.updateSession({ step: "AWAITING_SERVICE_NUM" });
          await sendMessage(
            this.phone,
            "📋 *New Service Ticket Request*\n\nPlease reply with your *Service Number* (e.g., Landline, Fixed Data Circuit ID, or Mobile Ref):"
          );
        } else {
          await sendMessage(
            this.phone,
            "👋 *Welcome to the IP Service Support Portal*\n\n" +
              "• Reply *'complaint'* to log a structured service issue.\n" +
              "• Reply *'summary'* to access your system dashboard records.\n" +
              "• Reply *'cancel'* to terminate any active processing window."
          );
        }
        break;

      case "AWAITING_SERVICE_NUM":
        if (sanitizedText.length < 4) {
          await sendMessage(this.phone, "❌ *Invalid ID.* Please provide a complete valid Service Number string:");
          return;
        }

        await this.updateSession({ 
          step: "AWAITING_CLASS", 
          tempServiceNumber: sanitizedText 
        });

        const classMenu = CLASSIFICATION_OPTIONS.map(o => `*${o.key}*. ${o.label}`).join("\n");
        await sendMessage(this.phone, `Select **Task Classification** (Reply with the corresponding option number):\n\n${classMenu}`);
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
        await sendMessage(this.phone, `Select **Request Type** (Reply with the corresponding option number):\n\n${typeMenu}`);
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
        await sendMessage(this.phone, `Select **Specific Request Type** (Reply with the corresponding option number):\n\n${specificMenu}`);
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
        await sendMessage(this.phone, `Select **Operational Regional Zone** (Reply with the corresponding option number):\n\n${zoneMenu}`);
        break;

      case "AWAITING_ZONE":
        const selectedZone = ZONE_OPTIONS.find(o => o.key === sanitizedText);
        if (!selectedZone) {
          await sendMessage(this.phone, "❌ *Unknown Zone Code.* Please select a numeric value between 1 and 25 corresponding to your designated office asset:");
          return;
        }

        await this.updateSession({ 
          step: "AWAITING_REMARKS", 
          tempZone: selectedZone.enum 
        });

        await sendMessage(this.phone, "Understood. Finally, type any **Specific Remarks / Detailed Descriptions** concerning this regional ticket entry:");
        break;

      case "AWAITING_REMARKS":
        if (sanitizedText.length < 5) {
          await sendMessage(this.phone, "❌ *Remarks too brief.* Please supply deeper context for technical evaluation:");
          return;
        }

        const ticketId = `TK-${Date.now().toString().slice(-5)}-${Math.floor(100 + Math.random() * 900)}`;

        // Atomic Transaction Commit with strict variable type casting
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
          `✅ *Service Complaint Successfully Dispatched*\n\n` +
          `🎫 *Ticket Code:* ${ticketId}\n` +
          `📞 *Service Identifier:* ${session.tempServiceNumber}\n` +
          `📊 *Classification:* ${session.tempTasksClassification}\n` +
          `⚙️ *Type:* ${session.tempRequestType} ➔ ${session.tempSpecificRequestType}\n` +
          `📍 *Dispatched Zone:* ${localizedZoneLabel}\n` +
          `📝 *Remarks:* "${sanitizedText}"\n\n` +
          `This data layer payload has been submitted directly into Core Regional Systems routing infrastructure. Type *'summary'* to query status tracking logs.`;

        await sendMessage(this.phone, receipt);
        break;

      default:
        await this.resetSession("Session data reset. Please text *'complaint'* to re-initialize execution.");
        break;
    }
  }

  /**
   * Generates complete dynamic dashboard data strings for user phone view interface
   */
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
        `• Zone Targeted: _${activeSession.tempZone || "Pending select"}_\n` +
        `💡 _Type 'cancel' to dump this active workspace flow._\n\n`;
    }

    messagePayload += `📋 *Recent System Logs Submissions (${historicalTickets.length}):*\n`;

    if (historicalTickets.length === 0) {
      messagePayload += `_No existing ticket assets registered to this phone number identifier line._`;
    } else {
      historicalTickets.forEach((ticket, idx) => {
        const badge = ticket.status === "PENDING" ? "⏳" : "✅";
        messagePayload += 
          `\n*${idx + 1}. Ticket Reference: ${ticket.ticketNumber}*\n` +
          ` • Status: ${badge} _${ticket.status}_\n` +
          ` • Service Line: ${ticket.serviceNumber}\n` +
          ` • Zone: ${ticket.zone}\n` +
          ` • Path: ${ticket.tasksClassification} ➔ ${ticket.specificRequestType}\n` +
          ` • Remarks: "${ticket.remarks}"\n`;
      });
    }

    await sendMessage(this.phone, messagePayload);
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
    await sendMessage(this.phone, `🔄 ${alertText}\nReturned to main portal window menu.`);
  }
}