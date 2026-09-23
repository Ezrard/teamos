"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Building2, Users, CheckCircle2 } from "lucide-react";

const schema = z.object({
  name: z.string().min(2, "Le nom de l'organisation doit contenir au moins 2 caractères").max(200),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, "Uniquement lettres minuscules, chiffres et tirets"),
  industry: z.string().optional(),
  size: z.enum(["1-10", "11-50", "51-200", "200+"]).optional().default("1-10"),
});

type FormData = z.infer<typeof schema>;

const INDUSTRIES = [
  "Technologie", "Marketing & Agence", "Conseil", "Finance",
  "Santé", "E-commerce", "Éducation", "Immobilier", "Autre",
];

const TEAM_SIZES = [
  { value: "1-10", label: "1–10 personnes", desc: "Petite équipe ou startup" },
  { value: "11-50", label: "11–50 personnes", desc: "Équipe en croissance" },
  { value: "51-200", label: "51–200 personnes", desc: "Moyenne entreprise" },
  { value: "200+", label: "200+ personnes", desc: "Grande organisation" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<1 | 2>(1);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: { size: "1-10" },
  });

  const selectedSize = watch("size");
  const orgName = watch("name");

  // Auto-generate slug from name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setValue("name", value);
    const slug = value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 50);
    setValue("slug", slug);
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Erreur lors de la création");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-2">
        <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold transition-colors ${step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
          {step > 1 ? <CheckCircle2 className="h-4 w-4" /> : "1"}
        </div>
        <div className={`flex-1 h-0.5 transition-colors ${step > 1 ? "bg-primary" : "bg-muted"}`} />
        <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold transition-colors ${step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
          2
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {step === 1 ? (
          <div className="bg-card rounded-xl border shadow-lg p-6 space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Votre organisation</h2>
                <p className="text-sm text-muted-foreground">Donnez un nom à votre espace de travail</p>
              </div>
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                {error}
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Nom de l'organisation *
              </label>
              <Input
                value={orgName ?? ""}
                onChange={handleNameChange}
                placeholder="Ex: Acme Corp, Mon Agence..."
                className="h-10"
                autoFocus
              />
              {errors.name && (
                <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Identifiant unique (URL)
              </label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground whitespace-nowrap">teamos.app/</span>
                <Input
                  {...register("slug")}
                  placeholder="mon-organisation"
                  className="h-10"
                />
              </div>
              {errors.slug && (
                <p className="text-xs text-destructive mt-1">{errors.slug.message}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Secteur d'activité
              </label>
              <select
                {...register("industry")}
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Sélectionner...</option>
                {INDUSTRIES.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>

            <Button
              type="button"
              className="w-full h-10"
              onClick={() => setStep(2)}
              disabled={!orgName || orgName.length < 2}
            >
              Continuer
            </Button>
          </div>
        ) : (
          <div className="bg-card rounded-xl border shadow-lg p-6 space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Taille de l'équipe</h2>
                <p className="text-sm text-muted-foreground">Pour personnaliser votre expérience</p>
              </div>
            </div>

            <div className="space-y-2">
              {TEAM_SIZES.map((size) => (
                <button
                  key={size.value}
                  type="button"
                  onClick={() => setValue("size", size.value as FormData["size"])}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                    selectedSize === size.value
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border hover:border-primary/30 hover:bg-muted/30"
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 shrink-0 transition-colors ${
                    selectedSize === size.value ? "border-primary bg-primary" : "border-muted-foreground"
                  }`}>
                    {selectedSize === size.value && (
                      <div className="w-full h-full rounded-full flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{size.label}</p>
                    <p className="text-xs text-muted-foreground">{size.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-10"
                onClick={() => setStep(1)}
              >
                Retour
              </Button>
              <Button type="submit" className="flex-1 h-10" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Créer l'espace
              </Button>
            </div>
          </div>
        )}
      </form>

      <p className="text-center text-xs text-muted-foreground">
        Vous pouvez modifier ces informations à tout moment dans les paramètres
      </p>
    </div>
  );
}
