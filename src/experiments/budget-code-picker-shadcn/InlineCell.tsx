import * as React from "react";
import { ArrowDownToLine } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SegmentedBuilder } from "./SegmentedBuilder";
import { compositeFromIds, isComplete, type Composite, type SegmentKey } from "./data";

interface Row {
  id: string;
  item: string;
  hours: number;
  code: Composite;
}

const INITIAL_ROWS: Row[] = [
  { id: "1", item: "Install rooftop AHU-3", hours: 8, code: compositeFromIds(["cc-23-800", "ct-L", "ph-3"]) },
  { id: "2", item: "Ductwork trunk lines", hours: 6, code: {} },
  { id: "3", item: "Refrigerant piping", hours: 5, code: {} },
  { id: "4", item: "Thermostat wiring", hours: 3, code: {} },
];

/**
 * Direction E — Inline-in-cell.
 * The segmented builder collapses into a single dense table cell. A fill-down
 * handle copies a completed code to the rows below — the spreadsheet gesture
 * high-frequency data entry relies on.
 */
export function InlineCell({ structure }: { structure: SegmentKey[] }) {
  const [rows, setRows] = React.useState<Row[]>(INITIAL_ROWS);

  const setRowCode = (id: string, code: Composite) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, code } : r)));

  const fillDown = (fromIndex: number) =>
    setRows((rs) =>
      rs.map((r, i) => (i > fromIndex ? { ...r, code: { ...rs[fromIndex].code } } : r))
    );

  return (
    <div className="overflow-hidden rounded-md border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-muted/50 text-muted-foreground text-left text-xs">
            <th className="px-3 py-2 font-medium">Line item</th>
            <th className="w-16 px-3 py-2 font-medium">Hours</th>
            <th className="px-3 py-2 font-medium">Budget code</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const complete = isComplete(row.code, structure);
            const canFillDown = complete && i < rows.length - 1;
            return (
              <tr key={row.id} className="group border-t">
                <td className="px-3 py-1.5">{row.item}</td>
                <td className="text-muted-foreground px-3 py-1.5 font-mono">
                  {row.hours}
                </td>
                <td className="px-3 py-1.5">
                  <div className="flex items-center gap-1">
                    <SegmentedBuilder
                      structure={structure}
                      value={row.code}
                      onChange={(code) => setRowCode(row.id, code)}
                      size="sm"
                    />
                    {canFillDown ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => fillDown(i)}
                            className="text-muted-foreground hover:bg-accent hover:text-foreground rounded p-1 opacity-0 transition group-hover:opacity-100"
                          >
                            <ArrowDownToLine className="size-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Fill down to rows below</TooltipContent>
                      </Tooltip>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
