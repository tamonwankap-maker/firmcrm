import { Construction } from "lucide-react";
import { PageHeader } from "./page-header";

export function ComingSoon({ title, phase }: { title: string; phase: number }) {
  return (
    <>
      <PageHeader title={title} />
      <div className="bg-card flex flex-col items-center rounded-lg border border-dashed py-16 text-center">
        <Construction className="text-muted-foreground mb-3 size-8" aria-hidden />
        <p className="font-medium">Coming in Phase {phase}</p>
        <p className="text-muted-foreground mt-1 text-sm">
          The database tables are ready; screens are built in Phase {phase}.
        </p>
      </div>
    </>
  );
}
