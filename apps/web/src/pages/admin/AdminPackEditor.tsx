import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type Item } from "../../lib/api";

type PackDetail = {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  questionType: string;
  source: string | null;
  gradeMin: number;
  gradeMax: number;
  items: Item[];
};

export default function AdminPackEditor() {
  const { packId } = useParams();
  const [pack, setPack] = useState<PackDetail | null>(null);
  const [gradeFilter, setGradeFilter] = useState<number | "all">("all");
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packId]);

  async function refresh() {
    if (!packId) return;
    const data = await api.get<PackDetail>(`/api/packs/${packId}`);
    setPack(data);
  }

  async function deleteItem(itemId: string) {
    if (!packId) return;
    if (!confirm("Delete this item? This will also clear attempt history for it.")) return;
    await api.delete(`/api/packs/${packId}/items/${itemId}`);
    refresh();
  }

  if (!pack) return <p>Loading...</p>;

  const grades = Array.from(new Set(pack.items.map((i) => i.gradeLevel))).sort();
  const filteredItems =
    gradeFilter === "all" ? pack.items : pack.items.filter((i) => i.gradeLevel === gradeFilter);

  return (
    <div>
      <Link to="/admin/packs" className="text-teal-400 text-sm hover:text-teal-500 mb-4 inline-block">
        ← All packs
      </Link>

      <h1 className="text-3xl font-display font-bold text-teal-500 mb-2">{pack.title}</h1>
      <p className="text-sm text-teal-400 mb-6">
        {pack.subject} · {pack.questionType} · Gr {pack.gradeMin}-{pack.gradeMax}
        {pack.source && <span className="block italic mt-1">Source: {pack.source}</span>}
      </p>

      {pack.description && (
        <div className="card mb-6 !bg-cream-100">
          <p className="text-teal-500">{pack.description}</p>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <span className="text-sm font-semibold text-teal-400">Filter by grade:</span>
        <button
          onClick={() => setGradeFilter("all")}
          className={`px-3 py-1 rounded-full text-sm font-semibold ${
            gradeFilter === "all" ? "bg-teal-400 text-cream-50" : "bg-cream-100 text-teal-400"
          }`}
        >
          All ({pack.items.length})
        </button>
        {grades.map((g) => (
          <button
            key={g}
            onClick={() => setGradeFilter(g)}
            className={`px-3 py-1 rounded-full text-sm font-semibold ${
              gradeFilter === g ? "bg-teal-400 text-cream-50" : "bg-cream-100 text-teal-400"
            }`}
          >
            Grade {g} ({pack.items.filter((i) => i.gradeLevel === g).length})
          </button>
        ))}
      </div>

      <div className="grid gap-2">
        {filteredItems.map((item) => (
          <div key={item.id} className="card !py-4 flex items-start gap-4 flex-wrap">
            <span className="px-2 py-1 rounded-md bg-spud-100 text-spud-500 text-xs font-bold">
              G{item.gradeLevel}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-teal-500">{item.prompt}</p>
              <p className="text-sm text-teal-400 mt-1">
                → <strong>{item.answer}</strong>
              </p>
              {item.context && (
                <p className="text-xs text-teal-400 mt-1 italic">{item.context}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditingItem(item)}
                className="btn-secondary !py-1 !px-2 text-xs"
              >
                Edit
              </button>
              <button
                onClick={() => deleteItem(item.id)}
                className="btn-danger !py-1 !px-2 text-xs"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {editingItem && packId && (
        <ItemEditor
          item={editingItem}
          packId={packId}
          onClose={() => {
            setEditingItem(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function ItemEditor({
  item,
  packId,
  onClose,
}: {
  item: Item;
  packId: string;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    prompt: item.prompt,
    answer: item.answer,
    gradeLevel: item.gradeLevel,
    context: item.context ?? "",
    mnemonic: item.mnemonic ?? "",
    choices: item.choices ? item.choices.join("\n") : "",
  });
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const payload = {
        prompt: form.prompt,
        answer: form.answer,
        gradeLevel: form.gradeLevel,
        context: form.context || undefined,
        mnemonic: form.mnemonic || undefined,
        choices: form.choices.trim()
          ? form.choices.split("\n").map((s) => s.trim()).filter(Boolean)
          : undefined,
      };
      await api.put(`/api/packs/${packId}/items/${item.id}`, payload);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="fixed inset-0 bg-teal-600/40 backdrop-blur-sm flex items-center justify-center p-4 z-20">
      <div className="card max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="shrink-0 flex items-center justify-between mb-4">
          <h2 className="text-2xl font-display font-bold text-teal-500">Edit Item</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-10 h-10 flex items-center justify-center text-3xl leading-none text-teal-400 hover:text-teal-500 hover:bg-cream-100 rounded-lg transition"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="shrink-0 mb-4 p-3 rounded-xl bg-coral-400/10 text-coral-500 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={save} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          <div>
            <label className="label">Prompt</label>
            <input
              className="input"
              value={form.prompt}
              onChange={(e) => setForm({ ...form, prompt: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Answer</label>
            <input
              className="input"
              value={form.answer}
              onChange={(e) => setForm({ ...form, answer: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Grade level</label>
            <input
              type="number"
              min={0}
              max={12}
              className="input"
              value={form.gradeLevel}
              onChange={(e) => setForm({ ...form, gradeLevel: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className="label">Choices (one per line, for multiple choice)</label>
            <textarea
              className="input min-h-[100px]"
              value={form.choices}
              onChange={(e) => setForm({ ...form, choices: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Context / teach card (shown if they miss this)</label>
            <textarea
              className="input"
              value={form.context}
              onChange={(e) => setForm({ ...form, context: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Mnemonic (optional memory aid)</label>
            <input
              className="input"
              value={form.mnemonic}
              onChange={(e) => setForm({ ...form, mnemonic: e.target.value })}
            />
          </div>

          </div>
          <div className="shrink-0 flex gap-3 pt-4 mt-4 border-t-2 border-cream-100">
            <button type="submit" className="btn-primary flex-1">Save</button>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
