"use client";

import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { setToken } from "@/lib/auth";
import { useI18n } from "@/providers/I18nProvider";
import { useMutation } from "@tanstack/react-query";
import { Inbox } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const isRegister = mode === "register";

  const mutation = useMutation({
    mutationFn: () =>
      mode === "login" ? api.login(email, password) : api.register(email, password),
    onSuccess: (data) => {
      setToken(data.access_token);
      router.push("/");
    },
  });

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="flex justify-end">
        <LanguageSwitcher />
      </div>
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/20">
          <Inbox className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t("product.name")}
        </h1>
        <p className="mt-2 text-sm text-muted">{t("auth.tagline")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isRegister ? t("auth.createAccount") : t("auth.signIn")}</CardTitle>
          <CardDescription>
            {isRegister ? t("auth.registerDesc") : t("auth.loginDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t("auth.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t("auth.passwordPlaceholder")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending
                ? "..."
                : isRegister
                  ? t("auth.createAccount")
                  : t("auth.signIn")}
            </Button>
            {mutation.isError && (
              <p className="text-sm text-danger">{(mutation.error as Error).message}</p>
            )}
          </form>
          <p className="mt-6 text-center text-sm text-muted">
            {isRegister ? (
              <>
                {t("auth.alreadyHave")}{" "}
                <Link href="/login" className="text-primary hover:underline">
                  {t("auth.signIn")}
                </Link>
              </>
            ) : (
              <>
                {t("auth.noAccount")}{" "}
                <Link href="/register" className="text-primary hover:underline">
                  {t("auth.register")}
                </Link>
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
