"use client";

import { useEffect, useState } from "react";
import { getAllProgress, onStorageChange, type ProgressEntry } from "@/lib/storage";
import Shelf, { ShelfItem } from "./Shelf";
import TitleCard from "./TitleCard";

/** Shelf of partly watched titles, read from this browser's storage. */
export default function ContinueWatching({ available }: { available: string[] }) {
  const [items, setItems] = useState<ProgressEntry[]>([]);

  useEffect(() => {
    const load = () => {
      const all = Object.values(getAllProgress())
        .filter((p) => available.includes(p.card.slug) && p.duration > 0)
        .sort((a, b) => b.updatedAt - a.updatedAt);
      setItems(all);
    };
    load();
    return onStorageChange(load);
  }, [available]);

  if (!items.length) return null;
  return (
    <Shelf title="Continue watching">
      {items.map((p) => (
        <ShelfItem key={p.card.slug}>
          <TitleCard card={p.card} progress={p.time / p.duration} href={`/watch/${p.card.slug}`} />
        </ShelfItem>
      ))}
    </Shelf>
  );
}
