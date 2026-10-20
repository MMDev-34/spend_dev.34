import { useState, useEffect, useCallback, createContext, useContext } from "react";

export type RoutePath =
  | "/"
  | "/transactions"
  | "/plans"
  | "/overview"
  | "/borrow-lend"
  | "/settings"
  | "/profile"
  | "/account-settings"
  | "/notifications"
  | "/auth"
  | "/login"
  | "/signup";

interface RouterContextType {
  route: RoutePath;
  navigate: (path: RoutePath) => void;
}

const RouterContext = createContext<RouterContextType>({
  route: "/",
  navigate: () => {},
});

function getRouteFromLocation(): RoutePath {
  if (typeof window === "undefined") return "/";

  // Check hash first (e.g. #/transactions or #transactions)
  const hash = window.location.hash.replace(/^#\/?/, "");
  if (hash === "transactions") return "/transactions";
  if (hash === "plans" || hash === "calendar") return "/plans";
  if (hash === "overview") return "/overview";
  if (hash === "borrow-lend" || hash === "loans") return "/borrow-lend";
  if (hash === "settings") return "/settings";
  if (hash === "profile") return "/profile";
  if (hash === "account-settings" || hash === "account") return "/account-settings";
  if (hash === "notifications") return "/notifications";
  if (hash === "auth" || hash === "login" || hash === "signup") return "/auth";

  // Check pathname
  const path = window.location.pathname;
  if (path === "/transactions") return "/transactions";
  if (path === "/plans" || path === "/calendar") return "/plans";
  if (path === "/overview") return "/overview";
  if (path === "/borrow-lend" || path === "/loans") return "/borrow-lend";
  if (path === "/settings") return "/settings";
  if (path === "/profile") return "/profile";
  if (path === "/account-settings" || path === "/account") return "/account-settings";
  if (path === "/notifications") return "/notifications";
  if (path === "/auth" || path === "/login" || path === "/signup") return "/auth";

  return "/";
}

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [route, setRoute] = useState<RoutePath>(getRouteFromLocation);

  useEffect(() => {
    const handleLocationChange = () => {
      setRoute(getRouteFromLocation());
    };

    window.addEventListener("popstate", handleLocationChange);
    window.addEventListener("hashchange", handleLocationChange);

    return () => {
      window.removeEventListener("popstate", handleLocationChange);
      window.removeEventListener("hashchange", handleLocationChange);
    };
  }, []);

  const navigate = useCallback((path: RoutePath) => {
    if (window.location.protocol === "file:") {
      window.location.hash = path.replace(/^\//, "");
    } else {
      try {
        window.history.pushState({}, "", path);
      } catch {
        window.location.hash = path.replace(/^\//, "");
      }
    }
    setRoute(path);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  return (
    <RouterContext.Provider value={{ route, navigate }}>
      {children}
    </RouterContext.Provider>
  );
};

export const useRouter = () => useContext(RouterContext);
