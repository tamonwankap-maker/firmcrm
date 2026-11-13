import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto mt-24 max-w-md text-center">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        The record may have been archived, or you may not have access to it.
      </p>
      <Link href="/dashboard" className="text-primary mt-6 inline-block text-sm underline">
        Back to dashboard
      </Link>
    </div>
  );
}
