import { Routes, Route, Link, useParams } from "react-router-dom";
import Home from "./pages/Home";
import KidHome from "./pages/KidHome";
import Session from "./pages/Session";
import Trophies from "./pages/Trophies";
import Customize from "./pages/Customize";
import AdminGate from "./pages/admin/AdminGate";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminKids from "./pages/admin/AdminKids";
import AdminPacks from "./pages/admin/AdminPacks";
import AdminPackEditor from "./pages/admin/AdminPackEditor";
import AdminProgress from "./pages/admin/AdminProgress";
import AdminSettings from "./pages/admin/AdminSettings";

export default function App() {
  return (
    <div className="min-h-[100dvh]">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/kid/:kidId" element={<KidHome />} />
        <Route path="/kid/:kidId/trophies" element={<Trophies />} />
        <Route path="/kid/:kidId/style" element={<Customize />} />
        <Route path="/session/:sessionId" element={<SessionRoute />} />
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

// Keyed by id so "Another round" (same route, new id) mounts a fresh
// round instead of reusing the finished one's state.
function SessionRoute() {
  const { sessionId } = useParams();
  return <Session key={sessionId} />;
}
