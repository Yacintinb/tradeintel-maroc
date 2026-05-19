import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const portalUrl = process.env.OFFICE_CHANGES_URL || "https://services.oc.gov.ma/DataBase/CommerceExterieur/requete.htm";
const appUrl = process.env.APP_URL || "https://tradeintel-maroc.vercel.app";
const ingestSecret = process.env.INGEST_SECRET || process.env.CRON_SECRET;
const skipUpload = process.env.SKIP_UPLOAD === "true";
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

async function checkInputsById(page, ids) {
  const checked = await page.evaluate((wantedIds) => {
    const changed = [];
    for (const id of wantedIds) {
      const input = document.getElementById(id);
      if (input instanceof HTMLInputElement) {
        input.checked = true;
        input.dispatchEvent(new Event("change", { bubbles: true }));
        changed.push(id);
      }
    }
    return changed;
  }, ids);

  if (checked.length > 0) log(`Cases cochees DOM: ${checked.join(", ")}`);
  return checked.length;
}

async function tryClick(page, labels) {
  for (const label of labels) {
    const byRole = page.getByRole("button", { name: label });
    if ((await byRole.count()) > 0) {
      try {
        await byRole.first().click({ timeout: 10_000 });
        return true;
      } catch (error) {
        log(`Clic role impossible (${label}): ${error instanceof Error ? error.message.split("\n")[0] : error}`);
      }
    }
    const byText = page.getByText(label, { exact: false });
    if ((await byText.count()) > 0) {
      try {
        await byText.first().click({ timeout: 10_000 });
        return true;
      } catch (error) {
        log(`Clic texte impossible (${label}): ${error instanceof Error ? error.message.split("\n")[0] : error}`);
      }
    }

    const clickedByDom = await page.evaluate((wantedLabel) => {
      const normalize = (value) => value.replace(/\s+/g, " ").trim().toLowerCase();
      const wanted = normalize(wantedLabel);
      const elements = Array.from(document.querySelectorAll("a, button, input[type='button'], input[type='submit']"));
      const element = elements.find((item) => {
        const text = [
          item.textContent,
          item.getAttribute("title"),
          item.getAttribute("aria-label"),
          item.getAttribute("value"),
          item.getAttribute("id"),
          item.getAttribute("name"),
        ]
          .filter(Boolean)
          .join(" ");
        return normalize(text).includes(wanted);
      });
      if (element instanceof HTMLElement) {
        element.click();
        return true;
      }
      return false;
    }, label);
    if (clickedByDom) {
      log(`Clic DOM: ${label}`);
      return true;
    }
  }
  return false;
}

async function saveDebug(page, year, stage) {
  await fs.mkdir(outDir, { recursive: true });
  const prefix = path.join(outDir, `debug-${year}-${stage}`);
  try {
    await page.screenshot({ path: `${prefix}.png`, fullPage: true });
  } catch (error) {
    log(`Screenshot debug impossible (${stage}): ${error instanceof Error ? error.message : error}`);
  }
  try {
    await fs.writeFile(`${prefix}.html`, await page.content(), "utf8");
  } catch (error) {
    log(`HTML debug impossible (${stage}): ${error instanceof Error ? error.message : error}`);
  }
}

function csvEscape(value) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
}

async function normalizeOfficeCsv(filePath, year) {
  const content = await fs.readFile(filePath, "utf8");
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const rows = lines.map(parseCsvLine).filter((row) => row.length >= 5);
  const dataRows = rows.filter((row) => /^\d{4,10}$/.test(row[0]) && row[1] && row[2] && row[3]);

  if (dataRows.length === 0) return filePath;

  const normalizedPath = filePath.replace(/\.csv$/i, "-normalized.csv");
  const normalizedRows = [
    ["Année", "Flux", "Code SH", "Désignation", "Pays", "Valeur MAD"],
    ...dataRows.map((row) => [year, row[3], row[0], row[1], row[2], row[4] ?? "0"]),
  ];

  await fs.writeFile(normalizedPath, normalizedRows.map((row) => row.map(csvEscape).join(",")).join("\n"), "utf8");
  log(`CSV normalise: ${normalizedPath} (${dataRows.length} lignes)`);
  return normalizedPath;
}

function looksLikeTradeFlowRows(rows) {
  const text = rows
    .slice(0, 5)
    .flat()
    .join(" ")
    .toLowerCase();
  const hasYear = /annee|année|year|202[0-9]/i.test(text);
  const hasHsCode = /code.*(sh|hs)|produit|position/i.test(text);
  const hasCountry = /pays|country/i.test(text);
  const hasValue = /valeur|montant|mad/i.test(text);
  return hasYear && hasHsCode && hasCountry && hasValue;
}

