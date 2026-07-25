"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EMPLOYMENT_TYPES, EXPERIENCE_LEVELS, WORKPLACE_TYPES } from "@/modules/jobs/constants";
import { DEFAULT_SCORING_WEIGHTS } from "@/modules/ai/constants";
import { slugifyJobTitle } from "@/modules/jobs/schemas";

const editorSchema = z.object({
  title: z.string().trim().min(2).max(160), slug: z.string().trim().min(2).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), description: z.string().trim().min(40).max(20_000), department: z.string().trim().min(2).max(100), location: z.string().trim().min(2).max(160), workplaceType: z.enum(WORKPLACE_TYPES), employmentType: z.enum(EMPLOYMENT_TYPES), experienceLevel: z.enum(EXPERIENCE_LEVELS), requiredSkills: z.string().trim().min(1), preferredSkills: z.string(), educationRequirements: z.string(), applicationDeadline: z.string(), scoringWeights: z.object({ skills: z.number().int().min(0).max(100), experience: z.number().int().min(0).max(100), education: z.number().int().min(0).max(100), roleFit: z.number().int().min(0).max(100) }),
}).refine((data) => Object.values(data.scoringWeights).reduce((sum, value) => sum + value, 0) === 100, { message: "Scoring weights must total 100.", path: ["scoringWeights", "skills"] });
type EditorValues = z.infer<typeof editorSchema>;

export type EditableJob = Partial<Omit<EditorValues, "scoringWeights">> & { id?: string; scoringWeights?: EditorValues["scoringWeights"] };

const labels: Record<string, string> = { remote: "Remote", hybrid: "Hybrid", onsite: "On-site", full_time: "Full time", part_time: "Part time", contract: "Contract", internship: "Internship", entry: "Entry", mid: "Mid-level", senior: "Senior", lead: "Lead", executive: "Executive" };

export function JobForm({ job }: { job?: EditableJob }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string>();
  const form = useForm<EditorValues>({ resolver: zodResolver(editorSchema), defaultValues: { title: job?.title ?? "", slug: job?.slug ?? "", description: job?.description ?? "", department: job?.department ?? "", location: job?.location ?? "", workplaceType: job?.workplaceType as EditorValues["workplaceType"] ?? "remote", employmentType: job?.employmentType as EditorValues["employmentType"] ?? "full_time", experienceLevel: job?.experienceLevel as EditorValues["experienceLevel"] ?? "mid", requiredSkills: job?.requiredSkills ?? "", preferredSkills: job?.preferredSkills ?? "", educationRequirements: job?.educationRequirements ?? "", applicationDeadline: job?.applicationDeadline ?? "", scoringWeights: job?.scoringWeights ?? { ...DEFAULT_SCORING_WEIGHTS } } });
  const titleField = form.register("title");
  const split = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);

  async function onSubmit(values: EditorValues) {
    setServerError(undefined);
    const response = await fetch(job?.id ? `/api/jobs/${job.id}` : "/api/jobs", { method: job?.id ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...values, requiredSkills: split(values.requiredSkills), preferredSkills: split(values.preferredSkills), educationRequirements: split(values.educationRequirements), applicationDeadline: values.applicationDeadline ? new Date(`${values.applicationDeadline}T23:59:59`).toISOString() : null }) });
    const result = await response.json();
    if (!response.ok) { setServerError(result.error?.message ?? "Could not save the job."); return; }
    router.push(`/dashboard/jobs/${result.data.id}`); router.refresh();
  }

  const error = (name: keyof EditorValues) => form.formState.errors[name]?.message;
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8" noValidate>
      {serverError ? <Alert variant="destructive"><AlertDescription>{serverError}</AlertDescription></Alert> : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2"><Label htmlFor="title">Job title</Label><Input id="title" {...titleField} onChange={(event) => { titleField.onChange(event); if (!form.getFieldState("slug").isDirty) form.setValue("slug", slugifyJobTitle(event.target.value)); }} />{error("title") ? <p className="text-xs text-destructive">{error("title")}</p> : null}</div>
        <div className="space-y-2 sm:col-span-2"><Label htmlFor="slug">Public URL slug</Label><Input id="slug" className="font-mono" {...form.register("slug")} />{error("slug") ? <p className="text-xs text-destructive">{error("slug")}</p> : null}</div>
        <div className="space-y-2"><Label htmlFor="department">Department</Label><Input id="department" {...form.register("department")} />{error("department") ? <p className="text-xs text-destructive">{error("department")}</p> : null}</div>
        <div className="space-y-2"><Label htmlFor="location">Location</Label><Input id="location" {...form.register("location")} />{error("location") ? <p className="text-xs text-destructive">{error("location")}</p> : null}</div>
        {(["workplaceType", "employmentType", "experienceLevel"] as const).map((name) => <div className="space-y-2" key={name}><Label>{name === "workplaceType" ? "Workplace" : name === "employmentType" ? "Employment" : "Experience level"}</Label><Controller name={name} control={form.control} render={({ field }) => <Select value={field.value} onValueChange={field.onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(name === "workplaceType" ? WORKPLACE_TYPES : name === "employmentType" ? EMPLOYMENT_TYPES : EXPERIENCE_LEVELS).map((value) => <SelectItem key={value} value={value}>{labels[value]}</SelectItem>)}</SelectContent></Select>} /></div>)}
        <div className="space-y-2"><Label htmlFor="applicationDeadline">Application deadline</Label><Input id="applicationDeadline" type="date" {...form.register("applicationDeadline")} /></div>
        <div className="space-y-2 sm:col-span-2"><Label htmlFor="description">Job description</Label><Textarea id="description" rows={12} {...form.register("description")} />{error("description") ? <p className="text-xs text-destructive">{error("description")}</p> : null}</div>
        <div className="space-y-2 sm:col-span-2"><Label htmlFor="requiredSkills">Required skills</Label><Input id="requiredSkills" placeholder="TypeScript, React, Product thinking" {...form.register("requiredSkills")} /><p className="text-xs text-muted-foreground">Separate items with commas.</p></div>
        <div className="space-y-2 sm:col-span-2"><Label htmlFor="preferredSkills">Preferred skills</Label><Input id="preferredSkills" {...form.register("preferredSkills")} /></div>
        <div className="space-y-2 sm:col-span-2"><Label htmlFor="educationRequirements">Education requirements</Label><Input id="educationRequirements" {...form.register("educationRequirements")} /></div>
        <fieldset className="space-y-4 sm:col-span-2">
          <div><legend className="text-sm font-medium">AI scoring weights</legend><p className="mt-1 text-xs text-muted-foreground">Set job-related priorities. All four weights must total 100.</p></div>
          <div className="grid gap-4 sm:grid-cols-4">
            {(["skills", "experience", "education", "roleFit"] as const).map((key) => <div className="space-y-2" key={key}><Label htmlFor={`weight-${key}`}>{key === "roleFit" ? "Role fit" : key[0].toUpperCase() + key.slice(1)}</Label><Input id={`weight-${key}`} type="number" min={0} max={100} {...form.register(`scoringWeights.${key}`, { valueAsNumber: true })} /></div>)}
          </div>
          {form.formState.errors.scoringWeights?.skills?.message ? <p className="text-xs text-destructive">{form.formState.errors.scoringWeights.skills.message}</p> : null}
        </fieldset>
      </div>
      <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button><Button disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Saving…" : job?.id ? "Save changes" : "Create draft"}</Button></div>
    </form>
  );
}
