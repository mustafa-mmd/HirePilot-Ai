function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

export function applicationConfirmationHtml({ candidateName, jobTitle, organizationName }: { candidateName: string; jobTitle: string; organizationName: string }) {
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;color:#18181b;font-family:Arial,sans-serif"><div style="max-width:560px;margin:0 auto;padding:40px 20px"><div style="background:#fff;border:1px solid #e4e4e7;border-radius:12px;padding:32px"><p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#71717a">HirePilot AI</p><h1 style="font-size:24px;margin:16px 0">Application received</h1><p style="line-height:1.6">Hello ${escapeHtml(candidateName)},</p><p style="line-height:1.6">${escapeHtml(organizationName)} has received your application for <strong>${escapeHtml(jobTitle)}</strong>.</p><p style="line-height:1.6">The recruiting team will review your information. Any next step will come directly from the organization.</p><p style="margin-top:28px;color:#71717a;font-size:13px">HirePilot AI assists recruiters but does not make final hiring decisions.</p></div></div></body></html>`;
}
