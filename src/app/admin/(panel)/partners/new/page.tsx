import type { Metadata } from "next";
import PartnerForm from "@/components/admin/PartnerForm";

export const metadata: Metadata = { title: "New partner" };

export default function NewPartnerPage() {
  return (
    <>
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight">New partner</h1>
      <p className="mb-5 text-sm text-muted">A unique embed key is generated when you save.</p>
      <div className="rounded-xl border border-line bg-surface p-5"><PartnerForm /></div>
    </>
  );
}
