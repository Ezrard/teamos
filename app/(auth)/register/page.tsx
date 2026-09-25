"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Eye, EyeOff } from "lucide-react";

const schema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  // Detect invite params
  const inviteToken = searchParams.get("invite");
  const inviteEmail = searchParams.get("email");
  const inviteOrgId = searchParams.get("orgId");
  const inviteRoleId = searchParams.get("roleId");
  const inviteExp = searchParams.get("exp");
  const hasInvite = !!(inviteToken && inviteEmail && inviteOrgId && inviteRoleId && inviteExp);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: inviteEmail ?? "" },
  });

  // Pre-fill email from invite
  useEffect(() => {
    if (inviteEmail) setValue("email", inviteEmail);
  }, [inviteEmail, setValue]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Erreur lors de la création du compte");
        return;
      }

      // Auto sign in
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        router.push("/login");
        return;
      }

      // If there's an invite, accept it to join the org directly
      if (hasInvite) {
        try {
          await fetch("/api/invitations/accept", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token: inviteToken,
              email: data.email,
              orgId: inviteOrgId,
              roleId: inviteRoleId,
              exp: inviteExp,
            }),
          });
        } catch {
          // Accept failed — layout will redirect to onboarding if no org
        }
        router.push("/dashboard");
      } else {
        router.push("/onboarding");
      }
      router.refresh();
    } catch {
      setError("Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const callbackUrl = hasInvite
      ? `/api/invitations/accept-oauth?orgId=${inviteOrgId}&roleId=${inviteRoleId}&token=${inviteToken}&email=${encodeURIComponent(inviteEmail!)}&exp=${inviteExp}`
      : "/onboarding";
    await signIn("google", { callbackUrl });
  };

  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold text-center">Créer un compte</CardTitle>
        {hasInvite && (
          <p className="text-sm text-center text-muted-foreground mt-1">
            Vous avez été invité à rejoindre une organisation.
            <br />Créez votre compte pour accepter l'invitation.
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Google OAuth */}
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
        >
          {googleLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <svg viewBox="0 0 24 24" className="h-4 w-4">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          Continuer avec Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">ou</span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {error}
            </div>
          )}

          <div>
            <Input
              {...register("name")}
              placeholder="Nom complet"
              className="h-10"
              autoComplete="name"
            />
            {errors.name && (
              <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Input
              {...register("email")}
              type="email"
              placeholder="Email professionnel"
              className="h-10"
              autoComplete="email"
              readOnly={hasInvite}
            />
            {errors.email && (
              <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
            )}
          </div>

          <div className="relative">
            <Input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              placeholder="Mot de passe (8 caractères min.)"
              className="h-10 pr-10"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            {errors.password && (
              <p className="text-xs text-destructive mt-1">{errors.password.message}</p>
            )}
          </div>

          <div>
            <Input
              {...register("confirmPassword")}
              type="password"
              placeholder="Confirmer le mot de passe"
              className="h-10"
              autoComplete="new-password"
            />
            {errors.confirmPassword && (
              <p className="text-xs text-destructive mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full h-10" disabled={loading || googleLoading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Créer mon compte
          </Button>
        </form>
      </CardContent>

      <CardFooter className="pt-0">
        <p className="text-sm text-muted-foreground text-center w-full">
          Déjà un compte ?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Se connecter
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
