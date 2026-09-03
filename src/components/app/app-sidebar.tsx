"use client";

import {
  LayoutDashboard,
  FileText,
  Settings,
  CreditCard,
  Bot,
  Globe,
  LogOut,
  ChevronDown,
  RefreshCw,
  // Content
  Sparkles,
  Lightbulb,
  Calendar,
  Brain,
  // Growth
  BarChart3,
  Search,
  Network,
  TrendingDown,
  // Monetization
  DollarSign,
  Link2,
  Package,
  MousePointerClick,
  Gift,
  Megaphone,
  LayoutTemplate,
  Image,
  // Audience
  Users,
  Mail,
  Workflow,
  // Portfolio
  PieChart,
  // Platform
  Bell,
  Layers,
  History,
  Webhook as WebhookIcon,
  // Marketplace
  GraduationCap,
  Handshake,
  Palette,
} from "lucide-react";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { useQuery } from "@tanstack/react-query";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { getSites } from "@/lib/api";
import type { Site } from "@/lib/api";
import { useState } from "react";

interface NavGroup {
  label: string;
  items: { key: string; title: string; icon: React.ComponentType<{ className?: string }> }[];
}

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { key: "portfolio", title: "Portfolio", icon: PieChart },
      { key: "dashboard", title: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Content",
    items: [
      { key: "articles", title: "Articles", icon: FileText },
      { key: "ai-writer", title: "AI Writer", icon: Sparkles },
      { key: "calendar", title: "Planner", icon: Calendar },
      { key: "intelligence", title: "Intelligence", icon: Brain },
      { key: "opportunities", title: "Opportunities", icon: Lightbulb },
      { key: "clusters", title: "Clusters", icon: Network },
    ],
  },
  {
    label: "Growth",
    items: [
      { key: "analytics", title: "Analytics", icon: BarChart3 },
      { key: "seo", title: "SEO", icon: Search },
      { key: "automations", title: "Experiments", icon: Workflow },
      { key: "automation", title: "Review Queue", icon: RefreshCw },
      { key: "content-decay", title: "Content Decay", icon: TrendingDown },
    ],
  },
  {
    label: "Monetization",
    items: [
      { key: "revenue", title: "Revenue", icon: DollarSign },
      { key: "affiliates", title: "Affiliates", icon: Link2 },
      { key: "products", title: "Products", icon: Package },
      { key: "ads", title: "Ads", icon: Megaphone },
      { key: "landing-pages", title: "Landing Pages", icon: LayoutTemplate },
      { key: "paid-newsletters", title: "Paid Newsletters", icon: Mail },
      { key: "courses", title: "Courses", icon: GraduationCap },
    ],
  },
  {
    label: "Marketplace",
    items: [
      { key: "sponsored", title: "Sponsored Content", icon: Handshake },
      { key: "white-label", title: "White-Label Portal", icon: Palette },
    ],
  },
  {
    label: "Tools",
    items: [
      { key: "ctas", title: "CTAs", icon: MousePointerClick },
      { key: "lead-magnets", title: "Lead Magnets", icon: Gift },
      { key: "media", title: "Media Library", icon: Image },
    ],
  },
  {
    label: "Audience",
    items: [
      { key: "subscribers", title: "Subscribers", icon: Users },
      { key: "email", title: "Email", icon: Mail },
    ],
  },
  {
    label: "Platform",
    items: [
      { key: "custom-dashboard", title: "Dashboard Widgets", icon: LayoutDashboard },
      { key: "alerts", title: "Performance Alerts", icon: Bell },
      { key: "bulk-ops", title: "Bulk Operations", icon: Layers },
      { key: "audit", title: "Audit Trail", icon: History },
      { key: "webhooks", title: "Webhooks", icon: WebhookIcon },
    ],
  },
  {
    label: "Command Centre",
    items: [
      { key: "command-dashboard", title: "Dashboard", icon: LayoutDashboard },
      { key: "command-events", title: "Events", icon: Globe },
      { key: "command-attribution", title: "Attribution", icon: DollarSign },
      { key: "command-competitors", title: "Competitors", icon: Search },
      { key: "command-workflows", title: "Workflows", icon: Workflow },
      { key: "command-agents", title: "Agents", icon: Bot },
      { key: "command-economics", title: "Economics", icon: PieChart },
    ],
  },
  {
    label: "System",
    items: [
      { key: "feeds", title: "RSS Feeds", icon: RefreshCw },
      { key: "billing", title: "Billing", icon: CreditCard },
      { key: "settings", title: "Settings", icon: Settings },
    ],
  },
];

interface AppSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  selectedSiteId: string;
  onSelectSite: (id: string) => void;
  onLogout: () => void;
  onGoPublic: () => void;
}

export function AppSidebar({ activeView, onViewChange, selectedSiteId, onSelectSite, onLogout, onGoPublic }: AppSidebarProps) {
  const { data: sites = [] } = useQuery({ queryKey: ["sites"], queryFn: getSites });
  const currentSite = sites.find((s: Site) => s.id === selectedSiteId);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (label: string) => {
    setCollapsedGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="hover:bg-sidebar-accent">
                  <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                    <Bot className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{currentSite?.name || "MoreWithAI"}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {currentSite?.slug || "Select a site"}
                    </span>
                  </div>
                  <ChevronDown className="size-3.5" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {sites.length === 0 && (
                  <DropdownMenuItem disabled>No sites yet</DropdownMenuItem>
                )}
                {sites.map((site: Site) => (
                  <DropdownMenuItem key={site.id} onClick={() => onSelectSite(site.id)}>
                    <Globe className="size-4" />
                    <div className="flex flex-col">
                      <span className="text-sm">{site.name}</span>
                      <span className="text-xs text-muted-foreground">/{site.slug}</span>
                    </div>
                    {site.id === selectedSiteId && <span className="ml-auto text-xs text-primary">Active</span>}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onViewChange("sites")}>
                  <RefreshCw className="size-4" /> Manage Sites
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel
              className="cursor-pointer select-none hover:text-foreground transition-colors"
              onClick={() => toggleGroup(group.label)}
            >
              {group.label}
              <span className="ml-auto text-xs text-muted-foreground">
                {collapsedGroups[group.label] ? "+" : "-"}
              </span>
            </SidebarGroupLabel>
            {!collapsedGroups[group.label] && (
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuButton
                        isActive={activeView === item.key}
                        tooltip={item.title}
                        onClick={() => onViewChange(item.key)}
                      >
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            )}
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="View blog" onClick={onGoPublic}>
              <Globe className="size-4" />
              <span>View Blog</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <ThemeToggle className="size-8" />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Sign out" onClick={onLogout} className="text-destructive hover:text-destructive">
              <LogOut className="size-4" />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
