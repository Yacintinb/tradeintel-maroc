"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";

export function LineChartCard({ title, data }: { title: string; data: Record<string, unknown>[] }) {
  return (
    <Card>
      <h2 className="mb-4 text-sm font-semibold text-slate-900">{title}</h2>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="imports" stroke="#0f766e" strokeWidth={2} />
            <Line type="monotone" dataKey="exports" stroke="#334155" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function BarChartCard({ title, data, dataKey = "value", nameKey = "name" }: { title: string; data: Record<string, unknown>[]; dataKey?: string; nameKey?: string }) {
  return (
    <Card>
      <h2 className="mb-4 text-sm font-semibold text-slate-900">{title}</h2>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={nameKey} />
            <YAxis />
            <Tooltip />
            <Bar dataKey={dataKey} fill="#0f766e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
