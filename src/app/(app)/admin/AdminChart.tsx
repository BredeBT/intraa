"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  data: { day: string; hendelser: number }[];
}

export default function AdminChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} barSize={28}>
        <XAxis dataKey="day" tick={{ fill: "#71717a", fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "#71717a", fontSize: 12 }} axisLine={false} tickLine={false} width={28} />
        <Tooltip
          contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }}
          cursor={{ fill: "rgba(99,102,241,0.08)" }}
        />
        <Bar dataKey="hendelser" fill="#6366f1" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
