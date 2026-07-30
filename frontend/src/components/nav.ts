import {
  ArrowLeftRight,
  ChartNoAxesCombined,
  LayoutDashboard,
  Landmark,
  Repeat,
  Settings,
  Tags,
  Waves,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/cash-flow", label: "Cash Flow", icon: Waves },
  { href: "/accounts", label: "Accounts", icon: Landmark },
  { href: "/investments", label: "Investments", icon: ChartNoAxesCombined },
  { href: "/categories", label: "Categories", icon: Tags },
  { href: "/recurrings", label: "Recurrings", icon: Repeat },
  { href: "/settings", label: "Settings", icon: Settings },
];

// The five slots that fit a phone's bottom bar; the rest live under More.
export const MOBILE_PRIMARY = NAV_ITEMS.slice(0, 5);
export const MOBILE_OVERFLOW = NAV_ITEMS.slice(5);
