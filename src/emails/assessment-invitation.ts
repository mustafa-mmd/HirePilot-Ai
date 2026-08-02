function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character] ?? character,
  );
}

type AssessmentEmailWindow = {
  candidateName: string;
  assessmentTitle: string;
  jobTitle: string;
  organizationName: string;
  assessmentUrl: string;
  availableFrom: string;
  expiresAt: string;
};

function assessmentLinkHtml(url: string) {
  const safeUrl = escapeHtml(url);
  return `<p style="margin:28px 0"><a href="${safeUrl}" style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;border-radius:8px;padding:12px 18px;font-weight:600">Open Assessment</a></p><p style="color:#71717a;font-size:13px;line-height:1.6">If the button does not work, copy and paste this link into your browser:<br><a href="${safeUrl}" style="color:#4f46e5;word-break:break-all">${safeUrl}</a></p>`;
}

function assessmentWindowText(data: AssessmentEmailWindow) {
  return `Assessment: ${data.assessmentTitle}\nRole: ${data.jobTitle}\nOrganization: ${data.organizationName}\nOpens: ${data.availableFrom}\nCloses: ${data.expiresAt}\n\nOpen Assessment:\n${data.assessmentUrl}`;
}

export function assessmentInvitationHtml(
  data: AssessmentEmailWindow & { duration: number },
) {
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;color:#18181b;font-family:Arial,sans-serif"><div style="max-width:560px;margin:0 auto;padding:40px 20px"><div style="background:#fff;border:1px solid #e4e4e7;border-radius:12px;padding:32px"><p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#71717a">HirePilot AI</p><h1 style="font-size:24px;margin:16px 0">Assessment invitation</h1><p style="line-height:1.6">Hello ${escapeHtml(data.candidateName)},</p><p style="line-height:1.6">${escapeHtml(data.organizationName)} invited you to complete <strong>${escapeHtml(data.assessmentTitle)}</strong> for the ${escapeHtml(data.jobTitle)} role.</p><p style="line-height:1.6">Allow approximately ${data.duration} minutes. The assessment opens at <strong>${escapeHtml(data.availableFrom)}</strong> and closes at <strong>${escapeHtml(data.expiresAt)}</strong>. You cannot begin before the opening time.</p>${assessmentLinkHtml(data.assessmentUrl)}<p style="color:#71717a;font-size:13px;line-height:1.5">This secure link is unique to you. Do not forward it. The server enforces the opening and closing times.</p></div></div></body></html>`;
}

export function assessmentInvitationText(data: AssessmentEmailWindow & { duration: number }) {
  return `Hello ${data.candidateName},\n\n${data.organizationName} invited you to complete an assessment for the ${data.jobTitle} role. Allow approximately ${data.duration} minutes.\n\n${assessmentWindowText(data)}\n\nThis secure link is unique to you. Do not forward it.`;
}

export function assessmentReminderHtml(data: AssessmentEmailWindow) {
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;color:#18181b;font-family:Arial,sans-serif"><div style="max-width:560px;margin:0 auto;padding:40px 20px"><div style="background:#fff;border:1px solid #e4e4e7;border-radius:12px;padding:32px"><p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#71717a">HirePilot AI</p><h1 style="font-size:24px;margin:16px 0">Assessment reminder</h1><p style="line-height:1.6">Hello ${escapeHtml(data.candidateName)},</p><p style="line-height:1.6">This is a reminder to complete <strong>${escapeHtml(data.assessmentTitle)}</strong> for the ${escapeHtml(data.jobTitle)} role with ${escapeHtml(data.organizationName)}.</p><p style="line-height:1.6">The assessment opens at <strong>${escapeHtml(data.availableFrom)}</strong> and closes at <strong>${escapeHtml(data.expiresAt)}</strong>.</p>${assessmentLinkHtml(data.assessmentUrl)}<p style="color:#71717a;font-size:13px;line-height:1.5">This secure link is unique to you. Do not forward it. Your original invitation link also remains valid.</p></div></div></body></html>`;
}

export function assessmentReminderText(data: AssessmentEmailWindow) {
  return `Hello ${data.candidateName},\n\nThis is a reminder to complete your assessment for the ${data.jobTitle} role.\n\n${assessmentWindowText(data)}\n\nThis secure link is unique to you. Do not forward it.`;
}
