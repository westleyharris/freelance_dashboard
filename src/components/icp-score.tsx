import { Badge } from "./ui";
import { scoreBand, type Prospect } from "@/lib/types";

/**
 * Mirrors the icp_*_points() functions in the schema. Kept in sync by hand so
 * the UI can explain a score without a second round trip — if you re-tune the
 * weights in Postgres, update these strings too.
 */
function reasons(p: Prospect): { text: string; good: boolean }[] {
  const out: { text: string; good: boolean }[] = [];
  const category = (p.category ?? "").toLowerCase();

  const TIER_A =
    /event|party|sign|balloon|photo|wedding|rental|handyman|remodel|renovat|custom|interior|cabinet|fence|pet|med ?spa/;
  const TIER_C =
    /plumb|roof|hvac|air condition|electric|tree|lawn|landscap|pressure|gutter|food|drink|restaurant|donut|bakery|steak|farm|ranch|engine|vending|tax|bookkeep|realtor|real estate|driving/;

  if (TIER_A.test(category)) {
    out.push({ text: "Customers plan and compare before buying", good: true });
  } else if (TIER_C.test(category)) {
    out.push({ text: "Emergency/walk-in trade — a site rarely sells", good: false });
  }

  if (p.website_status === "social_only") {
    out.push({ text: "Active on social, no website", good: true });
  } else if (p.website_status === "none") {
    out.push({ text: "No website at all", good: true });
  } else if (p.website_status === "has_website") {
    out.push({ text: "Already has a website", good: false });
  }

  if (p.chamber_member) {
    out.push({ text: "Chamber member — already invests in visibility", good: true });
  }

  if (p.source && /chamber|nextdoor|referral|in person/i.test(p.source)) {
    out.push({ text: `Came from ${p.source}`, good: true });
  }

  if (!p.phone) out.push({ text: "No phone number", good: false });

  return out;
}

export function IcpBadge({ score }: { score: number }) {
  const band = scoreBand(score);
  return (
    <Badge tone={band.tone}>
      {score} · {band.label}
    </Badge>
  );
}

/** Score plus the signals behind it, for the prospect detail page. */
export function IcpBreakdown({ prospect }: { prospect: Prospect }) {
  const band = scoreBand(prospect.icp_score);
  const signals = reasons(prospect);

  return (
    <div className="card p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">Fit score</h2>
        <span className="text-2xl font-semibold">{prospect.icp_score}</span>
      </div>

      <div className="mt-1">
        <Badge tone={band.tone}>{band.label}</Badge>
      </div>

      {signals.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {signals.map((signal) => (
            <li key={signal.text} className="flex gap-2 text-xs">
              <span className={signal.good ? "text-good" : "text-bad"}>
                {signal.good ? "+" : "−"}
              </span>
              <span className="text-ink-muted">{signal.text}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 border-t border-border pt-2.5 text-xs text-ink-faint">
        Weighted from your first 83 calls, where events and handyman work closed
        and emergency trades never did. It&rsquo;s a starting guess for ordering
        the call list — trust your read over the number.
      </p>
    </div>
  );
}
