
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { jsPDF } from "jspdf";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Capacitor } from "@capacitor/core";
import {
  Printer,
  Receipt,
  RotateCcw,
  User,
  Phone,
  CalendarDays,
  IndianRupee,
  CheckCircle2,
  Truck,
  Clock,
  FileText,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Yaad Vibrator – Billing System" },
      {
        name: "description",
        content:
          "Generate professional booking receipts for Yaad Vibrator transport services.",
      },
      { property: "og:title", content: "Yaad Vibrator – Billing System" },
      {
        property: "og:description",
        content:
          "Generate professional booking receipts for Yaad Vibrator transport services.",
      },
    ],
  }),
  component: Index,
});

const DEFAULT_TERMS =
  "The customer must ensure safe access to the service location. Any changes to the booking must be communicated in advance. The customer is responsible for their personal belongings.";

const todayISO = () => {
  const date = new Date();
  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  );
  return localDate.toISOString().slice(0, 10);
};

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);

const formatDate = (iso: string) => {
  if (!iso) return "—";

  const date = new Date(`${iso}T00:00:00`);
  if (isNaN(date.getTime())) return iso;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (time: string) => {
  if (!time) return "—";

  const [hours, minutes] = time.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return time;

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const counterKey = () => `yv-bill-counter-${new Date().getFullYear()}`;

const formatBillNo = (n: number) =>
  `YV-${new Date().getFullYear()}-${String(n).padStart(4, "0")}`;

const maskAadhaar = (aadhaar: string) =>
  aadhaar ? `XXXX-XXXX-${aadhaar.slice(-4)}` : "Not provided";

const numberToWords = (num: number): string => {
  if (!Number.isFinite(num) || num <= 0) return "Zero";

  const a = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];

  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  const inWords = (n: number): string => {
    if (n < 20) return a[n];

    if (n < 100) {
      return b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
    }

    if (n < 1000) {
      return (
        a[Math.floor(n / 100)] +
        " Hundred" +
        (n % 100 ? " " + inWords(n % 100) : "")
      );
    }

    if (n < 100000) {
      return (
        inWords(Math.floor(n / 1000)) +
        " Thousand" +
        (n % 1000 ? " " + inWords(n % 1000) : "")
      );
    }

    if (n < 10000000) {
      return (
        inWords(Math.floor(n / 100000)) +
        " Lakh" +
        (n % 100000 ? " " + inWords(n % 100000) : "")
      );
    }

    return (
      inWords(Math.floor(n / 10000000)) +
      " Crore" +
      (n % 10000000 ? " " + inWords(n % 10000000) : "")
    );
  };

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);

  let result = inWords(rupees) + " Rupees";

  if (paise) {
    result += " and " + inWords(paise) + " Paise";
  }

  return result + " Only";
};

interface Bill {
  billNo: string;
  generatedAt: string;
  customerName: string;
  mobile: string;
  aadhaar: string;
  address: string;
  bookingDate: string;
  timingFrom: string;
  timingTo: string;
  responsibility: string;
  terms: string;
  termsAccepted: boolean;
  total: number;
  advance: number;
  balance: number;
}

