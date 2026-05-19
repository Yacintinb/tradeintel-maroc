import { NextRequest, NextResponse } from "next/server";

const DEFAULT_OWNER = "Yacintinb";
const DEFAULT_REPO = "tradeintel-maroc";
const DEFAULT_WORKFLOW = "office-des-changes-scraper.yml";

function parseYears(value: unknown) {
  const years = String(value ?? "2025")
    .split(",")
    .map((year) => year.trim())
    .filter(Boolean);
  if (!years.length || years.some((year) => !/^\d{4}$/.test(year))) {
    throw new Error("Format annees invalide. Exemple: 2025 ou 2023,2024,2025.");
  }
  return years.join(",");
}

export async function POST(request: NextRequest) {
  const token = process.env.GITHUB_ACTIONS_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "GITHUB_ACTIONS_TOKEN manquant dans les variables Vercel." },
      { status: 500 },
    );
  }

  const body = await request.json().catch(() => ({}));
  let years: string;
  try {
    years = parseYears(body.years);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Annees invalides." }, { status: 400 });
  }
  const owner = process.env.GITHUB_REPO_OWNER || DEFAULT_OWNER;
  const repo = process.env.GITHUB_REPO_NAME || DEFAULT_REPO;
  const workflow = process.env.GITHUB_OFFICE_CHANGES_WORKFLOW || DEFAULT_WORKFLOW;
  const ref = process.env.GITHUB_WORKFLOW_REF || "main";

  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow}/dispatches`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({ ref, inputs: { years } }),
  });

  if (!response.ok) {
    const details = await response.text();
    return NextResponse.json({ error: `GitHub Actions a refuse la synchronisation: ${details}` }, { status: 502 });
  }

  return NextResponse.json({
    message: `Synchronisation Office des Changes lancee pour ${years}. Consultez GitHub Actions pendant quelques minutes.`,
    years,
  });
}
