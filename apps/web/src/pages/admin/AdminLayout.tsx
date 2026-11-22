import { useEffect } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (sessionStorage.getItem("admin-auth") !== "yes") {
      navigate("/admin");
    }
  }, [navigate, location]);

  function logout() {
    sessionStorage.removeItem("admin-auth");
    navigate("/admin");
  }

  const navItemClass = (isActive: boolean) =>
    `block px-4 py-3 rounded-xl font-display font-semibold transition-all ${
      isActive
        ? "bg-teal-400 text-cream-50"
        : "text-teal-400 hover:bg-cream-100"
    }`;

  // h-screen shell. The page never scrolls; only <main> has
  // overflow-y-auto. <main> is full-width to the viewport so its
  // scrollbar sits at the far right edge, and the content inside is
  // centered with max-w-7xl. Header and sidebar stay locked.
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <header className="shrink-0 border-b-2 border-teal-100 bg-white/80 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-teal-400 hover:text-teal-500">
            ← Exit Parent Area
          </Link>
          <div className="h-6 w-px bg-teal-100" />
          <h1 className="text-xl font-display font-bold text-teal-500">
            Brain Gym · Parent Area
          </h1>
        </div>
        <button onClick={logout} className="text-sm text-teal-400 hover:text-coral-500">
          Lock
        </button>
      </header>

      {/* Side rail only on wide screens (iPad landscape and up). Narrower,
          the nav is a row of tabs under the header so the page keeps its
          full width for content. */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <aside className="shrink-0 lg:w-56 px-4 pt-3 lg:p-4 lg:border-r-2 border-teal-100 lg:overflow-y-auto">
          <nav className="flex gap-2 lg:block lg:space-y-2">
            <NavLink to="/admin/kids" className={({ isActive }) => navItemClass(isActive)}>
              Kids
            </NavLink>
            <NavLink to="/admin/packs" className={({ isActive }) => navItemClass(isActive)}>
              Packs
            </NavLink>
            <NavLink to="/admin/settings" className={({ isActive }) => navItemClass(isActive)}>
              Settings
            </NavLink>
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl p-6 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
