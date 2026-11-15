import type { Metadata } from "next";
import { MyListGrid } from "@/components/MyList";

export const metadata: Metadata = { title: "My List" };

export default function MyListPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-5xl tracking-wide">My List</h1>
      <p className="mt-1 text-sm text-muted">Saved in this browser — no account needed.</p>
      <MyListGrid />
    </div>
  );
}
