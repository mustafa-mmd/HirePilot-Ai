"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Building2 } from "lucide-react";

export function RegisterOrgModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");

  function slugify(val: string) {
    return val
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function handleNameChange(val: string) {
    setName(val);
    setSlug(slugify(val));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/organizations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, slug, ownerEmail }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to register company.");
      }

      setOpen(false);
      setName("");
      setSlug("");
      setOwnerEmail("");
      router.refresh();
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="size-4" />
          Register Company
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex size-10 items-center justify-center rounded-lg bg-blue-950 text-blue-400 border border-blue-900/30 mb-2">
            <Building2 className="size-5" />
          </div>
          <DialogTitle>Register Company</DialogTitle>
          <DialogDescription>
            Onboard a new organization. If the owner's email does not exist, a new user account will be generated.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void submit(e)} className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-2">
            <Label htmlFor="org-name">Company Name</Label>
            <Input
              id="org-name"
              placeholder="BlackCart Inc."
              value={name}
              required
              disabled={busy}
              onChange={(e) => handleNameChange(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="org-slug">URL Subdomain / Slug</Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-mono select-none">
                /jobs/
              </span>
              <Input
                id="org-slug"
                placeholder="blackcart"
                value={slug}
                required
                disabled={busy}
                onChange={(e) => setSlug(slugify(e.target.value))}
                className="pl-14 font-mono text-sm"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              Only lowercase letters, numbers, and dashes.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="org-owner">Owner's Email Address</Label>
            <Input
              id="org-owner"
              type="email"
              placeholder="owner@blackcart.store"
              value={ownerEmail}
              required
              disabled={busy}
              onChange={(e) => setOwnerEmail(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy} className="bg-blue-600 hover:bg-blue-700 text-white">
              {busy ? "Registering..." : "Onboard workspace"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
