import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Pack } from "../../lib/api";

export default function AdminPacks() {
  const [packs, setPacks] = useState<Pack[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    const data = await api.get<Pack[]>("/api/packs");
    setPacks(data);
  }

  async function archive(id: string) {
    if (!confirm("Archive this pack? You can still access past attempts but it won't show up for kids.")) return;
    await api.post(`/api/packs/${id}/archive`);
    refresh();
  }

  function downloadExport(id: string) {
    window.open(`/api/packs/${id}/export`, "_blank");
  }

  async function importPack(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setError(null);
    try {
      const text = await file.text();
      const pack = JSON.parse(text);
      await api.post("/api/packs", pack);
      refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-3xl font-display font-bold text-teal-500">Packs</h1>
        <div className="flex gap-3">
          <label className="btn-secondary cursor-pointer">
            Import JSON
            <input
              type="file"
              accept="application/json"
              onChange={importPack}
              className="hidden"
              disabled={importing}
            />
          </label>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-coral-400/10 text-coral-500 text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-3">
        {packs?.map((pack) => (
          <div key={pack.id} className="card flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-bold text-xl text-teal-500">
                {pack.title}
              </h3>
              <p className="text-sm text-teal-400 mt-1">
                {pack.subject} · {pack.questionType} · Gr {pack.gradeMin}-{pack.gradeMax}
                {" · "}
                {pack._count?.items ?? 0} items
                {pack.source && (
                  <span className="block text-xs italic mt-1">Source: {pack.source}</span>
                )}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Link to={`/admin/packs/${pack.id}`} className="btn-secondary !py-2 !px-3 text-sm">
                View / Edit
              </Link>
              <button
                onClick={() => downloadExport(pack.id)}
                className="btn-secondary !py-2 !px-3 text-sm"
              >
                Export
              </button>
              <button
                onClick={() => archive(pack.id)}
                className="btn-danger !py-2 !px-3 text-sm"
              >
                Archive
              </button>
            </div>
          </div>
        ))}
        {packs?.length === 0 && (
          <div className="card text-center text-teal-400">
            No packs yet. Run <code>pnpm seed</code> to load starter packs, or import JSON.
          </div>
        )}
      </div>
    </div>
  );
}
