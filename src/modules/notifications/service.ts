import "server-only";

import nodemailer, { type Transporter } from "nodemailer";

import { applicationConfirmationHtml } from "@/emails/application-confirmation";
import { assessmentInvitationHtml, assessmentReminderHtml } from "@/emails/assessment-invitation";
import { assessmentOtpHtml } from "@/emails/assessment-otp";
import { teamInvitationHtml } from "@/emails/team-invitation";
import { connectToDatabase } from "@/lib/database";
import { Notification } from "@/models/notification.model";

let smtpTransporter: Transporter | null = null;

function getSmtp() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.replace(/\s+/g, "");
  const port = Number(process.env.SMTP_PORT ?? "465");

  if (!host || !user || !pass || !Number.isInteger(port) || port < 1 || port > 65_535) {
    return null;
  }

  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE.toLowerCase() === "true"
    : port === 465;
  const from = process.env.EMAIL_FROM?.trim() || `HirePilot AI <${user}>`;

  smtpTransporter ??= nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  return { client: smtpTransporter, from };
}

function failureMessage(error: unknown) {
  return error instanceof Error
    ? error.message.slice(0, 1_000)
    : "Unknown email error";
}

export async function deliverApplicationConfirmation(
  notificationId: string,
  data: {
    candidateName: string;
    jobTitle: string;
    organizationName: string;
    email: string;
    applicationId: string;
    organizationId: string;
  },
) {
  await connectToDatabase();
  const integration = getSmtp();
  const filter = {
    _id: notificationId,
    organizationId: data.organizationId,
    applicationId: data.applicationId,
  };

  if (!integration) {
    await Notification.updateOne(filter, {
      $set: { status: "failed", failureReason: "SMTP email is not configured." },
    });
    return;
  }

  try {
    const result = await integration.client.sendMail({
      from: integration.from,
      to: data.email,
      subject: `Application received — ${data.jobTitle}`,
      html: applicationConfirmationHtml(data),
      headers: {
        "X-HirePilot-Delivery-Key": `application-confirmation-${data.applicationId}`,
      },
    });
    await Notification.updateOne(filter, {
      $set: {
        status: "sent",
        providerMessageId: result.messageId,
        sentAt: new Date(),
      },
      $unset: { failureReason: 1 },
    });
  } catch (error) {
    await Notification.updateOne(filter, {
      $set: { status: "failed", failureReason: failureMessage(error) },
    });
  }
}

export async function deliverAssessmentInvitation(
  notificationId: string,
  data: {
    candidateName: string;
    assessmentTitle: string;
    jobTitle: string;
    organizationName: string;
    assessmentUrl: string;
    startDeadline: string;
    duration: number;
    email: string;
    applicationId: string;
    invitationId: string;
    organizationId: string;
    deliveryKey: string;
  },
) {
  await connectToDatabase();
  const integration = getSmtp();
  const filter = {
    _id: notificationId,
    organizationId: data.organizationId,
    assessmentInvitationId: data.invitationId,
  };

  if (!integration) {
    await Notification.updateOne(filter, {
      $set: { status: "failed", failureReason: "SMTP email is not configured." },
    });
    return;
  }

  try {
    const result = await integration.client.sendMail({
      from: integration.from,
      to: data.email,
      subject: `Assessment invitation — ${data.jobTitle}`,
      html: assessmentInvitationHtml(data),
      headers: {
        "X-HirePilot-Delivery-Key": `assessment-invitation-${data.invitationId}-${data.deliveryKey}`,
      },
    });
    await Notification.updateOne(filter, {
      $set: {
        status: "sent",
        providerMessageId: result.messageId,
        sentAt: new Date(),
      },
      $unset: { failureReason: 1 },
    });
  } catch (error) {
    await Notification.updateOne(filter, {
      $set: { status: "failed", failureReason: failureMessage(error) },
    });
  }
}

