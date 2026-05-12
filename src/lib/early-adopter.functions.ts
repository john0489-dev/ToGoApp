import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "./_middleware";

/**
 * Get current early adopter slot count and eligibility
 */
export const getEarlyAdopterStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, user } = context;

    // Get total count
    const { data: countData } = await supabase
      .rpc("get_early_adopter_count");

    const totalClaimed = countData ?? 0;
    const slotsLeft = Math.max(0, 100 - totalClaimed);

    // Check if this user already claimed
    const { data: existing } = await supabase
      .from("early_adopters")
      .select("slot_number, trial_ends_at, activated_at")
      .eq("user_id", user.id)
      .single();

    return {
      totalClaimed,
      slotsLeft,
      isAvailable: slotsLeft > 0,
      userClaimed: existing ?? null,
    };
  });

/**
 * Activate early adopter 30-day Pro trial
 */
export const activateEarlyAdopterTrial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, user } = context;

    const { data: slotNumber, error } = await supabase
      .rpc("activate_early_adopter_trial", { p_user_id: user.id });

    if (error) {
      throw new Error("Não foi possível ativar o trial. Tente novamente.");
    }

    if (slotNumber === -1) {
      throw new Error("Você já ativou o período gratuito anteriormente.");
    }

    if (slotNumber === 0) {
      throw new Error("Todas as vagas já foram preenchidas.");
    }

    return {
      success: true,
      slotNumber,
      message: `🎉 Você é o #${slotNumber} early adopter! 30 dias de Pro ativados.`,
    };
  });
