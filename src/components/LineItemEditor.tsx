// Reusable line-item editor used by Quotations and Invoices
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineItem, computeAmount, emptyItem, SOLAR_PRESETS } from "@/lib/calc";
import { formatINR } from "@/lib/format";

interface Props {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
}

export default function LineItemEditor({ items, onChange }: Props) {
  const update = (idx: number, patch: Partial<LineItem>) => {
    const next = items.map((it, i) => {
      if (i !== idx) return it;
      const merged = { ...it, ...patch };
      merged.amount = computeAmount(Number(merged.quantity), Number(merged.unit_price));
      return merged;
    });
    onChange(next);
  };
  const add = () => onChange([...items, emptyItem()]);
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));
  const addPreset = (p: typeof SOLAR_PRESETS[number]) => {
    onChange([...items, { ...emptyItem(), description: p.description, hsn_sac: p.hsn_sac, unit: p.unit }]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Line items</Label>
        <div className="flex gap-2">
          <Select onValueChange={(v) => { const p = SOLAR_PRESETS.find(x => x.description === v); if (p) addPreset(p); }}>
            <SelectTrigger className="h-8 text-xs w-[180px]"><SelectValue placeholder="+ Add solar item" /></SelectTrigger>
            <SelectContent>
              {SOLAR_PRESETS.map(p => (
                <SelectItem key={p.description} value={p.description}>{p.description}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" size="sm" variant="outline" onClick={add}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Custom row
          </Button>
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%] text-xs">Description</TableHead>
              <TableHead className="text-xs">HSN/SAC</TableHead>
              <TableHead className="text-xs w-[80px]">Qty</TableHead>
              <TableHead className="text-xs w-[80px]">Unit</TableHead>
              <TableHead className="text-xs w-[120px]">Rate (₹)</TableHead>
              <TableHead className="text-xs text-right w-[120px]">Amount</TableHead>
              <TableHead className="w-[40px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">
                  No items. Add a solar preset or custom row above.
                </TableCell>
              </TableRow>
            )}
            {items.map((it, idx) => (
              <TableRow key={idx}>
                <TableCell>
                  <Input value={it.description} onChange={(e) => update(idx, { description: e.target.value })} placeholder="e.g. Solar Module 540Wp" className="h-8" />
                </TableCell>
                <TableCell>
                  <Input value={it.hsn_sac ?? ""} onChange={(e) => update(idx, { hsn_sac: e.target.value })} className="h-8 font-mono text-xs" />
                </TableCell>
                <TableCell>
                  <Input type="number" min="0" step="0.01" value={it.quantity} onChange={(e) => update(idx, { quantity: Number(e.target.value) })} className="h-8 tabular-nums" />
                </TableCell>
                <TableCell>
                  <Input value={it.unit ?? ""} onChange={(e) => update(idx, { unit: e.target.value })} className="h-8 text-xs" />
                </TableCell>
                <TableCell>
                  <Input type="number" min="0" step="0.01" value={it.unit_price} onChange={(e) => update(idx, { unit_price: Number(e.target.value) })} className="h-8 tabular-nums" />
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">{formatINR(it.amount)}</TableCell>
                <TableCell>
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(idx)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
