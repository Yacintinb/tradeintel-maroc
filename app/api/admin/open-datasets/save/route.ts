import { NextRequest, NextResponse } from "next/server";
import { packageShow, saveOpenDataset } from "@/lib/connectors/ckan";

export async function POST(request: NextRequest) {
  const { datasetId, endpoint } = await request.json();
  const dataset = await packageShow(datasetId, endpoint);
  return NextResponse.json(await saveOpenDataset(dataset));
}
