import { CommandPalette } from "@/components/command-palette";
import { MobileNav, Sidebar } from "@/components/nav";
import { PausedBanner } from "@/components/paused-banner";
import { createClient } from "@/lib/supabase/server";

/**
 * Shell for every signed-in page. The public intake form deliberately sits
 * outside this group so clients never see the nav.
 */
// Every screen here reflects live pipeline state, so nothing in this group may
// be prerendered at build time.
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Cheap query that doubles as a health probe: if the free-tier project is
  // paused, this errors and we swap in an explanation instead of a stack trace.
  const supabase = await createClient();
  const { error } = await supabase
    .from("prospects")
    .select("id", { count: "exact", head: true });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-24 sm:px-6 md:pb-8">
          {error && <PausedBanner message={error.message} />}
          {children}
        </main>
      </div>
      <MobileNav />
      <CommandPalette />
    </div>
  );
}
