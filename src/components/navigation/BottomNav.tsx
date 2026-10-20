import React from "react";
import { useRouter, RoutePath } from "@/app/router";
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  CalendarRange, 
  Handshake, 
  PieChart 
} from "lucide-react";

interface NavItem {
  name: string;
  path: RoutePath;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { name: "Home", path: "/", icon: LayoutDashboard },
  { name: "Activity", path: "/transactions", icon: ArrowLeftRight },
  { name: "Budget & Plan", path: "/plans", icon: CalendarRange },
  { name: "Borrow/Lend", path: "/borrow-lend", icon: Handshake },
  { name: "Overview", path: "/overview", icon: PieChart },
];

export const BottomNav: React.FC = () => {
  const { route, navigate } = useRouter();

  return (
    <nav 
      aria-label="Mobile Navigation" 
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#141414]/95 backdrop-blur-md border-t border-[#262626] pb-safe"
    >
      <div className="grid grid-cols-5 items-center h-16 max-w-lg mx-auto px-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = route === item.path;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center justify-center min-h-[44px] min-w-[44px] py-1 transition-colors select-none group"
              aria-current={isActive ? "page" : undefined}
              aria-label={item.name}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform group-active:scale-90 ${
                    isActive ? "text-emerald-400 stroke-[2.2]" : "text-[#71717A]"
                  }`}
                />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-400 rounded-full" />
                )}
              </div>
              <span
                className={`text-[10px] font-medium tracking-tight mt-1 truncate ${
                  isActive ? "text-[#F5F5F5] font-semibold" : "text-[#71717A]"
                }`}
              >
                {item.name}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
