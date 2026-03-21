"use server";

import { createClient } from "@/lib/supabase/server";
import { accountSchema } from "@/lib/validations";
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

export async function createAccount(formData: FormData) {
  const { supabase, householdId } = await getHouseholdId();

  const raw = Object.fromEntries(formData.entries());
  const parsed = accountSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await supabase.from("accounts").insert({
    ...parsed.data,
    household_id: householdId,
    institution: parsed.data.institution || null,
    credit_limit: parsed.data.credit_limit ?? null,
    interest_rate: parsed.data.interest_rate ?? null,
    minimum_payment: parsed.data.minimum_payment ?? null,
    notes: parsed.data.notes || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/accounts");
  revalidatePath("/");
  return { success: true };
}

export async function updateAccount(id: string, formData: FormData) {
  const { supabase, householdId } = await getHouseholdId();

  const raw = Object.fromEntries(formData.entries());
  const parsed = accountSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await supabase
    .from("accounts")
    .update({
      ...parsed.data,
      institution: parsed.data.institution || null,
      credit_limit: parsed.data.credit_limit ?? null,
      interest_rate: parsed.data.interest_rate ?? null,
      minimum_payment: parsed.data.minimum_payment ?? null,
      notes: parsed.data.notes || null,
    })
    .eq("id", id)
    .eq("household_id", householdId);

  if (error) return { error: error.message };

  revalidatePath("/accounts");
  revalidatePath("/");
  return { success: true };
}

export async function deleteAccount(id: string) {
  const { supabase, householdId } = await getHouseholdId();

  const { error } = await supabase
    .from("accounts")
    .delete()
    .eq("id", id)
    .eq("household_id", householdId);

  if (error) return { error: error.message };

  revalidatePath("/accounts");
  revalidatePath("/");
  return { success: true };
}

export async function updateBalance(id: string, balance: number) {
  const { supabase, householdId } = await getHouseholdId();

  const { error } = await supabase
    .from("accounts")
    .update({ balance })
    .eq("id", id)
    .eq("household_id", householdId);

  if (error) return { error: error.message };

  revalidatePath("/accounts");
  revalidatePath("/");
  return { success: true };
}
