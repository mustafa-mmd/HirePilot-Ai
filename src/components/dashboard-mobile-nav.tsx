"use client";

import { Menu } from "lucide-react";
import { useState } from "react";

import { Brand } from "@/components/brand";
import { DashboardNav } from "@/components/dashboard-nav";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function DashboardMobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><Button variant="outline" size="icon" aria-label="Open navigation"><Menu /></Button></SheetTrigger>
      <SheetContent side="left" className="w-[min(88vw,22rem)] p-4" onClickCapture={(event) => { if ((event.target as HTMLElement).closest("a")) setOpen(false); }}>
        <SheetHeader className="px-0 pt-1 text-left">
          <SheetTitle><Brand /></SheetTitle>
          <SheetDescription>Recruitment workspace navigation</SheetDescription>
        </SheetHeader>
        <DashboardNav />
      </SheetContent>
    </Sheet>
  );
}
