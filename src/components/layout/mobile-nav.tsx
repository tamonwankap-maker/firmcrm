"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "./sidebar";
import type { NavSection } from "./nav";

export function MobileNav({ sections }: { sections: NavSection[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <Button variant="ghost" size="icon" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}>
        <Menu />
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="bg-sidebar relative h-full w-72 overflow-y-auto">
            <div className="flex items-center justify-between px-4 pt-4">
              <span className="text-sidebar-foreground font-semibold">BD CRM</span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close menu"
                className="text-sidebar-foreground hover:bg-sidebar-active"
                onClick={() => setOpen(false)}
              >
                <X />
              </Button>
            </div>
            <SidebarNav sections={sections} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
