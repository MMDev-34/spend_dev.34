import { useEffect, useRef } from "react";
import { useNotificationCenter } from "./useNotificationCenter";

const PUSHED_CACHE_KEY = "spend_pushed_alerts_cache_v1";

function isInsideQuietHours(start: string, end: string): boolean {
  try {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = start.split(":").map(Number);
    const [endH, endM] = end.split(":").map(Number);
    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;

    if (startMins <= endMins) {
      return currentMins >= startMins && currentMins < endMins;
    } else {
      // Wraps over midnight (e.g. 22:00 to 08:00)
      return currentMins >= startMins || currentMins < endMins;
    }
  } catch {
    return false;
  }
}

export function useNotificationScheduler() {
  const { allNotifications, preferences, urgentCount } = useNotificationCenter();
  const lastTitleCount = useRef<number>(-1);

  // 1. Dynamic Document Title Badge
  useEffect(() => {
    if (typeof document === "undefined") return;
    const baseTitle = "Spend - Personal Expense Tracker";

    if (urgentCount > 0) {
      if (lastTitleCount.current !== urgentCount) {
        document.title = `(${urgentCount}) ${baseTitle}`;
        lastTitleCount.current = urgentCount;
      }
    } else {
      if (lastTitleCount.current > 0) {
        document.title = baseTitle;
        lastTitleCount.current = 0;
      }
    }
  }, [urgentCount]);

  // 2. Background Browser Push Evaluation
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted" || !preferences.enableBrowserPush) return;

    // Check quiet hours
    if (preferences.quietHoursEnabled && isInsideQuietHours(preferences.quietHoursStart, preferences.quietHoursEnd)) {
      return;
    }

    const checkAndDispatch = () => {
      try {
        const todayStr = new Date().toISOString().slice(0, 10);
        let pushedCache: Record<string, string> = {};
        const raw = localStorage.getItem(PUSHED_CACHE_KEY);
        if (raw) {
          try {
            pushedCache = JSON.parse(raw);
          } catch {}
        }

        // Clean up cache entries older than 3 days
        const threeDaysAgo = Date.now() - 3 * 86400000;
        const cleanedCache: Record<string, string> = {};
        for (const [k, v] of Object.entries(pushedCache)) {
          if (new Date(v).getTime() > threeDaysAgo) {
            cleanedCache[k] = v;
          }
        }

        // Find high-priority items due today or overdue
        const urgentItems = allNotifications.filter(
          (n) => (n.bucket === "today" || n.bucket === "overdue") && !n.isSnoozed
        );

        let dispatchedAny = false;
        for (const item of urgentItems) {
          const cacheKey = `${item.id}-${todayStr}`;
          if (!cleanedCache[cacheKey]) {
            // Dispatch browser notification
            new Notification(item.title, {
              body: `${item.categoryName ? `[${item.categoryName}] ` : ""}${item.description}`,
              icon: "/favicon.svg",
              tag: item.id,
            });
            cleanedCache[cacheKey] = new Date().toISOString();
            dispatchedAny = true;
            // Only fire at most one native push alert per interval cycle to avoid spamming user
            break;
          }
        }

        if (dispatchedAny) {
          localStorage.setItem(PUSHED_CACHE_KEY, JSON.stringify(cleanedCache));
        }
      } catch (e) {
        console.error("Failed to run notification scheduler push:", e);
      }
    };

    // Run check on mount and visibility change
    checkAndDispatch();

    const intervalId = window.setInterval(checkAndDispatch, 60 * 1000); // Check every minute
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        checkAndDispatch();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [allNotifications, preferences]);
}