export async function deliverAssessmentReminder(
  notificationId: string,
  data: {
    candidateName: string;
    assessmentTitle: string;
    jobTitle: string;
    organizationName: string;
    assessmentUrl: string;
    startDeadline: string;
    email: string;
    invitationId: string;
    organizationId: string;
    reminderNumber: number;
  },
) {
  await connectToDatabase();
  const integration = getSmtp();
  const filter = {
    _id: notificationId,
    organizationId: data.organizationId,
    assessmentInvitationId: data.invitationId,
  };

  if (!integration) {
    await Notification.updateOne(filter, {
      $set: { status: "failed", failureReason: "SMTP email is not configured." },
    });
    return;
  }

  try {
    const result = await integration.client.sendMail({
      from: integration.from,
      to: data.email,
      subject: `Reminder: assessment for ${data.jobTitle}`,
      html: assessmentReminderHtml(data),
      headers: {
        "X-HirePilot-Delivery-Key": `assessment-reminder-${data.invitationId}-${data.reminderNumber}`,
      },
    });
    await Notification.updateOne(filter, {
      $set: {
        status: "sent",
        providerMessageId: result.messageId,
        sentAt: new Date(),
      },
      $unset: { failureReason: 1 },
    });
  } catch (error) {
    await Notification.updateOne(filter, {
      $set: { status: "failed", failureReason: failureMessage(error) },
    });
  }
}

export async function deliverAssessmentOtp(
  notificationId: string,
  data: {
    candidateName: string;
    organizationName: string;
    assessmentTitle: string;
    code: string;
    email: string;
    invitationId: string;
    organizationId: string;
    requestNumber: number;
  },
) {
  await connectToDatabase();
  const integration = getSmtp();
  const filter = {
    _id: notificationId,
    organizationId: data.organizationId,
    assessmentInvitationId: data.invitationId,
  };

  if (!integration) {
    await Notification.updateOne(filter, {
      $set: { status: "failed", failureReason: "SMTP email is not configured." },
    });
    return;
  }

  try {
    const result = await integration.client.sendMail({
      from: integration.from,
      to: data.email,
      subject: `Your HirePilot verification code: ${data.code}`,
      html: assessmentOtpHtml(data),
      headers: {
        "X-HirePilot-Delivery-Key": `assessment-otp-${data.invitationId}-${data.requestNumber}`,
      },
    });
    await Notification.updateOne(filter, {
      $set: {
        status: "sent",
        providerMessageId: result.messageId,
        sentAt: new Date(),
      },
      $unset: { failureReason: 1 },
    });
  } catch (error) {
    await Notification.updateOne(filter, {
      $set: { status: "failed", failureReason: failureMessage(error) },
    });
  }
}

export async function deliverTeamInvitation(
  notificationId: string,
  data: {
    inviterName: string;
    organizationName: string;
    role: string;
    acceptUrl: string;
    email: string;
    invitationId: string;
    organizationId: string;
    deliveryKey: string;
  },
) {
  await connectToDatabase();
  const integration = getSmtp();
  const filter = {
    _id: notificationId,
    organizationId: data.organizationId,
    teamInvitationId: data.invitationId,
  };

  if (!integration) {
    await Notification.updateOne(filter, {
      $set: { status: "failed", failureReason: "SMTP email is not configured." },
    });
    return;
  }

  try {
    const result = await integration.client.sendMail({
      from: integration.from,
      to: data.email,
      subject: `Join ${data.organizationName} on HirePilot`,
      html: teamInvitationHtml(data),
      headers: {
        "X-HirePilot-Delivery-Key": `team-invitation-${data.invitationId}-${data.deliveryKey}`,
      },
    });
    await Notification.updateOne(filter, {
      $set: {
        status: "sent",
        providerMessageId: result.messageId,
        sentAt: new Date(),
      },
      $unset: { failureReason: 1 },
    });
  } catch (error) {
    await Notification.updateOne(filter, {
      $set: { status: "failed", failureReason: failureMessage(error) },
    });
  }
}
