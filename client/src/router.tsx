import { createRootRoute, createRoute, createRouter, Link, Outlet } from "@tanstack/react-router";
import ParkPage from "./ParkPage";
import HelpPage from "./HelpPage";

const rootRoute = createRootRoute({
  component: () => (
    <>
      <nav className="top-nav">
        <span className="brand">🎢 CoasterMMO</span>
        <Link to="/" className="nav-link" activeProps={{ className: "nav-link nav-link-active" }}>
          Park
        </Link>
        <Link to="/help" className="nav-link" activeProps={{ className: "nav-link nav-link-active" }}>
          Help
        </Link>
      </nav>
      <Outlet />
    </>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: ParkPage,
});

const helpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/help",
  component: HelpPage,
});

const routeTree = rootRoute.addChildren([indexRoute, helpRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
