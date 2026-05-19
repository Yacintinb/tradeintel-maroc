import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const portalUrl = process.env.OFFICE_CHANGES_URL || "https://services.oc.gov.ma/DataBase/CommerceExterieur/requete.htm";
const appUrl = process.env.APP_URL || "https://tradeintel-maroc.vercel.app";
const ingestSecret = process.env.INGEST_SECRET || process.env.CRON_SECRET;
const years = (process.env.OFFICE_CHANGES_YEARS || String(new Date().getFullYear()))
  .split(",")
  .map((year) => year.trim())
  .filter(Boolean);
const headless = process.env.HEADLESS !== "false";
const outDir = process.env.SCRAPER_OUT_DIR || "scraper-output";

function log(message) {
  console.log(`[office-des-changes] ${message}`);
}

async function selectByVisibleText(page, text) {
  const selectedByDom = await page.evaluate((wantedText) => {
    const normalize = (value) => value.replace(/\s+/g, " ").trim().toLowerCase();
    const wanted = normalize(wantedText);

    const options = Array.from(document.querySelectorAll("option"));
    const option = options.find((item) => normalize(item.textContent || "").includes(wanted));
    if (option instanceof HTMLOptionElement && option.parentElement instanceof HTMLSelectElement) {
      option.selected = true;
      option.parentElement.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }

    const labels = Array.from(document.querySelectorAll("label"));
    const label = labels.find((item) => normalize(item.textContent || "").includes(wanted));
    if (label instanceof HTMLLabelElement) {
      const target = label.htmlFor ? document.getElementById(label.htmlFor) : label.querySelector("input, select, textarea");
      if (target instanceof HTMLInputElement) {
        if (target.type === "checkbox" || target.type === "radio") target.checked = true;
        target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        target.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      }
      if (target instanceof HTMLSelectElement) {
        target.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      }
    }

    const inputs = Array.from(document.querySelectorAll("input"));
    const input = inputs.find((item) => normalize(item.value || item.name || item.id || "").includes(wanted));
    if (input instanceof HTMLInputElement) {
      if (input.type === "checkbox" || input.type === "radio") input.checked = true;
      input.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }

    return false;
  }, text);

  if (selectedByDom) {
    log(`Selection DOM: ${text}`);
    return true;
  }

  const option = page.getByText(text, { exact: true });
  if ((await option.count()) > 0) {
    await option.first().click({ timeout: 10_000 });
    return true;
  }
  return false;
}

async function tryClick(page, labels) {
  for (const label of labels) {
    const byRole = page.getByRole("button", { name: label });
    if ((await byRole.count()) > 0) {
      await byRole.first().click({ timeout: 10_000 });
      return true;
    }
    const byText = page.getByText(label, { exact: false });
    if ((await byText.count()) > 0) {
      await byText.first().click({ timeout: 10_000 });
      return true;
    }
  }
  return false;
}

async function downloadPortalCsv(page, year) {
  log(`Preparation de la requete ${year}`);
  await page.goto(portalUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });

  await selectByVisibleText(page, year);
  await selectByVisibleText(page, "Valeur en MAD");
  await selectByVisibleText(page, "Année");
  await selectByVisibleText(page, "Mois");
  await selectByVisibleText(page, "Code du produit SH");
  await selectByVisibleText(page, "Libellé du produit SH");
  await selectByVisibleText(page, "Libellé du pays");
  await selectByVisibleText(page, "Libellé du sens du flux");

  await tryClick(page, ["Suivant", "Résultat", "Resultat", "Préparer", "Requête"]);
  await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => undefined);

  const downloadPromise = page.waitForEvent("download", { timeout: 120_000 });
  const clicked = await tryClick(page, ["Export tabulaire", "CSV", "Exporter", "Export"]);
  if (!clicked) throw new Error("Bouton export CSV introuvable. Le portail a probablement change de structure.");
  const download = await downloadPromise;

  await fs.mkdir(outDir, { recursive: true });
  const suggested = download.suggestedFilename();
  const filePath = path.join(outDir, suggested || `office-des-changes-${year}.csv`);
  await download.saveAs(filePath);
  log(`CSV telecharge: ${filePath}`);
  return filePath;
}

async function uploadToApp(filePath) {
  if (!ingestSecret) throw new Error("INGEST_SECRET ou CRON_SECRET manquant.");
  const bytes = await fs.readFile(filePath);
  const form = new FormData();
  form.set("file", new Blob([bytes], { type: "text/csv" }), path.basename(filePath));
  form.set("sourceName", "Office des Changes - scraper automatique");
  form.set("sourceUrl", portalUrl);
  form.set("replaceSource", "true");

  const response = await fetch(`${appUrl.replace(/\/$/, "")}/api/ingest/trade-flows`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ingestSecret}` },
    body: form,
  });
  const payload = await response.text();
  if (!response.ok) throw new Error(`Upload echoue HTTP ${response.status}: ${payload}`);
  log(`Upload OK: ${payload}`);
}

async function main() {
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({ acceptDownloads: true, locale: "fr-MA" });
  const page = await context.newPage();
  try {
    for (const year of years) {
      const filePath = await downloadPortalCsv(page, year);
      await uploadToApp(filePath);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
