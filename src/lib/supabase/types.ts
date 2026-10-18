import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export type { Database, Json, Tables } from "./database.types";

/** Supabase client typed against the live schema (see database.types.ts). */
export type Client = SupabaseClient<Database>;
