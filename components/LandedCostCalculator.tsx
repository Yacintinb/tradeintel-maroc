"use client";

import { useMemo, useState } from "react";
import { Calculator, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type TariffOption = {
  hsCode: string;
  description: string;
  dutyRate: number;
  vatRate: number;
  parafiscalTax: number;
};

type ExchangeOption = {
  currency: string;
  rateMad: number;
};

function numberValue(value: string) {
  return Number(value.replace(",", ".")) || 0;
}

function money(value: number) {
  return new Intl.NumberFormat("fr-MA", { style: "currency", currency: "MAD", maximumFractionDigits: 0 }).format(value);
}

function percent(value: number) {
  return new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 1 }).format(value);
}

export function LandedCostCalculator({
  tariffs,
  exchangeRates,
}: {
  tariffs: TariffOption[];
  exchangeRates: ExchangeOption[];
}) {
  const [hsCode, setHsCode] = useState(tariffs[0]?.hsCode ?? "");
  const [currency, setCurrency] = useState(exchangeRates[0]?.currency ?? "EUR");
  const [goodsValue, setGoodsValue] = useState("10000");
  const [quantity, setQuantity] = useState("100");
  const [freight, setFreight] = useState("1200");
  const [insurance, setInsurance] = useState("150");
  const [otherFees, setOtherFees] = useState("0");
  const [targetMargin, setTargetMargin] = useState("25");

  const selectedTariff = tariffs.find((item) => item.hsCode === hsCode);
  const selectedRate = exchangeRates.find((item) => item.currency === currency)?.rateMad ?? 1;

  const result = useMemo(() => {
    const goodsMad = numberValue(goodsValue) * selectedRate;
    const freightMad = numberValue(freight) * selectedRate;
    const insuranceMad = numberValue(insurance) * selectedRate;
    const otherFeesMad = numberValue(otherFees);
    const cif = goodsMad + freightMad + insuranceMad;
    const duty = cif * ((selectedTariff?.dutyRate ?? 0) / 100);
    const parafiscal = cif * ((selectedTariff?.parafiscalTax ?? 0) / 100);
    const taxableBase = cif + duty + parafiscal;
    const vat = taxableBase * ((selectedTariff?.vatRate ?? 0) / 100);
    const total = cif + duty + parafiscal + vat + otherFeesMad;
    const unitCost = total / Math.max(numberValue(quantity), 1);
    const sellingPrice = unitCost / Math.max(1 - numberValue(targetMargin) / 100, 0.01);
    return { goodsMad, freightMad, insuranceMad, cif, duty, parafiscal, vat, otherFeesMad, total, unitCost, sellingPrice };
  }, [freight, goodsValue, insurance, otherFees, quantity, selectedRate, selectedTariff, targetMargin]);

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
      <div className="rounded-md border border-slate-200 bg-white p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm text-slate-600">
            Code SH / tarif
            <Select value={hsCode} onChange={(event) => setHsCode(event.target.value)}>
              {tariffs.map((item) => (
                <option key={item.hsCode} value={item.hsCode}>
                  {item.hsCode} - {item.description}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-1 text-sm text-slate-600">
            Devise facture
            <Select value={currency} onChange={(event) => setCurrency(event.target.value)}>
              {exchangeRates.map((item) => (
                <option key={item.currency} value={item.currency}>
                  {item.currency} = {item.rateMad} MAD
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-1 text-sm text-slate-600">
            Valeur marchandise
            <Input value={goodsValue} onChange={(event) => setGoodsValue(event.target.value)} inputMode="decimal" />
          </label>
          <label className="grid gap-1 text-sm text-slate-600">
            Quantité
            <Input value={quantity} onChange={(event) => setQuantity(event.target.value)} inputMode="decimal" />
          </label>
          <label className="grid gap-1 text-sm text-slate-600">
            Fret
            <Input value={freight} onChange={(event) => setFreight(event.target.value)} inputMode="decimal" />
          </label>
          <label className="grid gap-1 text-sm text-slate-600">
            Assurance
            <Input value={insurance} onChange={(event) => setInsurance(event.target.value)} inputMode="decimal" />
          </label>
          <label className="grid gap-1 text-sm text-slate-600">
            Autres frais MAD
            <Input value={otherFees} onChange={(event) => setOtherFees(event.target.value)} inputMode="decimal" />
          </label>
          <label className="grid gap-1 text-sm text-slate-600">
            Marge cible %
            <Input value={targetMargin} onChange={(event) => setTargetMargin(event.target.value)} inputMode="decimal" />
          </label>
        </div>
        <div className="mt-5 grid gap-3 rounded-md bg-slate-50 p-4 text-sm text-slate-700 md:grid-cols-3">
          <div><span className="text-slate-500">Droit</span><br /><strong>{percent(selectedTariff?.dutyRate ?? 0)}%</strong></div>
          <div><span className="text-slate-500">TVA</span><br /><strong>{percent(selectedTariff?.vatRate ?? 0)}%</strong></div>
          <div><span className="text-slate-500">Parafiscal</span><br /><strong>{percent(selectedTariff?.parafiscalTax ?? 0)}%</strong></div>
        </div>
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-4">
        <div className="mb-4 flex items-center gap-2">
          <Calculator className="h-5 w-5 text-teal-700" />
          <h2 className="font-semibold text-slate-950">Coût débarqué estimé</h2>
        </div>
        <div className="space-y-3 text-sm">
          <Row label="Valeur marchandise MAD" value={money(result.goodsMad)} />
          <Row label="Fret + assurance MAD" value={money(result.freightMad + result.insuranceMad)} />
          <Row label="Base CIF" value={money(result.cif)} />
          <Row label="Droits de douane" value={money(result.duty)} />
          <Row label="Taxe parafiscale" value={money(result.parafiscal)} />
          <Row label="TVA" value={money(result.vat)} />
          <Row label="Autres frais" value={money(result.otherFeesMad)} />
        </div>
        <div className="mt-4 rounded-md bg-teal-700 p-4 text-white">
          <div className="text-sm opacity-90">Coût total rendu Maroc</div>
          <div className="mt-1 text-2xl font-bold">{money(result.total)}</div>
          <div className="mt-3 text-sm opacity-90">Coût unitaire</div>
          <div className="text-xl font-semibold">{money(result.unitCost)}</div>
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-md border border-slate-200 p-3 text-sm text-slate-700">
          <Percent className="mt-0.5 h-4 w-4 text-slate-500" />
          <div>
            Prix de vente cible avec {percent(numberValue(targetMargin))}% de marge : <strong>{money(result.sellingPrice)}</strong> / unité.
          </div>
        </div>
        <Button type="button" className="mt-4 w-full">Exporter le calcul bientôt</Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
      <span className="text-slate-500">{label}</span>
      <strong className="text-right text-slate-950">{value}</strong>
    </div>
  );
}
