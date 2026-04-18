import { Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import KidHome from "./pages/KidHome";
import Session from "./pages/Session";
import AdminGate from "./pages/admin/AdminGate";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminKids from "./pages/admin/AdminKids";
import AdminPacks from "./pages/admin/AdminPacks";
import AdminPackEditor from "./pages/admin/AdminPackEditor";
import AdminProgress from "./pages/admin/AdminProgress";
import AdminSettings from "./pages/admin/AdminSettings";

export default function App() {
  return (
    <div className="min-h-screen">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/kid/:kidId" element={<KidHome />} />
        <Route path="/session/:sessionId" element={<Session />} />
        <Route path="/admin" element={<AdminGate />} />
        <Route path="/admin/*" element={<AdminLayout />}>
          <Route path="kids" element={<AdminKids />} />
          <Route path="packs" element={<AdminPacks />} />
          <Route path="packs/:packId" element={<AdminPackEditor />} />
          <Route path="progress/:kidId" element={<AdminProgress />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
        <Route
          path="*"
          element={
            <div className="flex min-h-screen flex-col items-center justify-center gap-4">
              <h1 className="text-4xl">Page not found</h1>
              <Link to="/" className="btn-primary">
                Back to Start
              </Link>
            </div>
          }
        />
      </Routes>
    </div>
  );
}
