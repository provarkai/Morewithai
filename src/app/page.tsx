"use client";

import { useState, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/app-sidebar";
import { LoginGate } from "@/components/login-gate";
import { ForgotPassword } from "@/components/auth/forgot-password";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { BlogHomeView } from "@/components/blog/blog-home-view";
import { BlogArticleView } from "@/components/blog/blog-article-view";
import { DashboardView } from "@/components/views/dashboard-view";
import { FeedsView } from "@/components/views/feeds-view";
import { ArticlesView } from "@/components/views/articles-view";
import { AutomationView } from "@/components/views/automation-view";
import { SettingsView } from "@/components/views/settings-view";
import { SitesView } from "@/components/views/sites-view";
import { ArticleEditor } from "@/components/editor/article-editor";
import { RevenueView } from "@/components/views/revenue-view";
import { AnalyticsView } from "@/components/views/analytics-view";
import { SubscribersView } from "@/components/views/subscribers-view";
import { EmailView } from "@/components/views/email-view";
import { CtasView } from "@/components/views/ctas-view";
import { AffiliatesView } from "@/components/views/affiliates-view";
import { ProductsView } from "@/components/views/products-view";
import { LeadMagnetsView } from "@/components/views/lead-magnets-view";
import { AdsView } from "@/components/views/ads-view";
import { OpportunitiesView } from "@/components/views/opportunities-view";
import { ClustersView } from "@/components/views/clusters-view";
import { CalendarView } from "@/components/views/calendar-view";
import { AutomationsView } from "@/components/views/automations-view";
import { MediaView } from "@/components/views/media-view";
import { LandingPagesView } from "@/components/views/landing-pages-view";
import { ContentDecayView } from "@/components/views/content-decay-view";
import { IntelligenceView } from "@/components/views/intelligence-view";
import { PortfolioView } from "@/components/views/portfolio-view";
import { BillingView } from "@/components/views/billing-view";
import { getSites, logout } from "@/lib/api";
import type { Article } from "@/lib/api";
import { PageHeader } from "@/components/app/page-header";

type AppMode = "public" | "admin";

export default function HomePage() {
  const [mode, setMode] = useState<AppMode>("public");
  const [activeView, setActiveView] = useState("dashboard");
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [readingArticle, setReadingArticle] = useState<Article | null>(null);
  const [authed, setAuthed] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'forgot-password'>('login');
  const queryClient = useQueryClient();
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);

  const { data: sessionData } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const res = await fetch('/api/auth/session', { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  useEffect(() => {
    if (sessionData?.authenticated) {
      setAuthed(true);
      setMode("admin");
    }
  }, [sessionData]);

  const { data: sites = [] } = useQuery({
    queryKey: ["sites"],
    queryFn: getSites,
  });

  const effectiveSiteId = selectedSiteId || (sites.length > 0 ? sites[0].id : "");
  const handleSelectSite = useCallback((id: string) => { setSelectedSiteId(id); }, []);
  const currentSite = sites.find((s) => s.id === effectiveSiteId);
  const siteName = currentSite?.name || "MoreWithAI";

  const handleAuth = useCallback(() => {
    setAuthed(true);
    setMode("admin");
    if (sites.length > 0) setSelectedSiteId(sites[0].id);
  }, [sites]);

  const handleLogout = useCallback(async () => {
    await logout();
    setAuthed(false);
    setMode("public");
    setReadingArticle(null);
    setEditingArticleId(null);
  }, []);

  const handleEditArticle = useCallback((articleId: string) => {
    setEditingArticleId(articleId);
  }, []);

  const handleEditorBack = useCallback(() => {
    setEditingArticleId(null);
  }, []);

  const handleEditorNavigate = useCallback((_direction: 'prev' | 'next') => {}, []);

  const handleViewChange = useCallback((view: string) => {
    setActiveView(view);
    setEditingArticleId(null);
  }, []);

  if (mode === "public") {
    if (readingArticle && effectiveSiteId) {
      return <BlogArticleView siteId={effectiveSiteId} siteName={siteName} article={readingArticle} onBack={() => setReadingArticle(null)} onGoAdmin={() => setMode("admin")} />;
    }
    if (sites.length === 0) {
      return (
        <div className="flex min-h-svh items-center justify-center p-4">
          <div className="text-center">
            <p className="mb-2 text-lg font-medium">Welcome to MoreWithAI</p>
            <p className="text-sm text-muted-foreground">Sign in to create your first blog site.</p>
            <button className="mt-4 text-sm text-primary underline hover:no-underline" onClick={() => setMode("admin")}>Go to Admin</button>
          </div>
        </div>
      );
    }
    if (effectiveSiteId) {
      return <BlogHomeView siteId={effectiveSiteId} siteName={siteName} onReadArticle={setReadingArticle} onGoAdmin={() => setMode("admin")} />;
    }
  }

  if (!authed) {
    if (authView === 'forgot-password') {
      return <ForgotPassword onBack={() => setAuthView('login')} />;
    }
    return <LoginGate onAuth={handleAuth} onForgotPassword={() => setAuthView('forgot-password')} />;
  }

  if (sites.length === 0) {
    return <OnboardingWizard onComplete={() => queryClient.invalidateQueries({ queryKey: ['sites'] })} />;
  }

  if (editingArticleId && effectiveSiteId) {
    return (
      <ArticleEditor
        articleId={editingArticleId}
        siteId={effectiveSiteId}
        onBack={handleEditorBack}
        onNavigate={handleEditorNavigate}
      />
    );
  }

  const renderView = () => {
    if (!effectiveSiteId) return null;
    switch (activeView) {
      case "sites": return <SitesView onSelectSite={(id) => { handleSelectSite(id); setActiveView("dashboard"); }} selectedSiteId={effectiveSiteId} />;
      case "portfolio": return <PortfolioView siteId={effectiveSiteId} />;
      case "dashboard": return <DashboardView siteId={effectiveSiteId} onEditArticle={handleEditArticle} />;
      case "feeds": return <FeedsView siteId={effectiveSiteId} />;
      case "articles": return <ArticlesView siteId={effectiveSiteId} onEditArticle={handleEditArticle} />;
      case "automation": return <AutomationView siteId={effectiveSiteId} />;
      case "settings": return <SettingsView siteId={effectiveSiteId} />;
      case "revenue": return <RevenueView siteId={effectiveSiteId} onEditArticle={handleEditArticle} />;
      case "analytics": return <AnalyticsView siteId={effectiveSiteId} />;
      case "subscribers": return <SubscribersView siteId={effectiveSiteId} />;
      case "email": return <EmailView siteId={effectiveSiteId} />;
      case "ctas": return <CtasView siteId={effectiveSiteId} />;
      case "affiliates": return <AffiliatesView siteId={effectiveSiteId} />;
      case "products": return <ProductsView siteId={effectiveSiteId} />;
      case "lead-magnets": return <LeadMagnetsView siteId={effectiveSiteId} />;
      case "ads": return <AdsView siteId={effectiveSiteId} />;
      case "opportunities": return <OpportunitiesView siteId={effectiveSiteId} onEditArticle={handleEditArticle} />;
      case "clusters": return <ClustersView siteId={effectiveSiteId} />;
      case "calendar": return <CalendarView siteId={effectiveSiteId} />;
      case "automations": return <AutomationsView siteId={effectiveSiteId} />;
      case "media": return <MediaView siteId={effectiveSiteId} />;
      case "landing-pages": return <LandingPagesView siteId={effectiveSiteId} />;
      case "content-decay": return <ContentDecayView siteId={effectiveSiteId} />;
      case "intelligence": return <IntelligenceView siteId={effectiveSiteId} onEditArticle={handleEditArticle} />;
      case "billing": return <BillingView />
      case "ai-writer": return <ArticlesView siteId={effectiveSiteId} onEditArticle={handleEditArticle} />;
      case "seo": return <AnalyticsView siteId={effectiveSiteId} />;
      default: return <DashboardView siteId={effectiveSiteId} onEditArticle={handleEditArticle} />;
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar activeView={activeView} onViewChange={handleViewChange} selectedSiteId={selectedSiteId} onSelectSite={handleSelectSite} onLogout={handleLogout} onGoPublic={() => { setMode("public"); setReadingArticle(null); }} />
      <SidebarInset className="flex min-h-svh flex-col">
        {renderView()}
      </SidebarInset>
    </SidebarProvider>
  );
}
