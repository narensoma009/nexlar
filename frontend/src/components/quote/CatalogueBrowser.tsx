import { useEffect, useState } from "react";
import {
  listFamilies,
  searchCatalogue,
  type CatalogueItem,
} from "../../api/catalogue";

type Props = {
  onAdd: (item: CatalogueItem) => void;
};

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
    <div className="flex flex-col gap-2 h-full min-h-0">
      <div className="text-sm font-medium">Catalogue</div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search SKUs…"
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
      />
      {families.length > 0 && (
        <select
          value={family}
          onChange={(e) => setFamily(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option value="">All families</option>
          {families.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto rounded-lg border border-slate-200 bg-white">
        {items.length === 0 ? (
          <div className="p-3 text-xs text-slate-400">
            No catalogue items. Upload a catalogue CSV from the home page.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((it) => (
              <li
                key={it.sku_id}
                className="px-3 py-2 hover:bg-slate-50 cursor-pointer"
                onClick={() => onAdd(it)}
              >
                <div className="text-sm font-medium truncate">{it.name}</div>
                <div className="text-xs text-slate-500 flex gap-2">
                  <span>{it.sku_id}</span>
                  <span>·</span>
                  <span>{it.family}</span>
                  <span>·</span>
                  <span>${it.unit_price.toFixed(2)}</span>
                  {it.allowed_phases.length > 0 && (
                    <>
                      <span>·</span>
                      <span>phases {it.allowed_phases.join(",")}</span>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  );
}
