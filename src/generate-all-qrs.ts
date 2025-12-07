import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!; // service role
const GYM_ID = process.env.GYM_ID; // opcional

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ------------ CONSTANTES GLOBALES DE LAYOUT ------------ //
const PAGE_MARGIN = 40;

const COLS = 3;
const ROWS = 2;

const H_GAP = 20;
const V_GAP = 20;

// Tamaño útil de la hoja
const PAGE_WIDTH = 595 - PAGE_MARGIN * 2;
const PAGE_HEIGHT = 842 - PAGE_MARGIN * 2;

// Calculamos el espacio disponible por tarjeta
const CARD_WIDTH = (PAGE_WIDTH - H_GAP * (COLS - 1)) / COLS;
const CARD_HEIGHT = (PAGE_HEIGHT - V_GAP * (ROWS - 1)) / ROWS;

// Ajuste del QR dentro de la tarjeta
const QR_SIZE = CARD_WIDTH * 0.6; // proporcional
// ------------------------------------------- //

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

// Obtener alumnos
async function getMembers(): Promise<Member[]> {
  let query = supabase
    .from("members")
    .select("id, full_name, codigo_ingreso, gym_id, created_at")
    .order("created_at", { ascending: false });

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

// Dibujar tarjeta QR completa (nombre + QR + código + recorte)
async function drawQrCard(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  name: string,
  code: string
) {
  // 1. Caja punteada
  doc
    .lineWidth(1)
    .dash(5, { space: 5 })
    .rect(x, y, CARD_WIDTH, CARD_HEIGHT)
    .stroke()
    .undash();

  // 2. Nombre
  doc.fontSize(14).text(name, x, y + 10, {
    width: CARD_WIDTH,
    align: "center",
  });

  // 3. Generar QR
  const qrDataUrl = await QRCode.toDataURL(code);
  const base64 = qrDataUrl?.split(",")?.[1];
  if (!base64) {
    console.error(`❌ Error creando QR para ${name}`);
    return;
  }
  const qrBuffer = Buffer.from(base64, "base64");

  // 4. QR centrado
  doc.image(qrBuffer, x + (CARD_WIDTH - QR_SIZE) / 2, y + 50, {
    width: QR_SIZE,
    height: QR_SIZE,
  });

  // 5. Código
  doc.fontSize(12).text(`Cod. de ingreso: ${code}`, x, y + CARD_HEIGHT - 40, {
    width: CARD_WIDTH,
    align: "center",
  });
}

async function main() {
  console.log("📡 Obteniendo alumnos...");

  const members = await getMembers();

  console.log(`Encontrados ${members.length} alumnos.`);

  if (members.length === 0) {
    console.log("⚠️ No hay alumnos para generar QR.");
    return;
  }

  // Crear directorio si no existe
  if (!fs.existsSync("pdf")) {
    fs.mkdirSync("pdf");
  }

  const pdfPath = `pdf/qrs-academia-${GYM_ID}.pdf`;
  const doc = new PDFDocument({
    size: "A4",
    margin: 40,
  });

  doc.pipe(fs.createWriteStream(pdfPath));

  function getPosition(indexOnPage: number) {
    const col = indexOnPage % COLS;
    const row = Math.floor(indexOnPage / COLS);

    return {
      x: PAGE_MARGIN + col * (CARD_WIDTH + H_GAP),
      y: PAGE_MARGIN + row * (CARD_HEIGHT + V_GAP),
    };
  }

  let indexOnPage = 0;

  for (const member of members) {
    if (indexOnPage >= COLS * ROWS) {
      doc.addPage();
      indexOnPage = 0;
    }

    const { x, y } = getPosition(indexOnPage);

    await drawQrCard(
      doc,
      x,
      y,
      member.full_name || "Sin Nombre",
      member.codigo_ingreso!
    );

    indexOnPage++;
  }
  doc.end();
  console.log(`✅ PDF generado: ${pdfPath}`);
}

main();
