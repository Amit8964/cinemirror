import type { Metadata } from "next";
import TitleForm from "@/components/admin/TitleForm";

export const metadata: Metadata = { title: "Add title" };

export default function NewTitlePage() {
  return (
    <>
      <h1 className="mb-5 text-2xl font-extrabold tracking-tight">Add title</h1>
      <TitleForm />
    </>
  );
}
