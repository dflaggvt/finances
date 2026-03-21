"use server";

import { createClient } from "@/lib/supabase/server";
import { incomeSchema } from "@/lib/validations";
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

export async function createIncome(formData: FormData) {
  const { supabase, householdId } = await getHouseholdId();

  const raw = Object.fromEntries(formData.entries());
  const parsed = incomeSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await supabase.from("income").insert({
    ...parsed.data,
    household_id: householdId,
    notes: parsed.data.notes || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/income");
  revalidatePath("/");
  return { success: true };
}

export async function updateIncome(id: string, formData: FormData) {
  const { supabase, householdId } = await getHouseholdId();

  const raw = Object.fromEntries(formData.entries());
  const parsed = incomeSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await supabase
    .from("income")
    .update({
      ...parsed.data,
      notes: parsed.data.notes || null,
    })
    .eq("id", id)
    .eq("household_id", householdId);

  if (error) return { error: error.message };

  revalidatePath("/income");
  revalidatePath("/");
  return { success: true };
}

export async function deleteIncome(id: string) {
  const { supabase, householdId } = await getHouseholdId();

  const { error } = await supabase
    .from("income")
    .delete()
    .eq("id", id)
    .eq("household_id", householdId);

  if (error) return { error: error.message };

  revalidatePath("/income");
  revalidatePath("/");
  return { success: true };
}
