import { useState } from "react";
import { api } from "../../lib/api";

export default function AdminSettings() {
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<{ type: "ok" | "error"; msg: string } | null>(null);

  async function changePin(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    if (newPin.length < 4) return setStatus({ type: "error", msg: "New PIN needs at least 4 digits" });
    if (newPin !== confirm) return setStatus({ type: "error", msg: "New PINs don't match" });
    try {
      await api.post("/api/admin/pin/change", { oldPin, newPin });
      setStatus({ type: "ok", msg: "PIN changed." });
      setOldPin("");
      setNewPin("");
      setConfirm("");
    } catch (err) {
      setStatus({ type: "error", msg: (err as Error).message });
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-3xl font-display font-bold text-teal-500 mb-6">Settings</h1>

      <div className="card">
        <h2 className="text-xl font-display font-bold text-teal-500 mb-4">Change admin PIN</h2>

        {status && (
          <div
            className={`mb-4 p-3 rounded-xl text-sm ${
              status.type === "ok"
                ? "bg-teal-100 text-teal-600"
                : "bg-coral-400/10 text-coral-500"
            }`}
          >
            {status.msg}
          </div>
        )}

        <form onSubmit={changePin} className="space-y-4">
          <div>
            <label className="label">Current PIN</label>
            <input
              type="password"
              inputMode="numeric"
              className="input"
              value={oldPin}
              onChange={(e) => setOldPin(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">New PIN</label>
            <input
              type="password"
              inputMode="numeric"
              className="input"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Confirm new PIN</label>
            <input
              type="password"
              inputMode="numeric"
              className="input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full">
            Update PIN
          </button>
        </form>
      </div>

      <div className="card mt-6 !bg-cream-100">
        <h3 className="font-display font-bold text-teal-500 mb-2">If you forget the PIN</h3>
        <p className="text-sm text-teal-500 mb-2">
          Run this from the repo root to reset:
        </p>
        <pre className="bg-teal-600 text-cream-50 p-3 rounded-lg text-xs overflow-x-auto">
{`pnpm db:studio
# Delete the row in AppSetting where key = 'admin-pin'
# Next time you open /admin, you'll be prompted to set a new one.`}
        </pre>
      </div>
    </div>
  );
}
