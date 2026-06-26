import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Printer,
  Receipt,
  RotateCcw,
  User,
  Phone,
  CalendarDays,
  MapPin,
  IndianRupee,
  CheckCircle2,
  Truck,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Yaad Vibrator – Billing System" },
      { name: "description", content: "Generate professional booking receipts for Yaad Vibrator transport services." },
      { property: "og:title", content: "Yaad Vibrator – Billing System" },
      { property: "og:description", content: "Generate professional booking receipts for Yaad Vibrator transport services." },
    ],
  }),
  component: Index,
});

const todayISO = () => new Date().toISOString().slice(0, 10);

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(isFinite(n) ? n : 0);

const formatDate = (iso: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const counterKey = () => `yv-bill-counter-${new Date().getFullYear()}`;
const formatBillNo = (n: number) => `YV-${new Date().getFullYear()}-${String(n).padStart(4, "0")}`;

const numberToWords = (num: number): string => {
  if (!isFinite(num) || num <= 0) return "Zero";
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const inWords = (n: number): string => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
    if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + inWords(n % 100) : "");
    if (n < 100000) return inWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + inWords(n % 1000) : "");
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + inWords(n % 100000) : "");
    return inWords(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + inWords(n % 10000000) : "");
  };
  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  let result = inWords(rupees) + " Rupees";
  if (paise) result += " and " + inWords(paise) + " Paise";
  return result + " Only";
};

interface Bill {
  billNo: string;
  generatedAt: string;
  customerName: string;
  mobile: string;
  bookingDate: string;
  serviceDate: string;
  from: string;
  to: string;
  total: number;
  advance: number;
  balance: number;
}