function Index() {
  const [customerName, setCustomerName] = useState("");
  const [mobile, setMobile] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [address, setAddress] = useState("");
  const [bookingDate, setBookingDate] = useState(todayISO());
  const [timingFrom, setTimingFrom] = useState("");
  const [timingTo, setTimingTo] = useState("");
  const [total, setTotal] = useState("");
  const [advance, setAdvance] = useState("");
  const [responsibility, setResponsibility] = useState("");
  const [terms, setTerms] = useState(DEFAULT_TERMS);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [preview, setPreview] = useState("YV-----");
  const [bill, setBill] = useState<Bill | null>(null);
  const [error, setError] = useState("");

  const totalNum = parseFloat(total) || 0;
  const advanceNum = parseFloat(advance) || 0;

  const balance = useMemo(
    () => Math.max(totalNum - advanceNum, 0),
    [totalNum, advanceNum]
  );

  // ---------------------------------------------------------
  // PDF GENERATION
  // ---------------------------------------------------------
  const generatePDF = async () => {
    if (!bill) {
      alert("Please generate the bill first.");
      return;
    }

    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;

      const navy: [number, number, number] = [18, 60, 102];
      const gold: [number, number, number] = [244, 197, 66];
      const lightGray: [number, number, number] = [245, 247, 250];
      const border: [number, number, number] = [220, 220, 220];
      const dark: [number, number, number] = [30, 30, 30];
      const gray: [number, number, number] = [105, 105, 105];
      const white: [number, number, number] = [255, 255, 255];

      let y = 15;

      const formatPDFAmount = (amount: number) =>
        `Rs. ${Number(amount || 0).toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;

      const ensureSpace = (height: number) => {
        if (y + height > pageHeight - 18) {
          pdf.addPage();
          y = 18;
        }
      };

      const drawSectionTitle = (title: string) => {
        ensureSpace(13);

        pdf.setTextColor(...navy);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.text(title.toUpperCase(), margin, y);

        y += 5;

        pdf.setDrawColor(...gold);
        pdf.setLineWidth(0.7);
        pdf.line(margin, y, margin + contentWidth, y);

        y += 5;
      };

      const drawWrappedText = (
        text: string,
        x: number,
        maxWidth: number,
        fontSize = 9,
        color: [number, number, number] = dark
      ) => {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(fontSize);
        pdf.setTextColor(...color);

        const lines = pdf.splitTextToSize(text || "—", maxWidth);
        const lineHeight = fontSize * 0.45 + 1.5;

        lines.forEach((line: string) => {
          ensureSpace(lineHeight);
          pdf.text(line, x, y);
          y += lineHeight;
        });
      };

      const drawLabelValue = (
        label: string,
        value: string,
        x: number,
        width: number
      ) => {
        ensureSpace(11);

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7);
        pdf.setTextColor(...gray);
        pdf.text(label.toUpperCase(), x, y);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(...dark);

        const lines = pdf.splitTextToSize(value || "—", width);
        pdf.text(lines, x, y + 5);

        y += Math.max(11, lines.length * 4.5 + 6);
      };

      // HEADER
      pdf.setFillColor(...navy);
      pdf.rect(0, 0, pageWidth, 42, "F");

      pdf.setFillColor(...white);
      pdf.roundedRect(margin, 9, 19, 19, 4, 4, "F");

      pdf.setTextColor(...navy);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.text("YV", margin + 9.5, 21, { align: "center" });

      pdf.setTextColor(...white);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(20);
      pdf.text("YAAD VIBRATOR", margin + 25, 16);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(220, 235, 250);
      pdf.text(
        "Thalakudi, Mangalpur, Jajpur, Odisha - 755011",
        margin + 25,
        23
      );

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.setTextColor(...gold);
      pdf.text("REGN NO: 676/2023", margin + 25, 30);

      pdf.setFillColor(...gold);
      pdf.roundedRect(pageWidth - margin - 43, 9, 43, 8, 4, 4, "F");

      pdf.setTextColor(...dark);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.text("BOOKING RECEIPT", pageWidth - margin - 21.5, 14.5, {
        align: "center",
      });

      pdf.setTextColor(...white);
      pdf.setFont("courier", "bold");
      pdf.setFontSize(9);
      pdf.text(bill.billNo, pageWidth - margin, 24, { align: "right" });

      pdf.setFont("courier", "normal");
      pdf.setFontSize(7);
      pdf.text(bill.generatedAt, pageWidth - margin, 31, {
        align: "right",
      });

      y = 51;

      // BOOKING INFORMATION
      pdf.setFillColor(...lightGray);
      pdf.roundedRect(margin, y, contentWidth, 20, 2, 2, "F");

      const metaWidth = contentWidth / 3;

      const drawMeta = (label: string, value: string, x: number) => {
        pdf.setTextColor(...gray);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7);
        pdf.text(label.toUpperCase(), x, y + 7);

        pdf.setTextColor(...dark);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        pdf.text(value, x, y + 14);
      };

      drawMeta("Bill No.", bill.billNo, margin + 4);
      drawMeta("Booking Date", formatDate(bill.bookingDate), margin + metaWidth);
      drawMeta("Issued", bill.generatedAt, margin + metaWidth * 2);

      y += 29;

      // CUSTOMER INFORMATION
      drawSectionTitle("Customer Information");

      drawLabelValue("Customer Name", bill.customerName, margin, contentWidth);
      drawLabelValue("Mobile Number", bill.mobile || "Not provided", margin, contentWidth);
      drawLabelValue("Aadhaar Number", maskAadhaar(bill.aadhaar), margin, contentWidth);
      drawLabelValue("Customer Address", bill.address || "Not provided", margin, contentWidth);

      // BOOKING SCHEDULE
      drawSectionTitle("Booking Schedule");

      const halfWidth = contentWidth / 2 - 3;

      drawLabelValue(
        "Program Date",
        formatDate(bill.bookingDate),
        margin,
        halfWidth
      );

      drawLabelValue(
        "Timing",
        `${formatTime(bill.timingFrom)} to ${formatTime(bill.timingTo)}`,
        margin,
        halfWidth
      );

      // PAYMENT SUMMARY
      drawSectionTitle("Payment Summary");

      const rowHeight = 11;

      const drawPaymentRow = (
        label: string,
        amount: string,
        isTotal = false
      ) => {
        ensureSpace(rowHeight);

        if (isTotal) {
          pdf.setFillColor(...navy);
          pdf.rect(margin, y, contentWidth, rowHeight, "F");
          pdf.setTextColor(...white);
        } else {
          pdf.setFillColor(...lightGray);
          pdf.rect(margin, y, contentWidth, rowHeight, "F");
          pdf.setTextColor(...dark);
          pdf.setDrawColor(...border);
          pdf.rect(margin, y, contentWidth, rowHeight);
        }

        pdf.setFont("helvetica", isTotal ? "bold" : "normal");
        pdf.setFontSize(isTotal ? 9 : 8);

        pdf.text(label, margin + 4, y + 7);
        pdf.text(amount, pageWidth - margin - 4, y + 7, {
          align: "right",
        });

        y += rowHeight;
      };

      drawPaymentRow("Booking Charges (Total)", formatPDFAmount(bill.total));
      drawPaymentRow("Less: Advance Paid", `- ${formatPDFAmount(bill.advance)}`);
      drawPaymentRow("BALANCE DUE", formatPDFAmount(bill.balance), true);

      y += 5;

      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(8);
      pdf.setTextColor(...gray);
      pdf.text("Amount in words:", margin, y);

      y += 5;
      drawWrappedText(numberToWords(bill.balance), margin, contentWidth, 8);

      // CUSTOMER RESPONSIBILITY
      if (bill.responsibility.trim()) {
        y += 3;
        drawSectionTitle("Customer Responsibility");
        drawWrappedText(bill.responsibility, margin, contentWidth, 8);
      }

      // TERMS AND CONDITIONS
      if (bill.terms.trim()) {
        y += 3;
        drawSectionTitle("Terms and Conditions");
        drawWrappedText(bill.terms, margin, contentWidth, 8);
      }

      ensureSpace(17);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.setTextColor(...navy);
      pdf.text(
        `Terms accepted by customer: ${bill.termsAccepted ? "YES" : "NO"}`,
        margin,
        y + 3
      );

      y += 12;

      // FOOTER
      ensureSpace(32);

      pdf.setDrawColor(...border);
      pdf.line(margin, y, pageWidth - margin, y);

      y += 7;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(...dark);
      pdf.text("Thank you for choosing Yaad Vibrator.", margin, y);

      y += 5;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(...gray);
      pdf.text("Please carry this receipt during the service.", margin, y);

      y += 4;
      pdf.text(
        "For booking queries, contact us with the bill number above.",
        margin,
        y
      );

      y += 4;
      pdf.text("This is a computer-generated receipt.", margin, y);

      const signatureX = pageWidth - margin - 55;

      pdf.setDrawColor(...gray);
      pdf.setLineDashPattern([2, 2], 0);
      pdf.line(signatureX, y - 2, pageWidth - margin, y - 2);
      pdf.setLineDashPattern([], 0);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.text(
        "AUTHORIZED SIGNATURE",
        pageWidth - margin - 27.5,
        y + 4,
        { align: "center" }
      );

      // BOTTOM GOLD LINE ON EVERY PAGE
      const pageCount = pdf.getNumberOfPages();

      for (let page = 1; page <= pageCount; page++) {
        pdf.setPage(page);
        pdf.setFillColor(...gold);
        pdf.rect(0, pageHeight - 5, pageWidth, 5, "F");
      }

      // SAVE / SHARE
      const fileName = `${bill.billNo || "Yaad-Vibrator-Bill"}.pdf`;

      if (Capacitor.isNativePlatform()) {
        const base64 = pdf.output("datauristring").split(",")[1];

        await Filesystem.writeFile({
          path: fileName,
          data: base64,
          directory: Directory.Cache,
        });

        const fileUri = await Filesystem.getUri({
          directory: Directory.Cache,
          path: fileName,
        });

        await Share.share({
          title: "Yaad Vibrator Bill",
          text: "Bill PDF",
          url: fileUri.uri,
          dialogTitle: "Save or Share Bill",
        });
      } else {
        pdf.save(fileName);
      }
    } catch (error) {
      console.error("PDF generation failed:", error);

      alert(
        `PDF error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  // BILL NUMBER PREVIEW
  useEffect(() => {
    const current =
      parseInt(localStorage.getItem(counterKey()) ?? "0", 10) || 0;

    setPreview(formatBillNo(current + 1));
  }, [bill]);

  // RESET FORM
  const reset = () => {
    setCustomerName("");
    setMobile("");
    setAadhaar("");
    setAddress("");
    setBookingDate(todayISO());
    setTimingFrom("");
    setTimingTo("");
    setResponsibility("");
    setTerms(DEFAULT_TERMS);
    setTermsAccepted(false);
    setTotal("");
    setAdvance("");
    setBill(null);
    setError("");
  };

  // GENERATE BILL
  const handleGenerate = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!customerName.trim()) {
      setError("Customer name is required.");
      return;
    }

    if (aadhaar && !/^\d{12}$/.test(aadhaar)) {
      setError("Aadhaar number must contain exactly 12 digits.");
      return;
    }

    if (advanceNum > totalNum) {
      setError("Advance cannot be greater than the total amount.");
      return;
    }

    if (!termsAccepted) {
      setError("Please accept the terms and conditions.");
      return;
    }

    if (!terms.trim()) {
      setError("Please enter the terms and conditions.");
      return;
    }

    setError("");

    const current =
      parseInt(localStorage.getItem(counterKey()) ?? "0", 10) || 0;

    const next = current + 1;

    localStorage.setItem(counterKey(), String(next));

    setBill({
      billNo: formatBillNo(next),
      generatedAt: new Date().toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
      customerName: customerName.trim(),
      mobile: mobile.trim(),
      aadhaar,
      address: address.trim(),
      bookingDate,
      timingFrom,
      timingTo,
      responsibility: responsibility.trim(),
      terms: terms.trim(),
      termsAccepted,
      total: totalNum,
      advance: advanceNum,
      balance,
    });

    setTimeout(() => {
      document
        .getElementById("invoice")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  // UI
  return (
    <div className="min-h-screen">
      {/* HEADER */}
      <header className="no-print sticky top-0 z-20 border-b border-border/60 bg-card/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl text-primary-foreground"
              style={{
                background: "var(--gradient-brand)",
                boxShadow: "var(--shadow-lift)",
              }}
            >
              <Truck className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-base font-bold leading-tight tracking-tight">
                Yaad Vibrator
              </h1>
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
              Thalakudi, Mangalpur, Jajpur, Odisha, Pin - 755011
            </span>

            <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider opacity-90">
              CUTTACK DCP REGN NO: 676/2023
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
            {
              label: "Status",
              value: bill ? "Ready to print" : "Awaiting booking",
              icon: CheckCircle2,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="surface-3d flex items-center gap-3 rounded-2xl p-4"
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{
                  background: "var(--gradient-gold)",
                  color: "var(--ink)",
                }}
              >
                <item.icon className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {item.label}
                </p>
                <p className="truncate font-mono text-sm font-semibold">
                  {item.value}
                </p>
              </div>
            </div>
          ))}
        </section>

        <div className="grid gap-8 lg:grid-cols-[1.05fr_1fr]">
          {/* BOOKING FORM */}
          <form onSubmit={handleGenerate} className="no-print">
            <div className="surface-3d rounded-3xl p-6 sm:p-8">
              <div className="mb-6 flex items-end justify-between">
                <div>
                  <p className="chip mb-2">New Entry</p>
                  <h2 className="text-2xl font-bold tracking-tight">
                    Booking Details
                  </h2>
                </div>
              </div>

              {/* CUSTOMER */}
              <FieldGroup
                icon={<User className="h-4 w-4" />}
                title="Customer Information"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Customer Name" required>
                    <Input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Full name"
                      required
                    />
                  </Field>

                  <Field
                    label="Mobile"
                    icon={<Phone className="h-3.5 w-3.5" />}
                  >
                    <Input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={mobile}
                      onChange={(e) =>
                        setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))
                      }
                      placeholder="10-digit mobile number"
                    />
                  </Field>

                  <Field label="Aadhaar Number (Optional)">
                    <Input
                      type="password"
                      inputMode="numeric"
                      maxLength={12}
                      value={aadhaar}
                      onChange={(e) =>
                        setAadhaar(
                          e.target.value.replace(/\D/g, "").slice(0, 12)
                        )
                      }
                      placeholder="12-digit Aadhaar number"
                    />
                  </Field>

                  <Field label="Customer Address">
                    <textarea
                      className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Enter complete customer address"
                    />
                  </Field>
                </div>
              </FieldGroup>

              <Separator className="my-6" />

              {/* SCHEDULE */}
              <FieldGroup
                icon={<CalendarDays className="h-4 w-4" />}
                title="Schedule"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Program Date">
                    <Input
                      type="date"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                    />
                  </Field>

                  <div className="hidden sm:block" />

                  <Field
                    label="Timing From"
                    icon={<Clock className="h-3.5 w-3.5" />}
                  >
                    <Input
                      type="time"
                      value={timingFrom}
                      onChange={(e) => setTimingFrom(e.target.value)}
                    />
                  </Field>

                  <Field
                    label="Timing To"
                    icon={<Clock className="h-3.5 w-3.5" />}
                  >
                    <Input
                      type="time"
                      value={timingTo}
                      onChange={(e) => setTimingTo(e.target.value)}
                    />
                  </Field>
                </div>
              </FieldGroup>

              <Separator className="my-6" />

              {/* CUSTOMER RESPONSIBILITY AND TERMS */}
              <FieldGroup
                icon={<FileText className="h-4 w-4" />}
                title="Customer Responsibility & Terms"
              >
                <div className="grid gap-4">
                  <Field label="Customer Responsibility">
                    <textarea
                      className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={responsibility}
                      onChange={(e) => setResponsibility(e.target.value)}
                      placeholder="Enter customer responsibilities..."
                    />
                  </Field>

                  <Field label="Terms and Conditions">
                    <textarea
                      className="flex min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={terms}
                      onChange={(e) => setTerms(e.target.value)}
                      placeholder="Enter terms and conditions..."
                    />
                  </Field>

                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-1"
                    />
                    <span>
                      Customer has read and accepted the terms and conditions.
                    </span>
                  </label>
                </div>
              </FieldGroup>

              <Separator className="my-6" />

              {/* PAYMENT */}
              <FieldGroup
                icon={<IndianRupee className="h-4 w-4" />}
                title="Payment"
              >
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Total (₹)">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={total}
                      onChange={(e) => setTotal(e.target.value)}
                      placeholder="0.00"
                    />
                  </Field>

                  <Field label="Advance (₹)">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={advance}
                      onChange={(e) => setAdvance(e.target.value)}
                      placeholder="0.00"
                    />
                  </Field>

                  <Field label="Balance (₹)">
                    <div
                      className="flex h-9 items-center rounded-md border px-3 font-mono text-sm font-semibold"
                      style={{
                        background: "var(--gradient-warm)",
                        color: "var(--brand-deep)",
                      }}
                    >
                      {formatINR(balance)}
                    </div>
                  </Field>
                </div>
              </FieldGroup>

              {/* ERROR */}
              {error && (
                <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}

              {/* ACTIONS */}
              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  type="submit"
                  size="lg"
                  className="gap-2 rounded-xl border-0 text-primary-foreground"
                  style={{
                    background: "var(--gradient-brand)",
                    boxShadow: "var(--shadow-press)",
                  }}
                >
                  <Receipt className="h-4 w-4" />
                  Generate Bill
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={reset}
                  className="gap-2 rounded-xl"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
              </div>
            </div>
          </form>

          {/* LIVE PREVIEW */}
          <aside className="no-print">
            <div
              className="surface-3d sticky top-24 rounded-3xl p-6"
              style={{ background: "var(--gradient-warm)" }}
            >
              <p className="chip mb-3">Live Preview</p>

              <h3 className="mb-1 text-lg font-bold">Quick Summary</h3>

              <p className="mb-5 text-sm text-muted-foreground">
                Updates as you fill the form. Click Generate Bill to lock the
                receipt.
              </p>

              <dl className="space-y-3 text-sm">
                <Row k="Customer" v={customerName || "—"} />
                <Row k="Mobile" v={mobile || "—"} />
                <Row k="Booking Date" v={formatDate(bookingDate)} />
                <Row
                  k="Timing"
                  v={
                    timingFrom || timingTo
                      ? `${formatTime(timingFrom)} – ${formatTime(timingTo)}`
                      : "—"
                  }
                />

                <Separator />

                <Row k="Total" v={formatINR(totalNum)} />
                <Row k="Advance" v={formatINR(advanceNum)} />

                <div
                  className="mt-2 flex items-center justify-between rounded-xl px-4 py-3 text-primary-foreground"
                  style={{
                    background: "var(--gradient-brand)",
                    boxShadow: "var(--shadow-lift)",
                  }}
                >
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] opacity-80">
                    Balance Due
                  </span>
                  <span className="font-mono text-lg font-bold">
                    {formatINR(balance)}
                  </span>
                </div>
              </dl>
            </div>
          </aside>
        </div>

        {/* GENERATED INVOICE */}
        {bill && (
          <section id="invoice" className="mt-12">
            <div className="no-print mb-4 flex items-center justify-between">
              <div>
                <p className="chip mb-1">Generated</p>
                <h2 className="text-2xl font-bold tracking-tight">
                  Booking Receipt
                </h2>
              </div>

              <Button
                size="lg"
                onClick={generatePDF}
                className="gap-2 rounded-xl border-0 text-primary-foreground"
                style={{
                  background: "var(--gradient-brand)",
                  boxShadow: "var(--shadow-press)",
                }}
              >
                <Printer className="h-4 w-4" />
                Print / Save PDF
              </Button>
            </div>

            <Invoice bill={bill} />
          </section>
        )}

        <footer className="no-print mt-16 pb-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Yaad Vibrator · Thalakudi, Mangalpur,
          Jajpur, Odisha
        </footer>
      </main>
    </div>
  );
}

