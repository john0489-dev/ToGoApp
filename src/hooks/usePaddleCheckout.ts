import { useState } from "react";
import { initializePaddle, getPaddlePriceId } from "@/lib/paddle";

interface OpenOpts {
  priceId: string;
  customerEmail?: string;
  userId: string;
  successUrl?: string;
}

export function usePaddleCheckout() {
  const [loading, setLoading] = useState(false);

  const openCheckout = async (opts: OpenOpts) => {
    setLoading(true);
    try {
      await initializePaddle();
      const paddlePriceId = await getPaddlePriceId(opts.priceId);

      window.Paddle.Checkout.open({
        items: [{ priceId: paddlePriceId, quantity: 1 }],
        customer: opts.customerEmail ? { email: opts.customerEmail } : undefined,
        customData: { userId: opts.userId },
        settings: {
          displayMode: "overlay",
          successUrl: opts.successUrl || `${window.location.origin}/payment/success`,
          allowLogout: false,
          variant: "one-page",
          locale: "pt-BR",
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return { openCheckout, loading };
}
