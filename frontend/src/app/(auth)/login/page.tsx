"use client";

import { AuthForm } from "@/components/auth/auth-form";
import { isAuthenticated } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated()) router.replace("/");
  }, [router]);

  return <AuthForm mode="login" />;
}
