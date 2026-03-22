import { z } from "zod";

export const billSchema = z.object({
  name: z.string().min(1, "Name is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  due_day: z.coerce.number().int().min(1).max(31),
  frequency: z.enum(["monthly", "quarterly", "annual", "one_time"]),
  category: z.enum([
    "mortgage_rent", "car_payment", "insurance", "utilities",
    "groceries", "gas", "subscriptions", "taxes",
    "medical", "childcare", "other",
  ]),
  bill_type: z.enum(["fixed", "variable", "subscription", "irregular"]),
  is_auto_pay: z.coerce.boolean().default(false),
  account_id: z.string().uuid().nullable().optional(),
  match_pattern: z.string().nullable().optional(),
  url: z.string().url().nullable().optional().or(z.literal("")),
  notes: z.string().nullable().optional(),
});

export const accountSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["checking", "savings", "credit_card", "loan"]),
  institution: z.string().optional(),
  balance: z.coerce.number(),
  credit_limit: z.coerce.number().nullable().optional(),
  interest_rate: z.coerce.number().nullable().optional(),
  minimum_payment: z.coerce.number().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const incomeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  frequency: z.enum(["weekly", "biweekly", "semimonthly", "monthly", "one_time"]),
  next_date: z.string().min(1, "Next date is required"),
  notes: z.string().nullable().optional(),
});
