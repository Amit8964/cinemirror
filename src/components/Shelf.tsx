import type { ReactNode } from "react";

export default function Shelf({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="mt-10">
      <div className="mx-auto flex max-w-7xl items-baseline justify-between px-4 sm:px-6">
        <h2 className="font-display text-2xl tracking-wide sm:text-3xl">{title}</h2>
        {action}
      </div>
      <div className="no-scrollbar mx-auto mt-3 flex max-w-7xl snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pt-1 pb-2 sm:scroll-px-6 sm:gap-4 sm:px-6">
        {children}
      </div>
    </section>
  );
}

export function ShelfItem({ children }: { children: ReactNode }) {
  return <div className="w-[38%] shrink-0 snap-start sm:w-44 lg:w-48">{children}</div>;
}
