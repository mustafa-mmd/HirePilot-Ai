import "server-only";

import { Resend } from "resend";

import { applicationConfirmationHtml } from "@/emails/application-confirmation";
import { assessmentInvitationHtml, assessmentReminderHtml } from "@/emails/assessment-invitation";
import { assessmentOtpHtml } from "@/emails/assessment-otp";
import { teamInvitationHtml } from "@/emails/team-invitation";
import { connectToDatabase } from "@/lib/database";
import { Notification } from "@/models/notification.model";

let resend: Resend | null = null;

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return null;
  resend ??= new Resend(apiKey);
  return { client: resend, from };
}

export async function deliverApplicationConfirmation(notificationId: string, data: { candidateName: string; jobTitle: string; organizationName: string; email: string; applicationId: string; organizationId: string }) {
  await connectToDatabase();
  const integration = getResend();
  if (!integration) {
    await Notification.updateOne({ _id: notificationId, organizationId: data.organizationId, applicationId: data.applicationId, status: "pending" }, { $set: { status: "failed", failureReason: "Resend is not configured." } });
    return;
  }
  try {
    const result = await integration.client.emails.send(
      { from: integration.from, to: data.email, subject: `Application received — ${data.jobTitle}`, html: applicationConfirmationHtml(data) },
      { headers: { "Idempotency-Key": `application-confirmation-${data.applicationId}` } },
    );
    if (result.error) throw new Error(result.error.message);
    await Notification.updateOne({ _id: notificationId, organizationId: data.organizationId, applicationId: data.applicationId }, { $set: { status: "sent", providerMessageId: result.data?.id, sentAt: new Date() }, $unset: { failureReason: 1 } });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1_000) : "Unknown email error";
    await Notification.updateOne({ _id: notificationId, organizationId: data.organizationId, applicationId: data.applicationId }, { $set: { status: "failed", failureReason: message } });
  }
}

export async function deliverAssessmentInvitation(notificationId: string, data: { candidateName: string; assessmentTitle: string; jobTitle: string; organizationName: string; assessmentUrl: string; startDeadline: string; duration: number; email: string; applicationId: string; invitationId: string; organizationId: string; deliveryKey: string }) {
  await connectToDatabase();
  const integration = getResend();
  if (!integration) {
    await Notification.updateOne({ _id: notificationId, organizationId: data.organizationId, assessmentInvitationId: data.invitationId, status: "pending" }, { $set: { status: "failed", failureReason: "Resend is not configured." } });
    return;
  }
  try {
    const result = await integration.client.emails.send(
      { from: integration.from, to: data.email, subject: `Assessment invitation — ${data.jobTitle}`, html: assessmentInvitationHtml(data) },
      { headers: { "Idempotency-Key": `assessment-invitation-${data.invitationId}-${data.deliveryKey}` } },
    );
    if (result.error) throw new Error(result.error.message);
    await Notification.updateOne({ _id: notificationId, organizationId: data.organizationId, assessmentInvitationId: data.invitationId }, { $set: { status: "sent", providerMessageId: result.data?.id, sentAt: new Date() }, $unset: { failureReason: 1 } });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1_000) : "Unknown email error";
    await Notification.updateOne({ _id: notificationId, organizationId: data.organizationId, assessmentInvitationId: data.invitationId }, { $set: { status: "failed", failureReason: message } });
  }
}

export async function deliverAssessmentReminder(notificationId: string, data: { candidateName: string; assessmentTitle: string; jobTitle: string; organizationName: string; startDeadline: string; email: string; invitationId: string; organizationId: string; reminderNumber: number }) {
  await connectToDatabase();
  const integration = getResend();
  if (!integration) {
    await Notification.updateOne({ _id: notificationId, organizationId: data.organizationId, assessmentInvitationId: data.invitationId }, { $set: { status: "failed", failureReason: "Resend is not configured." } });
    return;
  }
  try {
    const result = await integration.client.emails.send(
      { from: integration.from, to: data.email, subject: `Reminder: assessment for ${data.jobTitle}`, html: assessmentReminderHtml(data) },
      { headers: { "Idempotency-Key": `assessment-reminder-${data.invitationId}-${data.reminderNumber}` } },
    );
    if (result.error) throw new Error(result.error.message);
    await Notification.updateOne({ _id: notificationId, organizationId: data.organizationId, assessmentInvitationId: data.invitationId }, { $set: { status: "sent", providerMessageId: result.data?.id, sentAt: new Date() }, $unset: { failureReason: 1 } });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1_000) : "Unknown email error";
    await Notification.updateOne({ _id: notificationId, organizationId: data.organizationId, assessmentInvitationId: data.invitationId }, { $set: { status: "failed", failureReason: message } });
  }
}

export async function deliverAssessmentOtp(notificationId: string, data: { candidateName: string; organizationName: string; assessmentTitle: string; code: string; email: string; invitationId: string; organizationId: string; requestNumber: number }) {
  await connectToDatabase();
  const integration = getResend();
  if (!integration) {
    await Notification.updateOne({ _id: notificationId, organizationId: data.organizationId, assessmentInvitationId: data.invitationId }, { $set: { status: "failed", failureReason: "Resend is not configured." } });
    return;
  }
  try {
    const result = await integration.client.emails.send(
      { from: integration.from, to: data.email, subject: `Your HirePilot verification code: ${data.code}`, html: assessmentOtpHtml(data) },
      { headers: { "Idempotency-Key": `assessment-otp-${data.invitationId}-${data.requestNumber}` } },
    );
    if (result.error) throw new Error(result.error.message);
    await Notification.updateOne({ _id: notificationId, organizationId: data.organizationId, assessmentInvitationId: data.invitationId }, { $set: { status: "sent", providerMessageId: result.data?.id, sentAt: new Date() }, $unset: { failureReason: 1 } });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1_000) : "Unknown email error";
    await Notification.updateOne({ _id: notificationId, organizationId: data.organizationId, assessmentInvitationId: data.invitationId }, { $set: { status: "failed", failureReason: message } });
  }
}

export async function deliverTeamInvitation(notificationId: string, data: { inviterName: string; organizationName: string; role: string; acceptUrl: string; email: string; invitationId: string; organizationId: string; deliveryKey: string }) {
  await connectToDatabase();
  const integration = getResend();
  if (!integration) { await Notification.updateOne({ _id: notificationId, organizationId: data.organizationId, teamInvitationId: data.invitationId }, { $set: { status: "failed", failureReason: "Resend is not configured." } }); return; }
  try {
    const result = await integration.client.emails.send({ from: integration.from, to: data.email, subject: `Join ${data.organizationName} on HirePilot`, html: teamInvitationHtml(data) }, { headers: { "Idempotency-Key": `team-invitation-${data.invitationId}-${data.deliveryKey}` } });
    if (result.error) throw new Error(result.error.message);
    await Notification.updateOne({ _id: notificationId, organizationId: data.organizationId, teamInvitationId: data.invitationId }, { $set: { status: "sent", providerMessageId: result.data?.id, sentAt: new Date() }, $unset: { failureReason: 1 } });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1_000) : "Unknown email error";
    await Notification.updateOne({ _id: notificationId, organizationId: data.organizationId, teamInvitationId: data.invitationId }, { $set: { status: "failed", failureReason: message } });
  }
}
