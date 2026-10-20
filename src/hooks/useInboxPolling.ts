import { useEffect } from "react";
import { useInboxStore } from "@/stores/inboxStore";

export function useInboxPolling() {
  const fetchInbox = useInboxStore((s) => s.fetchInbox);

  useEffect(() => {
    fetchInbox();

    const interval = setInterval(() => {
      // Poll faster if document is focused
      if (!document.hidden) {
        fetchInbox();
      }
    }, 3000);

    const onFocus = () => {
      fetchInbox();
    };
    const onVisibilityChange = () => {
      if (!document.hidden) {
        fetchInbox();
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [fetchInbox]);
}
