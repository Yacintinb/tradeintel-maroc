import { prisma } from "@/lib/prisma";

export type CkanDataset = {
  id: string;
  title: string;
  notes?: string;
  organization?: { title?: string; name?: string };
  resources?: { format?: string; url?: string; last_modified?: string }[];
  metadata_modified?: string;
};

function base(endpoint?: string) {
  return (endpoint || process.env.CKAN_ENDPOINT || "https://data.gov.ma/api/3/action").replace(/\/$/, "");
}

export async function packageSearch(query: string, endpoint?: string) {
  const url = `${base(endpoint)}/package_search?q=${encodeURIComponent(query)}&rows=20`;
  const response = await fetch(url, { next: { revalidate: 3600 } });
  if (!response.ok) throw new Error(`CKAN package_search failed: ${response.status}`);
  const json = await response.json();
  return (json.result?.results ?? []) as CkanDataset[];
}

export async function packageShow(datasetId: string, endpoint?: string) {
  const url = `${base(endpoint)}/package_show?id=${encodeURIComponent(datasetId)}`;
  const response = await fetch(url, { next: { revalidate: 3600 } });
  if (!response.ok) throw new Error(`CKAN package_show failed: ${response.status}`);
  const json = await response.json();
  return json.result as CkanDataset;
}

export function normalizeDatasetMetadata(dataset: CkanDataset, source = "data.gov.ma") {
  const resource = dataset.resources?.[0];
  return {
    source,
    datasetId: dataset.id,
    title: dataset.title,
    description: dataset.notes,
    organization: dataset.organization?.title ?? dataset.organization?.name,
    format: resource?.format,
    url: resource?.url,
    lastModified: resource?.last_modified ? new Date(resource.last_modified) : dataset.metadata_modified ? new Date(dataset.metadata_modified) : null,
  };
}

export async function saveOpenDataset(dataset: CkanDataset, source = "data.gov.ma") {
  const data = normalizeDatasetMetadata(dataset, source);
  return prisma.openDataset.upsert({
    where: { source_datasetId: { source: data.source, datasetId: data.datasetId } },
    create: data,
    update: data,
  });
}
