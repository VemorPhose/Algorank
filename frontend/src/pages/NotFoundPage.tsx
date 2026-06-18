import { Link } from "react-router-dom";
import { PageTitle, Panel, buttonClass } from "../components/ui";

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Panel accent="bg-lemon">
        <PageTitle eyebrow="404" title="Page Not Found">
          The route does not exist in this frontend.
        </PageTitle>
        <div className="mt-6">
          <Link to="/" className={buttonClass("primary")}>
            Go home
          </Link>
        </div>
      </Panel>
    </div>
  );
}
