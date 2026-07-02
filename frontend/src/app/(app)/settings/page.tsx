"use client";

import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { API_URL } from "@/lib/api";
import { clearToken, isAuthenticated } from "@/lib/auth";
import { useI18n } from "@/providers/I18nProvider";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <>
      <AppHeader
        title={t("settings.title")}
        description={t("settings.description")}
        showCta={false}
      />
      <main className="flex-1 space-y-6 p-6">
        <div className="mx-auto grid max-w-2xl gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("common.workspace")}</CardTitle>
              <CardDescription>
                {t("settings.workspaceDesc", {
                  name: t("product.name"),
                  tagline: t("product.tagline"),
                })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-border py-2">
                <span className="text-muted">{t("common.apiEndpoint")}</span>
                <span className="font-mono text-xs">{API_URL}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted">{t("common.session")}</span>
                <span>
                  {isAuthenticated() ? t("common.activeSession") : t("common.signedOut")}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("common.account")}</CardTitle>
              <CardDescription>{t("settings.accountDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="danger"
                onClick={() => {
                  clearToken();
                  router.replace("/login");
                }}
              >
                <LogOut className="h-4 w-4" />
                {t("nav.signOut")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
