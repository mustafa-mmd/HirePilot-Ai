function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

export function assessmentOtpHtml(data: { candidateName: string; organizationName: string; assessmentTitle: string; code: string }) {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#18181b"><h1 style="font-size:24px">Verify your assessment email</h1><p>Hello ${escapeHtml(data.candidateName)},</p><p>Use this one-time code to continue to <strong>${escapeHtml(data.assessmentTitle)}</strong> for ${escapeHtml(data.organizationName)}.</p><p style="font-size:32px;font-weight:700;letter-spacing:8px;background:#f4f4f5;padding:18px;text-align:center;border-radius:8px">${escapeHtml(data.code)}</p><p>This code expires in 10 minutes. Never share it with anyone.</p></div>`;
}
