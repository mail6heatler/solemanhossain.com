"use client";
import { useEffect } from "react";

/** tells the site's own scripts the owner is here (past maintenance or private mode; visits not counted unless they choose).
 *  Signing in sets it too; this covers devices signed in before it existed. Signing out removes it. */
export default function OwnerMark() {
  useEffect(() => {
    if (!/(?:^|; )lc_owner=1/.test(document.cookie)) document.cookie = `lc_owner=1; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax${location.protocol === "https:" ? "; secure" : ""}`;
  }, []);
  return null;
}
