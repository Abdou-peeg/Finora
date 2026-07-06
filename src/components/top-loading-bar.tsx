"use client";

import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export function TopLoadingBar() {
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const active = isFetching > 0 || isMutating > 0;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (active) {
      setVisible(true);
    } else {
      // petit délai avant de masquer pour éviter un clignotement sur les requêtes très rapides
      timeout = setTimeout(() => setVisible(false), 250);
    }
    return () => clearTimeout(timeout);
  }, [active]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-[3px] overflow-hidden bg-transparent pointer-events-none">
      <div
        className={`h-full bg-[#0d5d4a] ${active ? "top-loading-bar-active" : "top-loading-bar-done"}`}
      />
    </div>
  );
}