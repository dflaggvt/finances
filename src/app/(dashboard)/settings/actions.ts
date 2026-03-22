"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function getHouseholdId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("household_id")
    .eq("id", user.id)
    .single();

  if (!profile) throw new Error("Profile not found");
  return { supabase, householdId: profile.household_id };
}

export async function getSettings() {
  const { supabase, householdId } = await getHouseholdId();

  const { data } = await supabase
    .from("household_settings")
    .select("*")
    .eq("household_id", householdId)
    .single();

  return data;
}

export async function updateMatchingPrompt(prompt: string) {
  const { supabase, householdId } = await getHouseholdId();

  const { data: existing } = await supabase
    .from("household_settings")
    .select("household_id")
    .eq("household_id", householdId)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("household_settings")
      .update({ matching_prompt: prompt })
      .eq("household_id", householdId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("household_settings")
      .insert({ household_id: householdId, matching_prompt: prompt });
    if (error) return { error: error.message };
  }

  revalidatePath("/settings");
  return { success: true };
}
