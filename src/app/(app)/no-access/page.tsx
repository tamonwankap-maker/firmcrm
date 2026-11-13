import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NoAccessPage() {
  return (
    <div className="mx-auto mt-16 max-w-md text-center">
      <ShieldAlert className="text-muted-foreground mx-auto mb-3 size-10" aria-hidden />
      <h1 className="text-xl font-semibold">No access</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Your role does not have access to this page. If you think this is wrong, contact the Head of BD.
      </p>
      <Button asChild className="mt-6">
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
