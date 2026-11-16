import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteDmcaReportAction, dmcaTitleAction, saveDmcaReportAction } from "@/app/admin/dmca-actions";
import { ConfirmSubmit } from "@/components/admin/bits";
import { ArrowLeftIcon, LinkIcon, MailIcon, PhoneIcon } from "@/components/icons";
import Poster from "@/components/Poster";
import { DMCA_STATUSES, getDmcaReport, type DmcaStatus } from "@/lib/dmca";
import { telHref } from "@/lib/site";
import { getTitleById } from "@/lib/titles";

export const metadata: Metadata = { title: "DMCA notice" };

const when = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
const card = "rounded-xl border border-line bg-surface p-5";
const dt = "text-xs font-semibold tracking-wider text-muted uppercase";

export default async function DmcaReportPage({ params, searchParams }: PageProps<"/admin/dmca/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const report = await getDmcaReport(id);
  if (!report) notFound();
  const titles = await Promise.all(report.titleIds.map(async (tid) => ({ id: tid, title: await getTitleById(tid) })));
  const st = DMCA_STATUSES[report.status];
  const replySubject = encodeURIComponent(`Re: your DMCA notice ${report.ref}`);

  return (
    <>
      <Link href="/admin/dmca" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeftIcon /> All notices
      </Link>

      <div className="mt-3 mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-extrabold tracking-tight">{report.ref}</h1>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.className}`}>{st.label}</span>
        <span className="text-sm text-muted">Received {when.format(report.createdAt * 1000)}</span>
      </div>

      {sp.saved && <p role="status" className="mb-5 rounded-lg border border-ok/40 bg-ok/10 p-3 text-sm font-semibold text-ok">Saved.</p>}

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="space-y-5">
          <section className={card}>
            <h2 className="font-bold">Titles in your library</h2>
            {titles.length ? (
              <ul className="mt-3 space-y-3">
                {titles.map(({ id: tid, title }) => (
                  <li key={tid} className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-ink/60 p-3">
                    {title ? (
                      <>
                        <Poster title={title.title} src={title.posterUrl} className="w-10 shrink-0 !rounded [&_span]:hidden" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{title.title}</p>
                          <p className="text-xs text-muted">
                            /{title.slug} ·{" "}
                            {title.published ? <span className="text-ok">Live on site</span> : <span className="text-danger">Hidden from site</span>}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/admin/titles/${title.id}`} className="btn btn-ghost !px-3 !py-1.5 !text-xs">Edit</Link>
                          <form action={dmcaTitleAction}>
                            <input type="hidden" name="reportId" value={report.id} />
                            <input type="hidden" name="titleId" value={title.id} />
                            <input type="hidden" name="mode" value={title.published ? "unpublish" : "republish"} />
                            <button className={`btn !px-3 !py-1.5 !text-xs ${title.published ? "btn-primary" : "btn-ghost"}`}>
                              {title.published ? "Remove from site" : "Restore"}
                            </button>
                          </form>
                          <form action={dmcaTitleAction}>
                            <input type="hidden" name="reportId" value={report.id} />
                            <input type="hidden" name="titleId" value={title.id} />
                            <input type="hidden" name="mode" value="delete" />
                            <ConfirmSubmit
                              message={`Delete “${title.title}” permanently? This cannot be undone. Use “Remove from site” to hide it instead.`}
                              className="btn btn-danger !px-3 !py-1.5 !text-xs"
                            >
                              Delete
                            </ConfirmSubmit>
                          </form>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted">This title has been deleted.</p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted">
                None of the links match a title in your library (/title, /watch or /embed pages). Check the links below and
                remove the content manually from <Link href="/admin/titles" className="font-semibold text-accent hover:underline">Titles</Link> if needed.
              </p>
            )}
            <p className="mt-3 text-xs text-muted">
              “Remove from site” hides the title from the site, the watch page and every partner embed. You can restore it later.
            </p>
          </section>

          <section className={card}>
            <h2 className="font-bold">Reported links</h2>
            <ul className="mt-3 space-y-1.5">
              {report.urls.map((u) => (
                <li key={u} className="flex items-start gap-2 text-sm">
                  <LinkIcon className="mt-0.5 shrink-0 text-muted" />
                  <a href={u} target="_blank" rel="noopener noreferrer nofollow" className="font-mono text-xs break-all text-accent hover:underline">{u}</a>
                </li>
              ))}
            </ul>
          </section>

          <section className={card}>
            <h2 className="font-bold">Claim</h2>
            <dl className="mt-3 space-y-4">
              <div>
                <dt className={dt}>Copyrighted work</dt>
                <dd className="mt-1 text-sm whitespace-pre-wrap">{report.work}</dd>
              </div>
              {report.originalUrl && (
                <div>
                  <dt className={dt}>Original work / proof</dt>
                  <dd className="mt-1">
                    <a href={report.originalUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-sm break-all text-accent hover:underline">{report.originalUrl}</a>
                  </dd>
                </div>
              )}
              {report.details && (
                <div>
                  <dt className={dt}>Additional details</dt>
                  <dd className="mt-1 text-sm whitespace-pre-wrap text-text/85">{report.details}</dd>
                </div>
              )}
              <div>
                <dt className={dt}>Declarations</dt>
                <dd className="mt-1 text-sm text-text/85">
                  Good-faith and accuracy statements confirmed. Signed: <span className="font-semibold italic">{report.signature}</span>
                </dd>
              </div>
            </dl>
          </section>
        </div>

        <aside className="space-y-5">
          <section className={card}>
            <h2 className="font-bold">Sent by</h2>
            <p className="mt-3 text-lg font-semibold">{report.name}</p>
            <p className="text-sm text-muted">
              {report.role === "agent" ? "Authorised agent" : "Copyright owner"}
              {report.organization && ` · ${report.organization}`}
            </p>
            <div className="mt-3 space-y-1.5 text-sm">
              <a href={`mailto:${report.email}`} className="flex items-center gap-2 break-all text-accent hover:underline"><MailIcon className="shrink-0" /> {report.email}</a>
              {report.phone && <a href={telHref(report.phone)} className="flex items-center gap-2 text-text/85 hover:text-accent"><PhoneIcon className="shrink-0" /> {report.phone}</a>}
            </div>
            <a href={`mailto:${report.email}?subject=${replySubject}`} className="btn btn-ghost mt-4 w-full !text-xs">
              <MailIcon /> Reply by email
            </a>
            <dl className="mt-4 space-y-2 border-t border-line pt-3 text-xs">
              <div className="flex justify-between gap-3"><dt className="text-muted">IP address</dt><dd className="font-mono">{report.ip || "—"}</dd></div>
              <div><dt className="text-muted">Browser</dt><dd className="mt-0.5 break-words text-text/70">{report.userAgent || "—"}</dd></div>
            </dl>
          </section>

          <form action={saveDmcaReportAction} className={card}>
            <h2 className="font-bold">Review</h2>
            <input type="hidden" name="id" value={report.id} />
            <label className="mt-3 block text-sm font-semibold">
              Status
              <select name="status" defaultValue={report.status} className="field mt-1">
                {(Object.keys(DMCA_STATUSES) as DmcaStatus[]).map((s) => (
                  <option key={s} value={s}>{DMCA_STATUSES[s].label}</option>
                ))}
              </select>
            </label>
            <label className="mt-3 block text-sm font-semibold">
              Internal notes
              <textarea name="adminNotes" rows={6} defaultValue={report.adminNotes} placeholder="Only admins see this." className="field mt-1 !text-xs" />
            </label>
            <button className="btn btn-primary mt-3 w-full">Save</button>
            {report.updatedAt !== report.createdAt && (
              <p className="mt-2 text-center text-xs text-muted">Last updated {when.format(report.updatedAt * 1000)}</p>
            )}
          </form>

          <form action={deleteDmcaReportAction} className="text-center">
            <input type="hidden" name="id" value={report.id} />
            <ConfirmSubmit
              message={`Delete notice ${report.ref} permanently? Use this for spam only — titles are not affected.`}
              className="text-xs font-semibold text-muted hover:text-danger"
            >
              Delete this notice (spam)
            </ConfirmSubmit>
          </form>
        </aside>
      </div>
    </>
  );
}
