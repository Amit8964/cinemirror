"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { deleteDmcaReport, getDmcaReport, isDmcaStatus, logDmcaAction, updateDmcaReport } from "@/lib/dmca";
import { deleteTitle, getTitleById, setTitlePublished } from "@/lib/titles";

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

/** Save the status and internal notes of a DMCA notice. */
export async function saveDmcaReportAction(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = str(fd, "id");
  const status = str(fd, "status");
  await updateDmcaReport(id, {
    status: isDmcaStatus(status) ? status : undefined,
    adminNotes: String(fd.get("adminNotes") ?? ""),
  });
  revalidatePath("/admin", "layout");
  redirect(`/admin/dmca/${id}?saved=1`);
}

/** Delete a notice permanently (spam or duplicates). Titles are not touched. */
export async function deleteDmcaReportAction(fd: FormData): Promise<void> {
  await requireAdmin();
  await deleteDmcaReport(str(fd, "id"));
  revalidatePath("/admin", "layout");
  redirect("/admin/dmca");
}

/**
 * Act on a title named in a notice:
 *   unpublish → hidden from the site, watch page and every partner embed (reversible)
 *   republish → shown again (e.g. after a valid counter-notice)
 *   delete    → removed from the catalogue permanently
 * Each action is logged in the notice's notes.
 */
export async function dmcaTitleAction(fd: FormData): Promise<void> {
  await requireAdmin();
  const reportId = str(fd, "reportId");
  const titleId = str(fd, "titleId");
  const mode = str(fd, "mode");
  const [report, title] = await Promise.all([getDmcaReport(reportId), getTitleById(titleId)]);
  if (!report || !title || !report.titleIds.includes(titleId)) redirect(`/admin/dmca/${reportId}`);

  if (mode === "unpublish") {
    await setTitlePublished(titleId, false);
    await logDmcaAction(reportId, `Unpublished “${title.title}” (/${title.slug})`, "removed");
  } else if (mode === "republish") {
    await setTitlePublished(titleId, true);
    await logDmcaAction(reportId, `Republished “${title.title}” (/${title.slug})`);
  } else if (mode === "delete") {
    await deleteTitle(titleId);
    await logDmcaAction(reportId, `Deleted “${title.title}” (/${title.slug}) permanently`, "removed");
  }

  revalidatePath("/", "layout");
  redirect(`/admin/dmca/${reportId}`);
}
