// Professional printable document for Quotation OR Invoice
// Uses window.print() with a print stylesheet hidden in this component
import { formatINR, formatDate } from "@/lib/format";
import { GovStrip } from "@/components/GovHeader";
import { Sun } from "lucide-react";

export interface DocLine {
  description: string;
  hsn_sac?: string | null;
  quantity: number;
  unit?: string | null;
  unit_price: number;
  amount: number;
}

export interface DocPayload {
  kind: "QUOTATION" | "TAX INVOICE";
  number: string;
  issue_date: string;
  valid_until?: string | null;
  due_date?: string | null;
  org: { name: string; gstin?: string | null; pan?: string | null; address?: string | null; city?: string | null; state?: string | null; pincode?: string | null; phone?: string | null; email?: string | null; website?: string | null; logo_url?: string | null };
  customer: { name: string; gstin?: string | null; address?: string | null; phone?: string | null; email?: string | null };
  capacity_kw?: number | null;
  system_type?: string | null;
  items: DocLine[];
  gst_type: "intra" | "inter";
  gst_rate: number;
  subtotal: number;
  discount: number;
  cgst: number;
  sgst: number;
  igst: number;
  subsidy?: number;
  total: number;
  notes?: string | null;
  terms?: string | null;
}

function amountInWords(n: number): string {
  // Indian numbering simple words for display
  const num = Math.round(n);
  if (num === 0) return "Zero Rupees Only";
  const a = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const b = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  const inWords = (n: number): string => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n/10)] + (n%10 ? " " + a[n%10] : "");
    if (n < 1000) return a[Math.floor(n/100)] + " Hundred" + (n%100 ? " " + inWords(n%100) : "");
    if (n < 100000) return inWords(Math.floor(n/1000)) + " Thousand" + (n%1000 ? " " + inWords(n%1000) : "");
    if (n < 10000000) return inWords(Math.floor(n/100000)) + " Lakh" + (n%100000 ? " " + inWords(n%100000) : "");
    return inWords(Math.floor(n/10000000)) + " Crore" + (n%10000000 ? " " + inWords(n%10000000) : "");
  };
  return inWords(num) + " Rupees Only";
}

