import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function MarketNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md rounded-2xl border border-border bg-card p-6 text-center">
        <h1 className="text-xl font-semibold">Market not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This market slug does not exist in the current mock dataset.
        </p>
        <Link href="/" className={`${buttonVariants()} mt-4 inline-flex`}>
          Back to browse
        </Link>
      </div>
    </div>
  );
}
