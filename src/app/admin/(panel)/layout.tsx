import type { Metadata } from "next";
import Link from "next/link";
import { logoutAction } from "@/app/admin/actions";
import AdminNav from "@/components/admin/AdminNav";
import { Logo } from "@/components/SiteChrome";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "Admin", template: "%s · MovieHub admin" }, robots: { index: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireAdmin();
  return (
    <div className="flex min-h-dvh flex-1 flex-col lg:flex-row">
      <aside className="border-b border-line bg-surface lg:sticky lg:top-0 lg:h-dvh lg:w-60 lg:shrink-0 lg:border-r lg:border-b-0">
        <div className="flex items-center gap-4 px-4 py-3 lg:block lg:px-5 lg:py-6">
          <Link href="/admin" className="block"><Logo className="!text-2xl" /></Link>
          <p className="hidden text-xs font-semibold tracking-wider text-muted uppercase lg:mt-1 lg:block">Admin</p>
          <div className="ml-auto lg:mt-6 lg:ml-0"><AdminNav /></div>
        </div>
        <div className="hidden px-5 lg:absolute lg:inset-x-0 lg:bottom-0 lg:block lg:pb-6">
          <p className="truncate text-xs text-muted">{admin.email}</p>
          <div className="mt-2 flex gap-2">
            <Link href="/" className="btn btn-ghost !px-3 !py-1.5 !text-xs">View site</Link>
            <form action={logoutAction}><button className="btn btn-ghost !px-3 !py-1.5 !text-xs">Sign out</button></form>
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">{children}</div>
        <div className="flex gap-2 px-4 pb-8 lg:hidden">
          <Link href="/" className="btn btn-ghost !px-3 !py-1.5 !text-xs">View site</Link>
          <form action={logoutAction}><button className="btn btn-ghost !px-3 !py-1.5 !text-xs">Sign out</button></form>
        </div>
      </div>
    </div>
  );
}