function Index() {
  const [customerName, setCustomerName] = useState("");
  const [mobile, setMobile] = useState("");
  const [bookingDate, setBookingDate] = useState(todayISO());
  const [serviceDate, setServiceDate] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [total, setTotal] = useState("");
  const [advance, setAdvance] = useState("");
  const [preview, setPreview] = useState("YV-----");
  const [bill, setBill] = useState<Bill | null>(null);
  const [error, setError] = useState("");

  // SSR-safe localStorage access
  useEffect(() => {
    const current = parseInt(localStorage.getItem(counterKey()) ?? "0", 10) || 0;
    setPreview(formatBillNo(current + 1));
  }, [bill]);

  const totalNum = parseFloat(total) || 0;
  const advanceNum = parseFloat(advance) || 0;
  const balance = useMemo(() => Math.max(totalNum - advanceNum, 0), [totalNum, advanceNum]);

  const reset = () => {
    setCustomerName(""); setMobile(""); setBookingDate(todayISO());
    setServiceDate(""); setFrom(""); setTo(""); setTotal(""); setAdvance("");
    setBill(null); setError("");
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setError("Customer name is required.");
      return;
    }
    setError("");
    const current = parseInt(localStorage.getItem(counterKey()) ?? "0", 10) || 0;
    const next = current + 1;
    localStorage.setItem(counterKey(), String(next));
    setBill({
      billNo: formatBillNo(next),
      generatedAt: new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
      customerName: customerName.trim(),
      mobile: mobile.trim(),
      bookingDate, serviceDate,
      from: from.trim(), to: to.trim(),
      total: totalNum, advance: advanceNum, balance,
    });
    setTimeout(() => document.getElementById("invoice")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };

  return (
    <div className="min-h-screen">
      {/* HEADER */}
      <header className="no-print sticky top-0 z-20 border-b border-border/60 bg-card/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl text-primary-foreground"
              style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-lift)" }}
            >
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight tracking-tight">Yaad Vibrator</h1>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Booking & Billing Suite
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <span className="chip">
              <CheckCircle2 className="h-3 w-3" /> Live
            </span>
            <span className="hidden text-xs text-muted-foreground md:inline">
              Thalakudi, Mangalpur, Jajpur, Odisha
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {/* HERO STRIP */}
        <section className="no-print mb-8 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Next Bill", value: preview, icon: Receipt },
            { label: "Today", value: formatDate(todayISO()), icon: CalendarDays },
            { label: "Status", value: bill ? "Ready to print" : "Awaiting booking", icon: CheckCircle2 },
          ].map((s) => (
            <div
              key={s.label}
              className="surface-3d flex items-center gap-3 rounded-2xl p-4"
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: "var(--gradient-gold)", color: "var(--ink)" }}
              >
                <s.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {s.label}
                </p>
                <p className="truncate font-mono text-sm font-semibold">{s.value}</p>
              </div>
            </div>
          ))}
        </section>

        <div className="grid gap-8 lg:grid-cols-[1.05fr_1fr]">
          {/* FORM */}
          <form onSubmit={handleGenerate} className="no-print">
            <div className="surface-3d rounded-3xl p-6 sm:p-8">
              <div className="mb-6 flex items-end justify-between">
                <div>
                  <p className="chip mb-2">New Entry</p>
                  <h2 className="text-2xl font-bold tracking-tight">Booking Details</h2>
                </div>
              </div>

              {/* Customer */}
              <FieldGroup icon={<User className="h-4 w-4" />} title="Customer">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Customer Name" required>
                    <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Full name" required />
                  </Field>
                  <Field label="Mobile" icon={<Phone className="h-3.5 w-3.5" />}>
                    <Input type="tel" inputMode="numeric" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="Optional" />
                  </Field>
                </div>
              </FieldGroup>

              <Separator className="my-6" />

              <FieldGroup icon={<CalendarDays className="h-4 w-4" />} title="Schedule">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Booking Date">
                    <Input type="date" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} />
                  </Field>
                  <Field label="Service Date">
                    <Input type="date" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} />
                  </Field>
                </div>
              </FieldGroup>

              <Separator className="my-6" />

              <FieldGroup icon={<MapPin className="h-4 w-4" />} title="Route">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Pickup / From">
                    <Input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="e.g. Jajpur" />
                  </Field>
                  <Field label="Destination / To">
                    <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="e.g. Cuttack" />
                  </Field>
                </div>
              </FieldGroup>

              <Separator className="my-6" />

              <FieldGroup icon={<IndianRupee className="h-4 w-4" />} title="Payment">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Total (₹)">
                    <Input type="number" min="0" step="0.01" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="0.00" />
                  </Field>
                  <Field label="Advance (₹)">
                    <Input type="number" min="0" step="0.01" value={advance} onChange={(e) => setAdvance(e.target.value)} placeholder="0.00" />
                  </Field>
                  <Field label="Balance (₹)">
                    <div
                      className="flex h-9 items-center rounded-md border px-3 font-mono text-sm font-semibold"
                      style={{ background: "var(--gradient-warm)", color: "var(--brand-deep)" }}
                    >
                      {formatINR(balance)}
                    </div>
                  </Field>
                </div>
              </FieldGroup>

              {error && (
                <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
              )}

              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  type="submit"
                  size="lg"
                  className="gap-2 rounded-xl border-0 text-primary-foreground"
                  style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-press)" }}
                >
                  <Receipt className="h-4 w-4" />
                  Generate Bill
                </Button>
                <Button type="button" variant="outline" size="lg" onClick={reset} className="gap-2 rounded-xl">
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
              </div>
            </div>
          </form>

          {/* LIVE PREVIEW PLACEHOLDER */}
          <aside className="no-print">
            <div
              className="surface-3d sticky top-24 rounded-3xl p-6"
              style={{ background: "var(--gradient-warm)" }}
            >
              <p className="chip mb-3">Live Preview</p>
              <h3 className="mb-1 text-lg font-bold">Quick Summary</h3>
              <p className="mb-5 text-sm text-muted-foreground">
                Updates as you fill the form. Click Generate Bill to lock the receipt.
              </p>
              <dl className="space-y-3 text-sm">
                <Row k="Customer" v={customerName || "—"} />
                <Row k="Mobile" v={mobile || "—"} />
                <Row k="Service Date" v={formatDate(serviceDate)} />
                <Row k="Route" v={from || to ? `${from || "—"} → ${to || "—"}` : "—"} />
                <Separator />
                <Row k="Total" v={formatINR(totalNum)} />
                <Row k="Advance" v={formatINR(advanceNum)} />
                <div
                  className="mt-2 flex items-center justify-between rounded-xl px-4 py-3 text-primary-foreground"
                  style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-lift)" }}
                >
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] opacity-80">Balance Due</span>
                  <span className="font-mono text-lg font-bold">{formatINR(balance)}</span>
                </div>
              </dl>
            </div>
          </aside>
        </div>

        {/* INVOICE */}
        {bill && (
          <section id="invoice" className="mt-12">
            <div className="no-print mb-4 flex items-center justify-between">
              <div>
                <p className="chip mb-1">Generated</p>
                <h2 className="text-2xl font-bold tracking-tight">Booking Receipt</h2>
              </div>
              <Button
                size="lg"
                onClick={() => window.print()}
                className="gap-2 rounded-xl border-0 text-primary-foreground"
                style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-press)" }}
              >
                <Printer className="h-4 w-4" />
                Print / Save PDF
              </Button>
            </div>

            <Invoice bill={bill} />
          </section>
        )}

        <footer className="no-print mt-16 pb-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Yaad Vibrator · Thalakudi, Mangalpur, Jajpur, Odisha
        </footer>
      </main>
    </div>
  );
}

/* ----------- Small UI helpers ----------- */
function Field({
  label, required, icon, children,
}: { label: string; required?: boolean; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {icon}
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

function FieldGroup({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ background: "var(--gradient-gold)", color: "var(--ink)" }}
        >
          {icon}
        </div>
        <h3 className="text-sm font-bold tracking-tight">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{k}</dt>
      <dd className="truncate text-right font-medium">{v}</dd>
    </div>
  );
}

