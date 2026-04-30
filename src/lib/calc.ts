// Shared GST + line-item calculations for Quotations and Invoices

export interface LineItem {
  id?: string;
  description: string;
  hsn_sac?: string | null;
  quantity: number;
  unit?: string | null;
  unit_price: number;
  amount: number; // qty * unit_price
}

export interface Totals {
  subtotal: number;
  discount: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export function computeAmount(qty: number, price: number) {
  return +(Number(qty || 0) * Number(price || 0)).toFixed(2);
}

export function computeTotals(
  items: LineItem[],
  opts: { gst_type: "intra" | "inter"; gst_rate: number; discount?: number; subsidy?: number }
): Totals {
  const subtotal = +items.reduce((s, i) => s + Number(i.amount || 0), 0).toFixed(2);
  const discount = +Number(opts.discount || 0).toFixed(2);
  const subsidy = +Number(opts.subsidy || 0).toFixed(2);
  const taxable = +Math.max(0, subtotal - discount).toFixed(2);
  const rate = Number(opts.gst_rate) / 100;
  let cgst = 0, sgst = 0, igst = 0;
  if (opts.gst_type === "intra") {
    cgst = +(taxable * rate / 2).toFixed(2);
    sgst = +(taxable * rate / 2).toFixed(2);
  } else {
    igst = +(taxable * rate).toFixed(2);
  }
  const total = +(taxable + cgst + sgst + igst - subsidy).toFixed(2);
  return { subtotal, discount, taxable, cgst, sgst, igst, total };
}

export function emptyItem(): LineItem {
  return { description: "", hsn_sac: "", quantity: 1, unit: "pcs", unit_price: 0, amount: 0 };
}

export const GST_RATES = ["0", "5", "12", "18", "28"];

// Common HSN codes for solar
export const SOLAR_PRESETS = [
  { description: "Solar PV Module (Mono PERC)", hsn_sac: "8541", unit: "Wp" },
  { description: "Solar Inverter (On-grid)", hsn_sac: "8504", unit: "pcs" },
  { description: "Solar Inverter (Hybrid)", hsn_sac: "8504", unit: "pcs" },
  { description: "Lithium Battery", hsn_sac: "8507", unit: "kWh" },
  { description: "Mounting Structure (GI)", hsn_sac: "7308", unit: "kW" },
  { description: "DC/AC Cable & Conduit", hsn_sac: "8544", unit: "lot" },
  { description: "ACDB / DCDB Box", hsn_sac: "8537", unit: "pcs" },
  { description: "Earthing Kit", hsn_sac: "8536", unit: "set" },
  { description: "Lightning Arrester", hsn_sac: "8535", unit: "pcs" },
  { description: "Net Meter (Bidirectional)", hsn_sac: "9028", unit: "pcs" },
  { description: "Installation & Commissioning", hsn_sac: "9954", unit: "lot" },
  { description: "Transportation & Logistics", hsn_sac: "9965", unit: "lot" },
];