export default function DocumentView({ doc }: { doc: DocPayload }) {
  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #printable-doc, #printable-doc * { visibility: visible !important; }
          #printable-doc { position: absolute; inset: 0; padding: 24px; }
          .no-print { display: none !important; }
          @page { size: A4; margin: 12mm; }
        }
      `}</style>
      <div id="printable-doc" className="bg-white text-[hsl(158_50%_10%)]">
        <GovStrip />
        {/* Header */}
        <div className="border-b-2 border-[hsl(158_78%_17%)] pb-4 mt-4 flex items-start justify-between gap-6">
          <div className="flex items-start gap-3">
            {doc.org.logo_url ? (
              <img src={doc.org.logo_url} alt="" className="h-14 w-14 object-contain rounded-md border border-border bg-white" />
            ) : (
              <div className="grid h-14 w-14 place-items-center rounded-md bg-[hsl(158_78%_17%)] text-white">
                <Sun className="h-7 w-7" />
              </div>
            )}
            <div>
              <div className="font-display text-2xl">{doc.org.name}</div>
              {doc.org.address && <div className="text-xs text-muted-foreground">{doc.org.address}</div>}
              <div className="text-xs text-muted-foreground">
                {[doc.org.city, doc.org.state, doc.org.pincode].filter(Boolean).join(", ")}
              </div>
              <div className="text-xs mt-0.5">
                {doc.org.phone && <span>📞 {doc.org.phone} </span>}
                {doc.org.email && <span> · ✉️ {doc.org.email}</span>}
                {doc.org.website && <span> · 🌐 {doc.org.website}</span>}
              </div>
              <div className="text-xs font-mono mt-0.5 flex gap-3 flex-wrap">
                {doc.org.gstin && <span>GSTIN: {doc.org.gstin}</span>}
                {doc.org.pan && <span>PAN: {doc.org.pan}</span>}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="inline-block bg-[hsl(158_78%_17%)] text-white px-3 py-1 rounded-sm text-xs uppercase tracking-widest font-semibold">
              {doc.kind}
            </div>
            <div className="font-mono text-lg mt-2">{doc.number}</div>
            <div className="text-xs text-muted-foreground">Date: {formatDate(doc.issue_date)}</div>
            {doc.valid_until && <div className="text-xs text-muted-foreground">Valid until: {formatDate(doc.valid_until)}</div>}
            {doc.due_date && <div className="text-xs text-muted-foreground">Due: {formatDate(doc.due_date)}</div>}
          </div>
        </div>

        {/* Parties */}
        <div className="grid grid-cols-2 gap-4 mt-5">
          <div className="border border-border rounded-sm p-3">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Bill To / Customer</div>
            <div className="font-semibold">{doc.customer.name}</div>
            {doc.customer.address && <div className="text-xs text-muted-foreground">{doc.customer.address}</div>}
            {doc.customer.phone && <div className="text-xs">📞 {doc.customer.phone}</div>}
            {doc.customer.email && <div className="text-xs">✉️ {doc.customer.email}</div>}
            {doc.customer.gstin && <div className="text-xs font-mono mt-0.5">GSTIN: {doc.customer.gstin}</div>}
          </div>
          <div className="border border-border rounded-sm p-3">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">System Specification</div>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div>Capacity:</div><div className="font-semibold">{doc.capacity_kw ?? "—"} kW</div>
              <div>System:</div><div className="font-semibold capitalize">{doc.system_type ?? "—"}</div>
              <div>GST Type:</div><div className="font-semibold uppercase">{doc.gst_type === "intra" ? "Intra-State (CGST+SGST)" : "Inter-State (IGST)"}</div>
              <div>GST Rate:</div><div className="font-semibold">{doc.gst_rate}%</div>
            </div>
          </div>
        </div>

        {/* Items */}
        <table className="w-full mt-5 border-collapse text-sm">
          <thead>
            <tr className="bg-[hsl(158_78%_17%)] text-white">
              <th className="text-left p-2 text-xs font-semibold w-[5%]">#</th>
              <th className="text-left p-2 text-xs font-semibold">Description</th>
              <th className="text-left p-2 text-xs font-semibold w-[10%]">HSN/SAC</th>
              <th className="text-right p-2 text-xs font-semibold w-[8%]">Qty</th>
              <th className="text-left p-2 text-xs font-semibold w-[8%]">Unit</th>
              <th className="text-right p-2 text-xs font-semibold w-[12%]">Rate</th>
              <th className="text-right p-2 text-xs font-semibold w-[14%]">Amount</th>
            </tr>
          </thead>
          <tbody>
            {doc.items.map((it, i) => (
              <tr key={i} className="border-b border-border">
                <td className="p-2 text-xs">{i + 1}</td>
                <td className="p-2">{it.description}</td>
                <td className="p-2 font-mono text-xs">{it.hsn_sac ?? "—"}</td>
                <td className="p-2 text-right tabular-nums">{it.quantity}</td>
                <td className="p-2 text-xs">{it.unit ?? "—"}</td>
                <td className="p-2 text-right tabular-nums">{formatINR(it.unit_price)}</td>
                <td className="p-2 text-right tabular-nums font-medium">{formatINR(it.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="text-xs space-y-2">
            <div className="border border-border rounded-sm p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Amount in words</div>
              <div className="italic">{amountInWords(doc.total)}</div>
            </div>
            {doc.notes && (
              <div className="border border-border rounded-sm p-3">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Notes</div>
                <div className="whitespace-pre-wrap">{doc.notes}</div>
              </div>
            )}
            {doc.terms && (
              <div className="border border-border rounded-sm p-3">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Terms & Conditions</div>
                <div className="whitespace-pre-wrap">{doc.terms}</div>
              </div>
            )}
          </div>
          <div className="border border-border rounded-sm p-3 text-sm tabular-nums self-start">
            <Row k="Subtotal" v={formatINR(doc.subtotal)} />
            {doc.discount > 0 && <Row k="Discount" v={`− ${formatINR(doc.discount)}`} />}
            {doc.gst_type === "intra" ? (
              <>
                <Row k={`CGST @ ${doc.gst_rate / 2}%`} v={formatINR(doc.cgst)} />
                <Row k={`SGST @ ${doc.gst_rate / 2}%`} v={formatINR(doc.sgst)} />
              </>
            ) : (
              <Row k={`IGST @ ${doc.gst_rate}%`} v={formatINR(doc.igst)} />
            )}
            {(doc.subsidy ?? 0) > 0 && <Row k="Govt. Subsidy" v={`− ${formatINR(doc.subsidy!)}`} />}
            <div className="border-t-2 border-[hsl(158_78%_17%)] mt-2 pt-2">
              <Row k="Grand Total" v={formatINR(doc.total)} bold />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 grid grid-cols-2 gap-4 text-xs">
          <div className="text-muted-foreground">
            <div className="font-semibold text-foreground mb-1">Declaration</div>
            We declare that this {doc.kind.toLowerCase()} shows the actual price of the goods/services described and that all particulars are true and correct.
          </div>
          <div className="text-right">
            <div className="border-t border-border pt-2 mt-12 inline-block min-w-[200px]">
              For <span className="font-semibold">{doc.org.name}</span>
              <div className="text-[10px] text-muted-foreground mt-1">Authorised Signatory</div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <GovStrip />
          <div className="text-center text-[10px] uppercase tracking-widest text-muted-foreground mt-2">
            Generated by SolarPro · Solar Business OS · {new Date().toLocaleDateString("en-IN")}
          </div>
        </div>
      </div>
    </>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${bold ? "text-base font-bold" : "text-muted-foreground"}`}>
      <span>{k}</span><span className={bold ? "text-foreground" : ""}>{v}</span>
    </div>
  );
}
