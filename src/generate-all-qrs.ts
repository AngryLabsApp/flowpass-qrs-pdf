import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!; // service role
const GYM_ID = process.env.GYM_ID; // opcional

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// CAMPO REAL DEL CÓDIGO DE 4 DÍGITOS
const QR_FIELD = "codigo_ingreso";

// Tipo de dato real de los alumnos
type Member = {
  id: string;
  full_name: string | null;
  codigo_ingreso: string | null;
  gym_id: string | null;
  created_at: string | null;
};

// 1. Obtener alumnos
async function getMembers(): Promise<Member[]> {
  let query = supabase
    .from("members")
    .select("id, full_name, codigo_ingreso, gym_id, created_at")
    .order("created_at", { ascending: true });

  if (GYM_ID) {
    query = query.eq("gym_id", GYM_ID);
  }

  const { data, error } = await query;
  if (error) {
    console.error("❌ Error obteniendo alumnos:", error.message);
    process.exit(1);
  }
  return data as Member[];
}

async function main() {
  console.log("📡 Obteniendo alumnos...");

  const members = await getMembers();

  console.log(`Encontrados ${members.length} alumnos.`);
}

main();
