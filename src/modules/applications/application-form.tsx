"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, FileText, Loader2, UploadCloud } from "lucide-react";
import { useState } from "react";
import { type FieldErrors, useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({ fullName: z.string().trim().min(2).max(160), email: z.string().trim().toLowerCase().email().max(254), phone: z.string().trim().max(40), location: z.string().trim().max(160), linkedinUrl: z.union([z.literal(""), z.url()]), githubUrl: z.union([z.literal(""), z.url()]), portfolioUrl: z.union([z.literal(""), z.url()]), coverLetter: z.string().trim().max(5_000) });
type FormValues = z.infer<typeof formSchema>;
type CloudinaryResult = { secure_url: string; public_id: string; resource_type: "raw"; format?: string; bytes: number; original_filename?: string };

const fieldLabels: Record<keyof FormValues, string> = {
  fullName: "Full name",
  email: "Email",
  phone: "Phone",
  location: "Location",
  linkedinUrl: "LinkedIn URL",
  githubUrl: "GitHub URL",
  portfolioUrl: "Portfolio URL",
  coverLetter: "Cover letter",
};

export function ApplicationForm({ jobId }: { jobId: string }) {
  const [file, setFile] = useState<File>(); const [consent, setConsent] = useState(false); const [error, setError] = useState<string>(); const [complete, setComplete] = useState(false);
  const form = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: { fullName: "", email: "", phone: "", location: "", linkedinUrl: "", githubUrl: "", portfolioUrl: "", coverLetter: "" } });

  async function uploadCv(selectedFile: File): Promise<CloudinaryResult> {
    const extension = selectedFile.name.split(".").pop()?.toLowerCase();
    if (!extension || !["pdf", "doc", "docx"].includes(extension) || selectedFile.size > 5 * 1024 * 1024) throw new Error("Choose a PDF, DOC, or DOCX file no larger than 5 MB.");
    const fallbackMime: Record<string, string> = { pdf: "application/pdf", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
    const signatureResponse = await fetch("/api/uploads/cv/signature", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jobId, filename: selectedFile.name, bytes: selectedFile.size, mimeType: selectedFile.type || fallbackMime[extension] }) });
    const signatureResult = await signatureResponse.json();
    if (!signatureResponse.ok) throw new Error(signatureResult.error?.message ?? "Could not prepare the CV upload.");
    const signature = signatureResult.data;
    const payload = new FormData(); payload.append("file", selectedFile); payload.append("api_key", signature.apiKey); payload.append("timestamp", String(signature.timestamp)); payload.append("signature", signature.signature); payload.append("folder", signature.folder); payload.append("public_id", signature.publicId);
    const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/raw/upload`, { method: "POST", body: payload });
    const uploadResult = await uploadResponse.json();
    if (!uploadResponse.ok) throw new Error("CV upload failed. Please try again.");
    return uploadResult as CloudinaryResult;
  }

  async function onSubmit(values: FormValues) {
    setError(undefined);
    if (!file) { setError("Attach your CV before submitting."); return; }
    if (!consent) { setError("You must consent to application processing."); return; }
    try {
      const uploaded = await uploadCv(file); const extension = file.name.split(".").pop()?.toLowerCase() as "pdf" | "doc" | "docx";
      const response = await fetch("/api/applications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jobId, ...values, consentGiven: true, cv: { url: uploaded.secure_url, publicId: uploaded.public_id, resourceType: "raw", format: uploaded.format ?? extension, bytes: uploaded.bytes, originalFilename: file.name } }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error?.message ?? "Application submission failed."); setComplete(true);
    } catch (submissionError) { setError(submissionError instanceof Error ? submissionError.message : "Application submission failed."); }
  }

  function onInvalid(errors: FieldErrors<FormValues>) {
    const firstInvalidField = (Object.keys(errors) as Array<keyof FormValues>)[0];
    const validationMessage = firstInvalidField ? errors[firstInvalidField]?.message : undefined;
    setError(
      firstInvalidField
        ? `${fieldLabels[firstInvalidField]}: ${typeof validationMessage === "string" ? validationMessage : "Please enter a valid value."}`
        : "Review the highlighted fields before submitting.",
    );

    if (firstInvalidField) {
      requestAnimationFrame(() => {
        const element = document.getElementById(firstInvalidField);
        element?.scrollIntoView({ behavior: "smooth", block: "center" });
        element?.focus({ preventScroll: true });
      });
    }
  }

  if (complete) return <div className="rounded-xl border bg-card p-8 text-center"><CheckCircle2 className="mx-auto size-10 text-emerald-400" /><h2 className="mt-4 text-xl font-semibold">Application received</h2><p className="mt-2 text-sm text-muted-foreground">A confirmation has been prepared for your email. The hiring team will contact you about any next step.</p></div>;
  const fieldError = (name: keyof FormValues) => form.formState.errors[name]?.message;
  return <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-6" noValidate><div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="fullName">Full name</Label><Input id="fullName" autoComplete="name" {...form.register("fullName")} />{fieldError("fullName") ? <p className="text-xs text-destructive">{fieldError("fullName")}</p> : null}</div><div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" autoComplete="email" {...form.register("email")} />{fieldError("email") ? <p className="text-xs text-destructive">{fieldError("email")}</p> : null}</div><div className="space-y-2"><Label htmlFor="phone">Phone</Label><Input id="phone" autoComplete="tel" {...form.register("phone")} />{fieldError("phone") ? <p className="text-xs text-destructive">{fieldError("phone")}</p> : null}</div><div className="space-y-2"><Label htmlFor="location">Location</Label><Input id="location" autoComplete="address-level2" {...form.register("location")} />{fieldError("location") ? <p className="text-xs text-destructive">{fieldError("location")}</p> : null}</div><div className="space-y-2"><Label htmlFor="linkedinUrl">LinkedIn URL</Label><Input id="linkedinUrl" type="url" placeholder="https://www.linkedin.com/in/your-name" {...form.register("linkedinUrl")} />{fieldError("linkedinUrl") ? <p className="text-xs text-destructive">Enter a complete URL beginning with https://</p> : null}</div><div className="space-y-2"><Label htmlFor="githubUrl">GitHub URL</Label><Input id="githubUrl" type="url" placeholder="https://github.com/your-name" {...form.register("githubUrl")} />{fieldError("githubUrl") ? <p className="text-xs text-destructive">Enter a complete URL beginning with https://</p> : null}</div><div className="space-y-2 sm:col-span-2"><Label htmlFor="portfolioUrl">Portfolio URL</Label><Input id="portfolioUrl" type="url" placeholder="https://your-portfolio.example" {...form.register("portfolioUrl")} />{fieldError("portfolioUrl") ? <p className="text-xs text-destructive">Enter a complete URL beginning with https://</p> : null}</div><div className="space-y-2 sm:col-span-2"><Label htmlFor="coverLetter">Cover letter</Label><Textarea id="coverLetter" rows={7} {...form.register("coverLetter")} />{fieldError("coverLetter") ? <p className="text-xs text-destructive">{fieldError("coverLetter")}</p> : null}</div><div className="space-y-2 sm:col-span-2"><Label htmlFor="cv">CV or résumé</Label><label htmlFor="cv" className="flex cursor-pointer items-center gap-4 rounded-lg border border-dashed p-5 transition-colors hover:bg-accent"><span className="flex size-10 items-center justify-center rounded-lg bg-muted">{file ? <FileText className="size-5" /> : <UploadCloud className="size-5" />}</span><span><span className="block text-sm font-medium">{file?.name ?? "Choose a file"}</span><span className="text-xs text-muted-foreground">PDF, DOC, or DOCX · maximum 5 MB</span></span></label><Input id="cv" className="sr-only" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => setFile(event.target.files?.[0])} /></div></div><div className="flex items-start gap-3 rounded-lg border p-4"><Checkbox id="consent" checked={consent} onCheckedChange={(checked) => setConsent(checked === true)} /><div><Label htmlFor="consent">I consent to application processing</Label><p className="mt-1 text-xs leading-5 text-muted-foreground">My information and CV will be shared with this hiring organization for recruitment. AI-assisted analysis may be reviewed by authorized recruiters, while final decisions remain human.</p></div></div>{error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}<Button size="lg" className="w-full" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? <><Loader2 className="animate-spin" /> Uploading and submitting…</> : "Submit application"}</Button></form>;
}