/* ----------- INVOICE ----------- */
function Invoice({ bill }: { bill: Bill }) {
  return (
    <article
      className="invoice-sheet mx-auto max-w-3xl overflow-hidden rounded-3xl border bg-card text-[color:var(--ink)]"
      style={{ boxShadow: "var(--shadow-3d)" }}
    >
      {/* Header band */}
      <div
        className="relative px-10 py-8 text-primary-foreground"
        style={{ background: "var(--gradient-brand)" }}
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, transparent 0 14px, rgba(255,255,255,0.18) 14px 15px)",
          }}
        />
        <div className="relative flex items-start justify-between gap-6">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30 backdrop-blur"
            >
              <Truck className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-[0.02em]">YAAD VIBRATOR</h1>
              <p className="text-xs uppercase tracking-[0.28em] opacity-85">
                Transport & Booking Services
              </p>
              <p className="mt-1 text-xs opacity-80">Thalakudi, Mangalpur, Jajpur, Odisha</p>
            </div>
          </div>
          <div className="text-right">
            <span
              className="inline-block rounded-full px-4 py-1 text-[10px] font-bold uppercase tracking-[0.3em]"
              style={{ background: "var(--gradient-gold)", color: "var(--ink)" }}
            >
              Booking Receipt
            </span>
            <p className="mt-3 font-mono text-sm opacity-95">{bill.billNo}</p>
            <p className="font-mono text-[11px] opacity-75">{bill.generatedAt}</p>
          </div>
        </div>
      </div>

      {/* Meta strip */}
      <div className="grid grid-cols-2 gap-4 border-b bg-muted/40 px-10 py-5 text-sm sm:grid-cols-4">
        <Meta k="Bill No." v={bill.billNo} mono />
        <Meta k="Booking Date" v={formatDate(bill.bookingDate)} />
        <Meta k="Service Date" v={formatDate(bill.serviceDate)} />
        <Meta k="Issued" v={bill.generatedAt} />
      </div>

      {/* Body */}
      <div className="grid gap-8 px-10 py-8 sm:grid-cols-2">
        <Block title="Billed To">
          <p className="text-lg font-bold leading-tight">{bill.customerName}</p>
          {bill.mobile && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Phone className="h-3.5 w-3.5" /> {bill.mobile}
            </p>
          )}
        </Block>
        <Block title="Journey">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center pt-1">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--brand)" }} />
              <span className="my-1 h-7 w-px bg-border" />
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "var(--gold)" }} />
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">From</p>
                <p className="font-semibold leading-tight">{bill.from || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">To</p>
                <p className="font-semibold leading-tight">{bill.to || "—"}</p>
              </div>
            </div>
          </div>
        </Block>
      </div>

      {/* Payment table */}
      <div className="px-10 pb-2">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Payment Summary
        </h3>
        <div className="overflow-hidden rounded-2xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/60 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <th className="px-4 py-2.5">Description</th>
                <th className="px-4 py-2.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="px-4 py-3">Booking Charges (Total)</td>
                <td className="px-4 py-3 text-right font-mono font-semibold">{formatINR(bill.total)}</td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-3 text-muted-foreground">Less: Advance Paid</td>
                <td className="px-4 py-3 text-right font-mono">− {formatINR(bill.advance)}</td>
              </tr>
              <tr
                className="border-t text-primary-foreground"
                style={{ background: "var(--gradient-brand)" }}
              >
                <td className="px-4 py-3.5 text-sm font-bold uppercase tracking-wider">Balance Due</td>
                <td className="px-4 py-3.5 text-right font-mono text-base font-bold">
                  {formatINR(bill.balance)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs italic text-muted-foreground">
          <span className="font-semibold not-italic text-foreground">In words: </span>
          {numberToWords(bill.balance)}
        </p>
      </div>

      {/* Footer */}
      <div className="mt-6 grid grid-cols-1 gap-6 border-t bg-muted/30 px-10 py-7 sm:grid-cols-2">
        <div className="text-xs text-muted-foreground">
          <p className="text-sm font-semibold text-foreground">Thank you for choosing Yaad Vibrator.</p>
          <p className="mt-1">Please carry this receipt during the service.</p>
          <p className="mt-3 leading-relaxed">
            For queries regarding this booking, contact us with the bill number above. This is a
            computer-generated receipt.
          </p>
        </div>
        <div className="flex flex-col items-end justify-end">
          <div className="h-14 w-56 border-b-2 border-dashed border-foreground/60" />
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Authorized Signature
          </p>
        </div>
      </div>

      {/* Bottom rule */}
      <div className="h-1.5" style={{ background: "var(--gradient-gold)" }} />
    </article>
  );
}

function Meta({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{k}</p>
      <p className={`mt-0.5 text-sm font-semibold ${mono ? "font-mono" : ""}`}>{v}</p>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}
