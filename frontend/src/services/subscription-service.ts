import { apiFetch } from "@/lib/http-client";
import type { AdminSubscribersResponse, CheckoutResponse, Coupon, Subscription, SubscriptionCycle } from "@/types/api";

export const subscriptionApi = {
  checkout: (cycle: SubscriptionCycle, couponCode?: string) =>
    apiFetch<CheckoutResponse>("/subscriptions/checkout", {
      method: "POST",
      body: JSON.stringify({ cycle, coupon_code: couponCode || undefined }),
    }),
  me: () => apiFetch<Subscription | null>("/subscriptions/me"),
  changePlan: (cycle: SubscriptionCycle) =>
    apiFetch<Subscription>("/subscriptions/change-plan", { method: "POST", body: JSON.stringify({ cycle }) }),
  cancel: () => apiFetch<Subscription>("/subscriptions/cancel", { method: "POST" }),
};

export const adminSubscriptionApi = {
  subscribers: (limit = 50, offset = 0) =>
    apiFetch<AdminSubscribersResponse>(`/admin/subscribers?limit=${limit}&offset=${offset}`),
  coupons: (limit = 50, offset = 0) =>
    apiFetch<{ items: Coupon[]; total: number }>(`/admin/coupons?limit=${limit}&offset=${offset}`),
  createCoupon: (payload: {
    code: string;
    discount_type: "percent" | "fixed";
    discount_value: number;
    valid_from?: string | null;
    valid_until?: string | null;
    max_uses?: number | null;
  }) => apiFetch<Coupon>("/admin/coupons", { method: "POST", body: JSON.stringify(payload) }),
  updateCoupon: (id: number, payload: Partial<{ discount_type: "percent" | "fixed"; discount_value: number; valid_from: string | null; valid_until: string | null; max_uses: number | null; active: boolean }>) =>
    apiFetch<Coupon>(`/admin/coupons/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deactivateCoupon: (id: number) => apiFetch<Coupon>(`/admin/coupons/${id}/deactivate`, { method: "POST" }),
};
