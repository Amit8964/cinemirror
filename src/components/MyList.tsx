"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getList, onStorageChange, toggleList } from "@/lib/storage";
import type { TitleCardData } from "@/lib/types";
import { CheckIcon, PlusIcon } from "./icons";
import TitleCard from "./TitleCard";

export function MyListButton({ card }: { card: TitleCardData }) {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const load = () => setSaved(getList().some((c) => c.slug === card.slug));
    load();
    return onStorageChange(load);
  }, [card.slug]);
  return (
    <button className="btn btn-ghost" onClick={() => setSaved(toggleList(card))} aria-pressed={saved}>
      {saved ? <CheckIcon className="text-accent" /> : <PlusIcon />}
      {saved ? "In My List" : "My List"}
    </button>
  );
}

export function MyListGrid() {
  const [list, setList] = useState<TitleCardData[] | null>(null);
  useEffect(() => {
    const load = () => setList(getList());
    load();
    return onStorageChange(load);
  }, []);

  if (list === null) return <div className="h-40" />;
  if (!list.length) {
    return (
      <div className="mt-10 rounded-xl border border-dashed border-line p-10 text-center">
        <p className="text-lg font-semibold">Your list is empty</p>
        <p className="mt-1 text-sm text-muted">Add films with the “My List” button and they will show up here.</p>
        <Link href="/browse" className="btn btn-primary mt-5">Browse films</Link>
      </div>
    );
  }
  return (
    <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {list.map((c) => <TitleCard key={c.slug} card={c} />)}
    </div>
  );
}
