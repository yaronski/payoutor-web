import { NextResponse } from "next/server";

type RateProvider = {
  name: string;
  url: string;
  parse: (payload: unknown) => { rate: number; asOf?: string | null } | null;
};

const PROVIDERS: RateProvider[] = [
  {
    name: "ExchangerateHost",
    url: "https://api.exchangerate.host/latest?base=EUR&symbols=USD",
    parse: payload => {
      const data = payload as { rates?: { USD?: number }; date?: string };
      const rate = data?.rates?.USD;
      if (typeof rate !== "number") return null;
      return { rate, asOf: data?.date ?? null };
    },
  },
  {
    name: "Frankfurter",
    url: "https://api.frankfurter.app/latest?from=EUR&to=USD",
    parse: payload => {
      const data = payload as { rates?: { USD?: number }; date?: string };
      const rate = data?.rates?.USD;
      if (typeof rate !== "number") return null;
      return { rate, asOf: data?.date ?? null };
    },
  },
];

export async function GET() {
  const errors: string[] = [];
  for (const provider of PROVIDERS) {
    try {
      const res = await fetch(provider.url, { next: { revalidate: 600 } });
      if (!res.ok) {
        throw new Error(`status ${res.status}`);
      }
      const data = await res.json();
      const parsed = provider.parse(data);
      if (!parsed) {
        throw new Error("unexpected payload");
      }
      return NextResponse.json({
        rate: parsed.rate,
        asOf: parsed.asOf ?? null,
        source: provider.name,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "unknown error";
      errors.push(`${provider.name}: ${message}`);
    }
  }
  return NextResponse.json(
    { error: `Failed to fetch EUR → USD rate. ${errors.join(" | ")}` },
    { status: 500 }
  );
}

