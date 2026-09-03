"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Settings as SettingsIcon,
  Save,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Globe,
  Eye,
  EyeOff,
  RefreshCw,
  DollarSign,
  Mail,
  Database,
  Download,
  Upload,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/app/page-header";
import { getSettings, saveSettings, getPublishStatus, getBackupStats } from "@/lib/api";

interface SettingsViewProps {
  siteId: string;
}

export function SettingsView({ siteId }: SettingsViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showPwd, setShowPwd] = useState(false);

  const { data: settings = {} } = useQuery({
    queryKey: ["settings", siteId],
    queryFn: () => getSettings(siteId),
  });

  const wpUrl = settings.wp_site_url || "";
  const wpUser = settings.wp_username || "";
  const wpAppPwd = settings.wp_app_password || "";
  const adsenseClientId = settings.adsense_client_id || "";
  const adsenseSlot = settings.adsense_ad_slot || "";
  const [localUrl, setLocalUrl] = useState("");
  const [localUser, setLocalUser] = useState("");
  const [localPwd, setLocalPwd] = useState("");
  const [localClientId, setLocalClientId] = useState("");
  const [localSlot, setLocalSlot] = useState("");

  const currentUrl = localUrl || wpUrl;
  const currentUser = localUser || wpUser;
  const currentPwd = localPwd || wpAppPwd;
  const currentClientId = localClientId || adsenseClientId;
  const currentSlot = localSlot || adsenseSlot;

  const { data: backupStats } = useQuery({
    queryKey: ["backup-stats"],
    queryFn: getBackupStats,
  });

  const handleExportBackup = async () => {
    try {
      const res = await fetch('/api/backup');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Backup exported successfully' });
    } catch (err: unknown) {
      toast({ title: 'Export failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    }
  };

  const { data: wpStatus, refetch: refetchWpStatus } = useQuery({
    queryKey: ["wp-status", siteId],
    queryFn: () => getPublishStatus(siteId),
    enabled: false,
  });

  const saveMutation = useMutation({
    mutationFn: (s: Record<string, string>) => saveSettings(siteId, s),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", siteId] });
      toast({ title: "Settings saved successfully" });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleSave = () => {
    saveMutation.mutate({ wp_site_url: currentUrl, wp_username: currentUser, wp_app_password: currentPwd, adsense_client_id: currentClientId, adsense_ad_slot: currentSlot });
    setLocalUrl(""); setLocalUser(""); setLocalPwd(""); setLocalClientId(""); setLocalSlot("");
  };

  const handleTestConnection = async () => {
    await saveMutation.mutateAsync({ wp_site_url: currentUrl, wp_username: currentUser, wp_app_password: currentPwd, adsense_client_id: currentClientId, adsense_ad_slot: currentSlot });
    const result = await refetchWpStatus();
    if (result.data?.connected) {
      toast({ title: "Connected!", description: result.data.message });
    } else {
      toast({ title: "Connection failed", description: result.data?.message || "Could not connect", variant: "destructive" });
    }
  };

  return (
    <>
      <PageHeader title="Settings" description="Configure your blog automation" />

      <div className="flex flex-1 flex-col gap-6 p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-sky-500/10">
                <Globe className="size-5 text-sky-500" />
              </div>
              <div>
                <CardTitle className="text-base">WordPress Configuration</CardTitle>
                <CardDescription>Connect to your WordPress site for publishing</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="wp-url">Site URL</Label>
              <Input id="wp-url" placeholder="https://morewithai.online" value={currentUrl} onChange={(e) => setLocalUrl(e.target.value)} />
              <p className="text-xs text-muted-foreground">The base URL of your WordPress site (without /wp-json)</p>
            </div>
            <Separator />
            <div className="grid gap-2">
              <Label htmlFor="wp-user">Username</Label>
              <Input id="wp-user" placeholder="admin" value={currentUser} onChange={(e) => setLocalUser(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="wp-pwd">Application Password</Label>
              <div className="relative">
                <Input id="wp-pwd" type={showPwd ? "text" : "password"} placeholder="xxxx xxxx xxxx xxxx" value={currentPwd} onChange={(e) => setLocalPwd(e.target.value)} />
                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 size-7" onClick={() => setShowPwd(!showPwd)}>
                  {showPwd ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Generate an app password in WordPress → Users → Profile → Application Passwords</p>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-1.5">
                {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save Settings
              </Button>
              <Button variant="outline" onClick={handleTestConnection} disabled={saveMutation.isPending} className="gap-1.5">
                <RefreshCw className="size-4" /> Test Connection
              </Button>
            </div>
            {wpStatus && (
              <div className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${wpStatus.connected ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300" : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"}`}>
                {wpStatus.connected ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
                {wpStatus.message}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Email Provider Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-violet-500/10">
                <Mail className="size-5 text-violet-500" />
              </div>
              <div>
                <CardTitle className="text-base">Email Provider</CardTitle>
                <CardDescription>Configure how transactional emails are sent (password resets, notifications)</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="email-provider">Provider</Label>
              <Select
                value={settings.email_provider || 'log'}
                onValueChange={(val) => saveMutation.mutate({ email_provider: val })}
              >
                <SelectTrigger id="email-provider">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="log">Log Only (Development)</SelectItem>
                  <SelectItem value="resend">Resend</SelectItem>
                  <SelectItem value="sendgrid">SendGrid</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {settings.email_provider === 'resend'
                  ? 'Set RESEND_API_KEY in your environment variables'
                  : settings.email_provider === 'sendgrid'
                    ? 'Set SENDGRID_API_KEY in your environment variables'
                    : 'Emails will be logged to the server console. Configure Resend or SendGrid to send real emails.'}
              </p>
            </div>
            {(settings.email_provider === 'resend' || settings.email_provider === 'sendgrid') && (
              <div className="grid gap-2">
                <Label htmlFor="email-from">From Address</Label>
                <Input
                  id="email-from"
                  placeholder="noreply@morewithai.online"
                  value={settings.email_from || ''}
                  onChange={(e) => {
                    // Store locally, save on button click
                  }}
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  Set EMAIL_FROM in your environment variables to override the default address.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AdSense Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10">
                <DollarSign className="size-5 text-emerald-500" />
              </div>
              <div>
                <CardTitle className="text-base">Google AdSense</CardTitle>
                <CardDescription>Auto-insert ad blocks into published articles</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="adsense-client">Ad Client ID (ca-pub-...)</Label>
              <Input id="adsense-client" placeholder="ca-pub-1234567890123456" value={currentClientId} onChange={(e) => setLocalClientId(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="adsense-slot">Ad Slot ID</Label>
              <Input id="adsense-slot" placeholder="1234567890" value={currentSlot} onChange={(e) => setLocalSlot(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">
              Ad blocks will be inserted after the 2nd paragraph and at the end of each article when published. You can toggle ads per-article in the article detail panel.
            </p>
          </CardContent>
        </Card>

        {/* Backup & Recovery */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10">
                <Database className="size-5 text-amber-500" />
              </div>
              <div>
                <CardTitle className="text-base">Backup & Recovery</CardTitle>
                <CardDescription>Export your data for disaster recovery</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {backupStats && (
              <div className="rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted-foreground">Total Records</span>
                  <span className="font-medium">{backupStats.totalRecords.toLocaleString()}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {backupStats.models.filter(m => m.count > 0).length} tables with data
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Export your entire database as a JSON file for backup or migration. This includes all articles, subscribers, settings, and analytics data.
            </p>
            <Button onClick={handleExportBackup} variant="outline" className="gap-1.5">
              <Download className="size-4" /> Export Backup
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-violet-500/10">
                <SettingsIcon className="size-5 text-violet-500" />
              </div>
              <div>
                <CardTitle className="text-base">About</CardTitle>
                <CardDescription>MoreWithAI Blog Automation</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Version</span>
                <Badge variant="secondary">0.1.0</Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Blog</span>
                <a href="https://morewithai.online" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sky-500 hover:underline">
                  morewithai.online <ExternalLink className="size-3" />
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}