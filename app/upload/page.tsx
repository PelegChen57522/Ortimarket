import { UploadFlowCard } from "@/components/upload/upload-flow-card";
import { requireSessionUser } from "@/lib/auth";

export default function UploadPage() {
  requireSessionUser();

  return (
    <main className="min-h-screen bg-background px-4 pb-8 pt-10 sm:pt-14">
      <div className="mx-auto w-full max-w-md space-y-5">
        <header className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Upload WhatsApp Export</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Export the group chat (without media), then upload the .txt file here.
          </p>
        </header>

        <UploadFlowCard />
      </div>
    </main>
  );
}
