"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { useSearchParams } from "next/navigation";
import { GLASS } from "@/lib/glass";
import PageLoader from "@/app/components/PageLoader";

const PLAN_ORDER = ["free", "starter", "pro", "team"];

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  active:   { label: "Active",    cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  past_due: { label: "Past Due",  cls: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" },
  canceled: { label: "Canceled",  cls: "bg-red-500/20 text-red-400 border-red-500/30" },
};

type UserBilling = {
  plan: string;
  planStatus: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
};

export default function BillingPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const [billing, setBilling] = useState<UserBilling | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const successParam = searchParams?.get("success");
  const canceledParam = searchParams?.get("canceled");

  const PLANS = [
    {
      key: "starter",
      name: "Starter",
      price: "$9",
      period: t("billingPerMonth"),
      desc: t("planStarterDesc"),
      features: [t("planStarterF1"), t("planStarterF2"), t("planStarterF3"), t("planStarterF4")],
    },
    {
      key: "pro",
      name: "Pro",
      price: "$29",
      period: t("billingPerMonth"),
      desc: t("planProDesc"),
      features: [t("planProF1"), t("planProF2"), t("planProF3"), t("planProF4")],
      highlight: true,
    },
    {
      key: "team",
      name: "Team",
      price: "$79",
      period: t("billingPerMonth"),
      desc: t("planTeamDesc"),
      features: [t("planTeamF1"), t("planTeamF2"), t("planTeamF3"), t("planTeamF4"), t("planTeamF5")],
    },
  ];

  useEffect(() => {
    if (!user) return;
    const ref = doc(db, "users", user.uid);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setBilling({
          plan:                 d.plan ?? "free",
          planStatus:           d.planStatus ?? null,
          stripeCustomerId:     d.stripeCustomerId ?? null,
          stripeSubscriptionId: d.stripeSubscriptionId ?? null,
        });
      }
      setLoading(false);
    });
    return unsub;
  }, [user]);

  async function handleCheckout(planKey: string) {
    if (!user) return;
    setCheckoutLoading(planKey);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setCheckoutLoading(null);
    }
  }

  async function handlePortal() {
    if (!user) return;
    setPortalLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setPortalLoading(false);
    }
  }

  const currentPlan = billing?.plan ?? "free";
  const currentIdx = PLAN_ORDER.indexOf(currentPlan);
  const statusInfo = billing?.planStatus ? STATUS_LABELS[billing.planStatus] : null;
  const hasPaidPlan = currentPlan !== "free" && billing?.stripeCustomerId;

  if (loading) return <PageLoader label={t("billingLoading")} />;

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-white mb-1">{t("billingTitle")}</h1>
      <p className="text-white/40 text-sm mb-8">{t("billingSubtitle")}</p>

      {successParam === "1" && (
        <div className="mb-6 rounded-xl px-4 py-3 text-sm font-medium bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
          {t("billingSuccessMsg")}
        </div>
      )}
      {canceledParam === "1" && (
        <div className="mb-6 rounded-xl px-4 py-3 text-sm font-medium bg-white/5 border border-white/15 text-white/60">
          {t("billingCanceledMsg")}
        </div>
      )}

      <div className="rounded-2xl p-6 mb-8" style={GLASS}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">{t("billingCurrentPlan")}</p>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white capitalize">{currentPlan.toUpperCase()}</h2>
              {statusInfo && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusInfo.cls}`}>
                  {statusInfo.label}
                </span>
              )}
              {currentPlan === "free" && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-white/5 text-white/40 border-white/15">
                  Free
                </span>
              )}
            </div>
            {billing?.planStatus === "past_due" && (
              <p className="text-yellow-400/80 text-xs mt-2">{t("billingPaymentFailed")}</p>
            )}
          </div>
          {hasPaidPlan && (
            <button
              onClick={handlePortal}
              disabled={portalLoading}
              className="flex-shrink-0 text-sm font-medium px-4 py-2 rounded-lg border border-white/20 text-white/70 hover:bg-white/10 hover:text-white transition disabled:opacity-50"
            >
              {portalLoading ? t("billingManageOpening") : t("billingManageBtn")}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {PLANS.map((plan) => {
          const planIdx = PLAN_ORDER.indexOf(plan.key);
          const isCurrent = currentPlan === plan.key;
          const isDowngrade = planIdx < currentIdx;

          return (
            <div
              key={plan.key}
              className={`relative rounded-2xl p-5 flex flex-col transition-all ${
                plan.highlight ? "ring-1 ring-accent/40" : ""
              }`}
              style={GLASS}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-contrast text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                  {t("billingMostPopular")}
                </span>
              )}
              <p className="text-xs font-semibold text-white/50 mb-1">{plan.name}</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-3xl font-extrabold text-white">{plan.price}</span>
                <span className="text-white/40 text-xs mb-1">{plan.period}</span>
              </div>
              <p className="text-white/40 text-xs mb-4">{plan.desc}</p>
              <ul className="space-y-1.5 mb-5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-white/70">
                    <svg className="w-3.5 h-3.5 text-accent flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="w-full text-center py-2 rounded-lg text-xs font-semibold bg-white/8 border border-white/15 text-white/50 cursor-default">
                  {t("billingCurrentBadge")}
                </div>
              ) : isDowngrade && hasPaidPlan ? (
                <button
                  onClick={handlePortal}
                  disabled={portalLoading}
                  className="w-full text-center py-2 rounded-lg text-xs font-semibold border border-white/20 text-white/60 hover:bg-white/8 transition disabled:opacity-50"
                >
                  {t("billingDowngrade")}
                </button>
              ) : (
                <button
                  onClick={() => handleCheckout(plan.key)}
                  disabled={checkoutLoading === plan.key}
                  className={`w-full text-center py-2 rounded-lg text-xs font-semibold transition disabled:opacity-50 ${
                    plan.highlight
                      ? "bg-accent text-accent-contrast hover:opacity-90"
                      : "border border-white/20 text-white/70 hover:bg-white/10"
                  }`}
                >
                  {checkoutLoading === plan.key ? t("billingProcessing") : t("billingUpgrade")}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
