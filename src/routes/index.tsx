import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Printer, Receipt, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Yaad Vibrator – Billing System" },
      { name: "description", content: "Generate booking receipts for Yaad Vibrator transport services." },
      { property: "og:title", content: "Yaad Vibrator – Billing System" },
      { property: "og:description", content: "Generate booking receipts for Yaad Vibrator transport services." },
    ],
  }),
  component: Index,
});

const todayISO = () => new Date().toISOString().slice(0, 10);

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(
    isFinite(n) ? n : 0,
  );

const formatDate = (iso: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const nextBillNumber = () => {
  const year = new Date().getFullYear();
  const key = `yv-bill-counter-${year}`;
  const current = parseInt(localStorage.getItem(key) ?? "0", 10) || 0;
  const next = current + 1;
  localStorage.setItem(key, String(next));
  return `YV-${year}-${String(next).padStart(4, "0")}`;
};

const previewBillNumber = () => {
  const year = new Date().getFullYear();
  const key = `yv-bill-counter-${year}`;
  const current = parseInt(localStorage.getItem(key) ?? "0", 10) || 0;
  return `YV-${year}-${String(current + 1).padStart(4, "0")}`;
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
  const [preview, setPreview] = useState(previewBillNumber());
  const [bill, setBill] = useState<Bill | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setPreview(previewBillNumber());
  }, [bill]);

  const totalNum = parseFloat(total) || 0;
  const advanceNum = parseFloat(advance) || 0;
  const balance = useMemo(() => Math.max(totalNum - advanceNum, 0), [totalNum, advanceNum]);

  const reset = () => {
    setCustomerName("");
    setMobile("");
    setBookingDate(todayISO());
    setServiceDate("");
    setFrom("");
    setTo("");
    setTotal("");
    setAdvance("");
    setBill(null);
    setError("");
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setError("Customer name is required.");
      return;
    }
    setError("");
    const newBill: Bill = {
      billNo: nextBillNumber(),
      generatedAt: new Date().toLocaleString("en-IN"),
      customerName: customerName.trim(),
      mobile: mobile.trim(),
      bookingDate,
      serviceDate,
      from: from.trim(),
      to: to.trim(),
      total: totalNum,
      advance: advanceNum,
      balance,
    };
    setBill(newBill);
    setTimeout(() => {
      document.getElementById("invoice")?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b bg-card print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight">Yaad Vibrator</h1>
              <p className="text-xs text-muted-foreground">Billing & Booking System</p>
            </div>
          </div>
          <div className="hidden text-right text-xs text-muted-foreground sm:block">
            Thalakudi, Mangalpur,
            <br />
            Jajpur, Odisha
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 print:px-0 print:py-0">
        <div className="grid gap-6 print:hidden">
          <form onSubmit={handleGenerate}>
            <Card>
              <CardHeader>
                <CardTitle>New Booking</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Next bill number: <span className="font-mono text-foreground">{preview}</span>
                </p>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Customer */}
                <section className="space-y-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Customer Details
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">
                        Customer Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="name"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Full name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mobile">Mobile Number</Label>
                      <Input
                        id="mobile"
                        type="tel"
                        inputMode="numeric"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                </section>

                <Separator />

                {/* Booking */}
                <section className="space-y-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Booking Details
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="bookingDate">Booking Date</Label>
                      <Input
                        id="bookingDate"
                        type="date"
                        value={bookingDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="serviceDate">Service Date</Label>
                      <Input
                        id="serviceDate"
                        type="date"
                        value={serviceDate}
                        onChange={(e) => setServiceDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="from">Pickup / From</Label>
                      <Input
                        id="from"
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                        placeholder="e.g. Jajpur"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="to">Destination / To</Label>
                      <Input
                        id="to"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        placeholder="e.g. Cuttack"
                      />
                    </div>
                  </div>
                </section>

                <Separator />

                {/* Payment */}
                <section className="space-y-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Payment Details
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="total">Total Amount (₹)</Label>
                      <Input
                        id="total"
                        type="number"
                        min="0"
                        step="0.01"
                        value={total}
                        onChange={(e) => setTotal(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="advance">Advance Paid (₹)</Label>
                      <Input
                        id="advance"
                        type="number"
                        min="0"
                        step="0.01"
                        value={advance}
                        onChange={(e) => setAdvance(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Balance (₹)</Label>
                      <div className="flex h-9 items-center rounded-md border bg-muted px-3 font-mono text-sm">
                        {formatINR(balance)}
                      </div>
                    </div>
                  </div>
                </section>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <div className="flex flex-wrap gap-3">
                  <Button type="submit" className="gap-2">
                    <Receipt className="h-4 w-4" />
                    Generate Bill
                  </Button>
                  <Button type="button" variant="outline" onClick={reset} className="gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>

        {/* Invoice */}
        {bill && (
          <section id="invoice" className="mt-8 print:mt-0">
            <div className="mb-4 flex items-center justify-between print:hidden">
              <h2 className="text-lg font-semibold">Booking Receipt</h2>
              <Button onClick={() => window.print()} className="gap-2">
                <Printer className="h-4 w-4" />
                Print Invoice
              </Button>
            </div>

            <div className="invoice-sheet mx-auto max-w-3xl rounded-lg border bg-card p-8 shadow-sm print:max-w-none print:border-0 print:shadow-none">
              <div className="text-center">
                <h1 className="text-3xl font-bold tracking-tight">YAAD VIBRATOR</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Thalakudi, Mangalpur, Jajpur, Odisha
                </p>
                <div className="mx-auto mt-4 inline-block rounded border-y-2 border-foreground px-6 py-1 text-sm font-semibold tracking-[0.3em]">
                  BOOKING RECEIPT
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Bill No.</p>
                  <p className="font-mono font-semibold">{bill.billNo}</p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground">Generated</p>
                  <p className="font-medium">{bill.generatedAt}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Booking Date</p>
                  <p className="font-medium">{formatDate(bill.bookingDate)}</p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground">Service Date</p>
                  <p className="font-medium">{formatDate(bill.serviceDate)}</p>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="grid gap-6 text-sm sm:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Customer
                  </h3>
                  <p className="text-base font-semibold">{bill.customerName}</p>
                  {bill.mobile && <p className="text-muted-foreground">📞 {bill.mobile}</p>}
                </div>
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Journey
                  </h3>
                  <p>
                    <span className="text-muted-foreground">From:</span>{" "}
                    <span className="font-medium">{bill.from || "—"}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">To:</span>{" "}
                    <span className="font-medium">{bill.to || "—"}</span>
                  </p>
                </div>
              </div>

              <Separator className="my-6" />

              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Payment Summary
                </h3>
                <div className="overflow-hidden rounded-md border">
                  <div className="flex justify-between px-4 py-2 text-sm">
                    <span>Total Amount</span>
                    <span className="font-medium">{formatINR(bill.total)}</span>
                  </div>
                  <div className="flex justify-between border-t px-4 py-2 text-sm">
                    <span>Advance Paid</span>
                    <span className="font-medium">{formatINR(bill.advance)}</span>
                  </div>
                  <div className="flex justify-between border-t bg-muted px-4 py-3 text-base font-semibold">
                    <span>Balance Due</span>
                    <span>{formatINR(bill.balance)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-10 text-center text-sm">
                <p className="font-medium">Thank you for choosing Yaad Vibrator.</p>
                <p className="text-muted-foreground">Please carry this receipt during the service.</p>
              </div>

              <div className="mt-12 flex justify-end">
                <div className="text-center">
                  <div className="h-px w-48 bg-foreground" />
                  <p className="mt-1 text-xs text-muted-foreground">Authorized Signature</p>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      <style>{`
        @media print {
          body { background: white; }
          .invoice-sheet { box-shadow: none !important; border: 0 !important; padding: 0 !important; }
          @page { margin: 16mm; }
        }
      `}</style>
    </div>
  );
}
