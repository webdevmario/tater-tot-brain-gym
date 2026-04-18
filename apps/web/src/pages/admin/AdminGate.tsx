import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";

export default function AdminGate() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"loading" | "setup" | "login">("loading");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if already authenticated this browser session
    if (sessionStorage.getItem("admin-auth") === "yes") {
      navigate("/admin/kids");
      return;
    }
    api
      .get<{ set: boolean }>("/api/admin/pin/status")
      .then((data) => setMode(data.set ? "login" : "setup"))
      .catch(() => setError("Can't reach the server"));
  }, [navigate]);

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (pin.length < 4) return setError("PIN needs at least 4 digits");
    if (pin !== confirmPin) return setError("PINs don't match");
    try {
      await api.post("/api/admin/pin/setup", { pin });
      sessionStorage.setItem("admin-auth", "yes");
      navigate("/admin/kids");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/api/admin/pin/verify", { pin });
      sessionStorage.setItem("admin-auth", "yes");
      navigate("/admin/kids");
    } catch {
      setError("Wrong PIN");
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <Link to="/" className="text-teal-400 text-sm mb-6 hover:text-teal-500">
        ← Back to kid picker
      </Link>

      <div className="card max-w-md w-full">
        <h1 className="text-3xl font-display font-bold text-teal-500 mb-2">
          {mode === "setup" ? "Set up admin" : "Admin login"}
        </h1>
        <p className="text-teal-400 mb-6">
          {mode === "setup"
            ? "Pick a PIN (4 or more digits). This keeps kids out of settings."
            : "Enter your PIN to continue."}
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-coral-400/10 text-coral-500 text-sm">
            {error}
          </div>
        )}

        {mode === "loading" && <p>Checking...</p>}

        {mode === "setup" && (
          <form onSubmit={handleSetup} className="space-y-4">
            <div>
              <label className="label">New PIN</label>
              <input
                type="password"
                inputMode="numeric"
                className="input"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="label">Confirm PIN</label>
              <input
                type="password"
                inputMode="numeric"
                className="input"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary w-full">
              Set PIN and continue
            </button>
          </form>
        )}

        {mode === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label">PIN</label>
              <input
                type="password"
                inputMode="numeric"
                className="input"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                autoFocus
              />
            </div>
            <button type="submit" className="btn-primary w-full">
              Unlock
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
