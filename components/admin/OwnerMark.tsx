"use client";
import { useEffect } from "react";

/**
 * Leaves a small mark in the owner's browser while they use the dashboard (lc_owner, readable by the website's scripts), so
 * the website can offer the owner's own tools: holding Mini Shourobh to carry him anywhere and saving that spot for everyone.
 * It grants nothing by itself; the save checks the real login (saveMascotSpot). Logging out removes it (destroySession).
 */
export default function OwnerMark() {
  useEffect(() => { document.cookie = "lc_owner=1; path=/; max-age=2592000; samesite=lax"; }, []);
  return null;
}
