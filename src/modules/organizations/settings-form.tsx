"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Settings = {
  name: string;
  slug: string;
  website: string;
  industry: string;
  size: string;
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  privacyContactEmail: string;
  retentionDays: number;
  assessmentSupportMessage: string;
};

export function OrganizationSettingsForm({ initial, canEdit }: { initial: Settings; canEdit: boolean }) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const field = (key: keyof Settings, value: string | number) =>
    setData((current) => ({ ...current, [key]: value }));

  async function handleLogoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    const extension = selectedFile.name.split(".").pop()?.toLowerCase();
    if (!extension || !["png", "jpg", "jpeg", "webp"].includes(extension)) {
      setMessage("Choose a PNG, JPG, JPEG, or WEBP image file.");
      return;
    }
    if (selectedFile.size > 2 * 1024 * 1024) {
      setMessage("Choose an image file no larger than 2 MB.");
      return;
    }

    setUploading(true);
    setMessage("");

    try {
      const fallbackMime: Record<string, string> = {
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        webp: "image/webp",
      };

      const signatureResponse = await fetch("/api/uploads/logo/signature", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          filename: selectedFile.name,
          bytes: selectedFile.size,
          mimeType: selectedFile.type || fallbackMime[extension],
        }),
      });

      const signatureResult = await signatureResponse.json();
      if (!signatureResponse.ok) {
        throw new Error(signatureResult.error?.message ?? "Could not prepare the logo upload.");
      }

      const signature = signatureResult.data;
      const payload = new FormData();
      payload.append("file", selectedFile);
      payload.append("api_key", signature.apiKey);
      payload.append("timestamp", String(signature.timestamp));
      payload.append("signature", signature.signature);
      payload.append("folder", signature.folder);
      payload.append("public_id", signature.publicId);

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`,
        { method: "POST", body: payload }
      );

      const uploadResult = await uploadResponse.json();
      if (!uploadResponse.ok) {
        throw new Error("Logo upload failed. Please try again.");
      }

      field("logo", uploadResult.secure_url);
      setMessage("Logo uploaded successfully. Remember to save your settings!");
    } catch (uploadError) {
      setMessage(uploadError instanceof Error ? uploadError.message : "Logo upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/settings/organization", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "Settings could not be saved.");
      setMessage("Organization settings saved.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Settings could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization and candidate privacy</CardTitle>
        <CardDescription>
          Brand candidate pages and publish a clear retention and accommodation contact.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 sm:grid-cols-2">
        {message && (
          <Alert className="sm:col-span-2">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-2">
          <Label htmlFor="org-name">Name</Label>
          <Input
            id="org-name"
            value={data.name}
            disabled={!canEdit}
            onChange={(event) => field("name", event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Workspace slug</Label>
          <Input value={data.slug} disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="org-website">Website</Label>
          <Input
            id="org-website"
            type="url"
            value={data.website}
            disabled={!canEdit}
            onChange={(event) => field("website", event.target.value)}
          />
        </div>

        {/* Organization Logo Section */}
        <div className="space-y-2 sm:col-span-2 border-t pt-4">
          <Label>Organization Logo</Label>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center mt-2">
            <div className="relative flex size-24 shrink-0 items-center justify-center rounded-lg border bg-muted/30 overflow-hidden">
              {data.logo ? (
                <>
                  <img src={data.logo} alt="Organization Logo" className="size-full object-cover" />
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => field("logo", "")}
                      className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-destructive-foreground hover:bg-destructive/90 shadow-sm"
                      title="Remove logo"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </>
              ) : (
                <ImageIcon className="size-8 text-muted-foreground" />
              )}
            </div>

            {canEdit && (
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Label
                    htmlFor="logo-file"
                    className="flex cursor-pointer items-center gap-2 rounded-md bg-secondary hover:bg-secondary/80 px-3 py-2 text-sm font-medium border"
                  >
                    {uploading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Upload className="size-4" />
                    )}
                    {uploading ? "Uploading..." : "Upload image"}
                  </Label>
                  <Input
                    id="logo-file"
                    className="sr-only"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    disabled={uploading}
                    onChange={handleLogoUpload}
                  />
                  {data.logo && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => field("logo", "")}
                      type="button"
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">PNG, JPG, or WEBP up to 2 MB</p>
              </div>
            )}
          </div>
          <div className="mt-2">
            <Label htmlFor="org-logo" className="text-xs text-muted-foreground">
              Logo URL
            </Label>
            <Input
              id="org-logo"
              type="url"
              value={data.logo}
              placeholder="No logo uploaded yet"
              disabled={!canEdit || uploading}
              onChange={(event) => field("logo", event.target.value)}
              className="mt-1 text-xs font-mono"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="org-industry">Industry</Label>
          <Input
            id="org-industry"
            value={data.industry}
            disabled={!canEdit}
            onChange={(event) => field("industry", event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="org-size">Organization size</Label>
          <Input
            id="org-size"
            value={data.size}
            disabled={!canEdit}
            onChange={(event) => field("size", event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="primary-color">Primary color</Label>
          <Input
            id="primary-color"
            type="color"
            value={data.primaryColor}
            disabled={!canEdit}
            onChange={(event) => field("primaryColor", event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="secondary-color">Secondary color</Label>
          <Input
            id="secondary-color"
            type="color"
            value={data.secondaryColor}
            disabled={!canEdit}
            onChange={(event) => field("secondaryColor", event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="privacy-email">Privacy and accommodation email</Label>
          <Input
            id="privacy-email"
            type="email"
            value={data.privacyContactEmail}
            disabled={!canEdit}
            onChange={(event) => field("privacyContactEmail", event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="retention-days">Retention period (days)</Label>
          <Input
            id="retention-days"
            type="number"
            min={30}
            max={2555}
            value={data.retentionDays}
            disabled={!canEdit}
            onChange={(event) => field("retentionDays", Number(event.target.value))}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="support-message">Candidate support and challenge message</Label>
          <Textarea
            id="support-message"
            value={data.assessmentSupportMessage}
            disabled={!canEdit}
            onChange={(event) => field("assessmentSupportMessage", event.target.value)}
          />
        </div>
        {canEdit && (
          <div className="sm:col-span-2">
            <Button disabled={busy || uploading} onClick={() => void save()}>
              {busy ? "Saving..." : "Save settings"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
