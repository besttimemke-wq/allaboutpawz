"use client";

// ---------------------------------------------------------------------------
// Tracking islands — client-side GA4 view events for server-rendered pages.
//   <TrackViewItemList /> — fires view_item_list once a listing (PLP) mounts.
//   <TrackViewItem />     — fires view_item once a product detail mounts.
// Server components pass plain data in; nothing renders (return null), so
// the SSR markup is untouched.
// ---------------------------------------------------------------------------

import { useEffect, useRef } from "react";
import { track, type AnalyticsItem } from "@/lib/analytics";

export function TrackViewItemList({
  listId,
  listName,
  items,
}: {
  listId: string;
  listName: string;
  items: AnalyticsItem[];
}) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current || items.length === 0) return;
    fired.current = true;
    track.viewItemList(listId, listName, items);
    // listId/listName only identify the list — refire when the item set
    // actually changes (pagination/filters remount the island anyway).
  }, [listId, listName, items]);
  return null;
}

export function TrackViewItem({ item }: { item: AnalyticsItem }) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    track.viewItem(item);
  }, [item]);
  return null;
}
