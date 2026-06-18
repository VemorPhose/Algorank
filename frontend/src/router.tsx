import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { RequireAuth, RequirePrivileged } from "./components/RouteGuards";
import { Spinner } from "./components/ui";

const AdminPage = lazy(() => import("./pages/AdminPage").then((module) => ({ default: module.AdminPage })));
const LoginPage = lazy(() => import("./pages/AuthPages").then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import("./pages/AuthPages").then((module) => ({ default: module.RegisterPage })));
const ContestDetailPage = lazy(() => import("./pages/ContestDetailPage").then((module) => ({ default: module.ContestDetailPage })));
const ContestsPage = lazy(() => import("./pages/ContestsPage").then((module) => ({ default: module.ContestsPage })));
const HomePage = lazy(() => import("./pages/HomePage").then((module) => ({ default: module.HomePage })));
const LeaderboardPage = lazy(() => import("./pages/LeaderboardPage").then((module) => ({ default: module.LeaderboardPage })));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage").then((module) => ({ default: module.NotFoundPage })));
const ProblemDetailPage = lazy(() => import("./pages/ProblemDetailPage").then((module) => ({ default: module.ProblemDetailPage })));
const ProblemsPage = lazy(() => import("./pages/ProblemsPage").then((module) => ({ default: module.ProblemsPage })));
const ProfilePage = lazy(() => import("./pages/ProfilePage").then((module) => ({ default: module.ProfilePage })));
const SubmissionDetailPage = lazy(() => import("./pages/SubmissionDetailPage").then((module) => ({ default: module.SubmissionDetailPage })));
const SubmissionsPage = lazy(() => import("./pages/SubmissionsPage").then((module) => ({ default: module.SubmissionsPage })));

function page(element: ReactNode) {
  return <Suspense fallback={<Spinner label="Loading page" />}>{element}</Suspense>;
}

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: "/", element: page(<HomePage />) },
      { path: "/login", element: page(<LoginPage />) },
      { path: "/register", element: page(<RegisterPage />) },
      { path: "/contests", element: page(<ContestsPage />) },
      { path: "/contests/:contestId", element: page(<ContestDetailPage />) },
      { path: "/contests/:contestId/leaderboard", element: page(<LeaderboardPage />) },
      { path: "/problems", element: page(<ProblemsPage />) },
      { path: "/problems/:problemIdOrSlug", element: page(<ProblemDetailPage />) },
      {
        element: <RequireAuth />,
        children: [
          { path: "/profile", element: page(<ProfilePage />) },
          { path: "/submissions", element: page(<SubmissionsPage />) },
          { path: "/submissions/:submissionId", element: page(<SubmissionDetailPage />) },
        ],
      },
      {
        element: <RequirePrivileged />,
        children: [{ path: "/admin", element: page(<AdminPage />) }],
      },
      { path: "*", element: page(<NotFoundPage />) },
    ],
  },
]);
