import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteTitleAction } from "@/app/admin/actions";
import { ConfirmSubmit } from "@/components/admin/bits";
import TitleForm from "@/components/admin/TitleForm";
import { getTitleById } from "@/lib/titles";

export const metadata: Metadata = { title: "Edit title" };

export default async function EditTitlePage({ params }: PageProps<"/admin/titles/[id]">) {
  const { id } = await params;
  const title = await getTitleById(id);
  if (!title) notFound();
  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/admin/titles" className="text-sm font-semibold text-muted hover:text-text">← Titles</Link>
          <h1 className="text-2xl font-extrabold tracking-tight">{title.title}</h1>
        </div>
        <Link href={`/watch/${title.slug}`} className="btn btn-ghost">Watch</Link>
      </div>
      <TitleForm title={title} />
      <section className="mt-8 rounded-xl border border-danger/30 p-5">
        <h2 className="text-sm font-bold">Delete this title</h2>
        <p className="mt-1 text-sm text-muted">Removes it from the site and from every partner embed. Past play statistics are kept.</p>
        <form action={deleteTitleAction} className="mt-3">
          <input type="hidden" name="id" value={title.id} />
          <ConfirmSubmit className="btn btn-danger" message={`Delete “${title.title}”? This cannot be undone.`}>Delete title</ConfirmSubmit>
        </form>
      </section>
    </>
  );
}