async function extractTableCsv(page, year, stage) {
  const rows = await page.evaluate(() => {
    const tables = Array.from(document.querySelectorAll("table"));
    const table = tables
      .map((item) => ({
        rows: Array.from(item.querySelectorAll("tr")).map((row) =>
          Array.from(row.querySelectorAll("th,td")).map((cell) => (cell.textContent || "").replace(/\s+/g, " ").trim()),
        ),
      }))
      .sort((a, b) => b.rows.length - a.rows.length)[0];
    return table?.rows.filter((row) => row.some(Boolean)) ?? [];
  });

  if (rows.length < 2) return null;
  if (!looksLikeTradeFlowRows(rows)) {
    log(`Table ignoree (${stage}): elle ne ressemble pas a un flux import/export.`);
    return null;
  }
  await fs.mkdir(outDir, { recursive: true });
  const filePath = path.join(outDir, `office-des-changes-${year}-${stage}.csv`);
  await fs.writeFile(filePath, rows.map((row) => row.map(csvEscape).join(",")).join("\n"), "utf8");
  log(`Table extraite en CSV: ${filePath}`);
  return filePath;
}

async function saveDownload(download, year) {
  await fs.mkdir(outDir, { recursive: true });
  const suggested = download.suggestedFilename();
  const filePath = path.join(outDir, suggested || `office-des-changes-${year}.csv`);
  await download.saveAs(filePath);
  log(`CSV telecharge: ${filePath}`);
  return filePath;
}

async function retryPortalError(page, year) {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const hasPortalError = await page.evaluate(() => document.body.innerText.includes("Une erreur est survenue"));
    if (!hasPortalError) return;

    log(`Erreur portail detectee, tentative de reessai ${attempt}`);
    const retried = await tryClick(page, ["Réessayer", "Reessayer"]);
    if (!retried) return;
    await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => undefined);
    await page.waitForTimeout(10_000);
    await saveDebug(page, year, `after-retry-${attempt}`);
  }
}

async function downloadPortalCsv(page, year) {
  log(`Preparation de la requete ${year}`);
  await page.goto(portalUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });

  await checkInputsById(page, [
    `cbAnnee${year}`,
    "cbValeurDHS",
    "cbAnnee",
    "cbCodeProduitSH",
    "cbLibelleProduitSH",
    "cbLibellePays",
    "cbLibelleFlux",
  ]);

  for (let step = 1; step <= 2; step += 1) {
    const advanced = await tryClick(page, ["Suivant", "Resultat", "Preparer", "Requete"]);
    if (!advanced) {
      log(`Avancement etape ${step}: aucun bouton suivant/resultat trouve.`);
      break;
    }
    log(`Avancement etape ${step}: OK`);
    await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => undefined);
    await page.waitForTimeout(5_000);
    await saveDebug(page, year, `after-step-${step}`);

    const stepCsv = await extractTableCsv(page, year, `after-step-${step}`);
    if (stepCsv) return stepCsv;
  }

  await saveDebug(page, year, "after-query");
  await retryPortalError(page, year);

  const tableCsv = await extractTableCsv(page, year, "after-query");
  if (tableCsv) return tableCsv;

  const downloadPromise = page.waitForEvent("download", { timeout: 60_000 }).catch(() => null);
  const popupPromise = page.waitForEvent("popup", { timeout: 60_000 }).catch(() => null);
  const clicked = await tryClick(page, ["Export agrégé", "Export agrege", "Export tabulaire", "CSV", "Exporter", "Export"]);
  if (!clicked) throw new Error("Bouton export CSV introuvable. Le portail a probablement change de structure.");

  const firstResult = await Promise.race([
    downloadPromise.then((download) => ({ type: "download", value: download })),
    popupPromise.then((popup) => ({ type: "popup", value: popup })),
    new Promise((resolve) => setTimeout(() => resolve({ type: "timeout", value: null }), 45_000)),
  ]);

  if (firstResult.type === "download" && firstResult.value) return saveDownload(firstResult.value, year);

  if (firstResult.type === "popup" && firstResult.value) {
    const popup = firstResult.value;
    await popup.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => undefined);
    await saveDebug(popup, year, "popup");
    const popupCsv = await extractTableCsv(popup, year, "popup");
    if (popupCsv) return popupCsv;
    const popupDownload = await popup.waitForEvent("download", { timeout: 10_000 }).catch(() => null);
    if (popupDownload) return saveDownload(popupDownload, year);
  }

  await saveDebug(page, year, "after-export");
  const afterExportCsv = await extractTableCsv(page, year, "after-export");
  if (afterExportCsv) return afterExportCsv;

  throw new Error("Flux import/export introuvable apres requete/export. Consultez les artefacts debug HTML/PNG du workflow.");
}

async function uploadToApp(filePath) {
  if (skipUpload) {
    log(`Upload ignore par SKIP_UPLOAD=true: ${filePath}`);
    return;
  }
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
      const normalizedPath = await normalizeOfficeCsv(filePath, year);
      await uploadToApp(normalizedPath);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
