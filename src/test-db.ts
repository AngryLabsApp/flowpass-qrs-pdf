import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!; // service role
const GYM_ID = process.env.GYM_ID; // opcional

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 3. Función para probar la conexión
async function main() {
  console.log("Conectando a Supabase...");

  let query = supabase
    .from("members")
    .select("id, full_name, gym_id, created_at")
    .order("created_at", { ascending: true })
    .limit(5);

  if (GYM_ID) {
    query = query.eq("gym_id", GYM_ID);
  }

  const { data, error } = await query;

  if (error) {
    console.error("❌ ERROR consultando Supabase:", error.message);
    return;
  }

  console.log(`✅ Conexión OK. Miembros encontrados: ${data?.length}`);
  console.log("Primeros resultados:");

  data?.forEach((m) => {
    console.log(`- ${m.id} | ${m.full_name} | gym_id=${m.gym_id}`);
  });
}

main();