/* ---------------------------------------------------------
   SMALL UI HELPERS
--------------------------------------------------------- */

function Field({
  label,
  required,
  icon,
  children,
}: {
  label: string;
  required?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}) {
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

function FieldGroup({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{
            background: "var(--gradient-gold)",
            color: "var(--ink)",
          }}
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
      <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
        {k}
      </dt>

      <dd className="truncate text-right font-medium">{v}</dd>
    </div>
  );
}

/* ---------------------------------------------------------
   INVOICE COMPONENT
--------------------------------------------------------- */

function Invoice({ bill }: { bill: Bill }) {
  return (
    <article
      className="invoice-sheet mx-auto max-w-3xl overflow-hidden rounded-3xl border bg-card text-[color:var(--ink)]"
      style={{ boxShadow: "var(--shadow-3d)" }}
    >
      {/* HEADER */}
      <div
        className="relative px-6 py-8 text-primary-foreground sm:px-10"
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

        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30 backdrop-blur">
              <Truck className="h-7 w-7" />
            </div>

            <div>
              <h1 className="text-2xl font-black tracking-[0.02em] sm:text-3xl">
                YAAD VIBRATOR
              </h1>
              <p className="mt-1 text-xs opacity-80">
                Thalakudi, Mangalpur, Jajpur, Odisha
              </p>
              <p className="mt-1 text-[10px] opacity-80">
                REGN NO: 676/2023
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span
              className="inline-block rounded-full px-4 py-1 text-[10px] font-bold uppercase tracking-[0.3em]"
              style={{
                background: "var(--gradient-gold)",
                color: "var(--ink)",
              }}
            >
              Booking Receipt
            </span>

            <p className="mt-3 font-mono text-sm opacity-95">{bill.billNo}</p>
            <p className="font-mono text-[11px] opacity-75">
              {bill.generatedAt}
            </p>
          </div>
        </div>
      </div>

      {/* META STRIP */}
      <div className="grid grid-cols-2 gap-4 border-b bg-muted/40 px-6 py-5 text-sm sm:grid-cols-3 sm:px-10">
        <Meta k="Bill No." v={bill.billNo} mono />
        <Meta k="Booking Date" v={formatDate(bill.bookingDate)} />
        <Meta k="Issued On" v={bill.generatedAt} />
      </div>

      {/* CUSTOMER AND BOOKING DETAILS */}
      <div className="grid gap-8 px-6 py-8 sm:grid-cols-2 sm:px-10">
        <Block title="Customer Information">
          <p className="text-lg font-bold leading-tight">
            {bill.customerName}
          </p>

          {bill.mobile && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              {bill.mobile}
            </p>
          )}

          <p className="mt-2 text-sm text-muted-foreground">
            Aadhaar: {maskAadhaar(bill.aadhaar)}
          </p>

          {bill.address && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
              Address: {bill.address}
            </p>
          )}
        </Block>

        <Block title="Booking Schedule">
          <p className="text-sm font-semibold">
            Date: {formatDate(bill.bookingDate)}
          </p>

          <p className="mt-2 text-sm text-muted-foreground">
            From: {formatTime(bill.timingFrom)}
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            To: {formatTime(bill.timingTo)}
          </p>
        </Block>
      </div>

      {/* PAYMENT TABLE */}
      <div className="px-6 pb-2 sm:px-10">
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
                <td className="px-4 py-3 text-right font-mono font-semibold">
                  {formatINR(bill.total)}
                </td>
              </tr>

              <tr className="border-t">
                <td className="px-4 py-3 text-muted-foreground">
                  Less: Advance Paid
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  − {formatINR(bill.advance)}
                </td>
              </tr>

              <tr
                className="border-t text-primary-foreground"
                style={{ background: "var(--gradient-brand)" }}
              >
                <td className="px-4 py-3.5 text-sm font-bold uppercase tracking-wider">
                  Balance Due
                </td>

                <td className="px-4 py-3.5 text-right font-mono text-base font-bold">
                  {formatINR(bill.balance)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs italic text-muted-foreground">
          <span className="font-semibold not-italic text-foreground">
            In words:{" "}
          </span>
          {numberToWords(bill.balance)}
        </p>
      </div>

      {/* CUSTOMER RESPONSIBILITY */}
      {bill.responsibility && (
        <div className="px-6 pt-6 sm:px-10">
          <Block title="Customer Responsibility">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {bill.responsibility}
            </p>
          </Block>
        </div>
      )}

      {/* TERMS AND CONDITIONS */}
      <div className="px-6 pt-6 sm:px-10">
        <Block title="Terms and Conditions">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {bill.terms}
          </p>

          <p className="mt-3 text-xs font-semibold text-foreground">
            Customer Acceptance:{" "}
            {bill.termsAccepted ? "Accepted" : "Not accepted"}
          </p>
        </Block>
      </div>

      {/* FOOTER */}
      <div className="mt-6 grid grid-cols-1 gap-6 border-t bg-muted/30 px-6 py-7 sm:grid-cols-2 sm:px-10">
        <div className="text-xs text-muted-foreground">
          <p className="text-sm font-semibold text-foreground">
            Thank you for choosing Yaad Vibrator.
          </p>

          <p className="mt-1">
            Please carry this receipt during the service.
          </p>

          <p className="mt-3 leading-relaxed">
            For queries regarding this booking, contact us with the bill number
            above. This is a computer-generated receipt.
          </p>
        </div>

        <div className="flex flex-col items-end justify-end">
          <div className="h-14 w-56 border-b-2 border-dashed border-foreground/60" />

          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Authorized Signature
          </p>
        </div>
      </div>

      {/* BOTTOM RULE */}
      <div className="h-1.5" style={{ background: "var(--gradient-gold)" }} />
    </article>
  );
}

/* ---------------------------------------------------------
   INVOICE HELPERS
--------------------------------------------------------- */

function Meta({
  k,
  v,
  mono,
}: {
  k: string;
  v: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {k}
      </p>

      <p className={`mt-0.5 text-sm font-semibold ${mono ? "font-mono" : ""}`}>
        {v}
      </p>
    </div>
  );
}

function Block({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </p>

      {children}
    </div>
  );
}
