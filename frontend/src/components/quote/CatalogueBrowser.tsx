import { useEffect, useState } from "react";
import { Package, Search } from "lucide-react";
import {
  listFamilies,
  searchCatalogue,
  type CatalogueItem,
} from "../../api/catalogue";
import { currencyFull } from "../../lib/status";

type Props = { onAdd: (item: CatalogueItem) => void };

export default function CatalogueBrowser({ onAdd }: Props) {
  const [items, setItems] = useState<CatalogueItem[]>([]);
  const [families, setFamilies] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [family, setFamily] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listFamilies().then(setFamilies).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      searchCatalogue({ q: q || undefined, family: family || undefined, limit: 50 })
        .then(setItems)
        .catch((e) => setError(e.message));
    }, 200);
    return () => clearTimeout(t);
  }, [q, family]);

  return (
    <div className="flex flex-col gap-2 h-full min-h-0 rounded-2xl bg-white border border-slate-200 shadow-sm p-3">
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
          <Package size={16} />
        </div>
        <div className="text-sm font-semibold">Catalogue</div>
        <span className="text-xs text-slate-400 ml-auto">{items.length}</span>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search SKUs…"
          className="w-full rounded-lg border border-slate-300 pl-7 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {families.length > 0 && (
        <select
          value={family}
          onChange={(e) => setFamily(e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm bg-white"
        >
          <option value="">All families</option>
          {families.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto">
        {items.length === 0 ? (
          <div className="p-3 text-xs text-slate-400 italic">
            No catalogue items. Upload a catalogue CSV from the home page.
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {items.map((it) => (
              <li key={it.sku_id}>
                <button
                  onClick={() => onAdd(it)}
                  className="w-full text-left rounded-lg border border-slate-200 bg-white px-3 py-2 hover:border-blue-300 hover:bg-blue-50/50 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-medium truncate">{it.name}</div>
                    <div className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                      {currencyFull(it.unit_price)}
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap gap-x-2">
                    <span className="font-mono">{it.sku_id}</span>
                    <span>·</span>
                    <span>{it.family}</span>
                    {it.allowed_phases.length > 0 && (
                      <>
                        <span>·</span>
                        <span>phases {it.allowed_phases.join(",")}</span>
                      </>
                    )}
                    {it.asc606_class && (
                      <>
                        <span>·</span>
                        <span className="uppercase tracking-wide text-slate-400">
                          {it.asc606_class}
                        </span>
                      </>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  );
}
