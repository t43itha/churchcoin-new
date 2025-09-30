"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { HandHeart, Upload, Users } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, type Doc, type Id } from "@/lib/convexGenerated";

type DonorFormState = {
  name: string;
  email: string;
  phone: string;
  address: string;
  bankReference: string;
  notes: string;
  giftAidSigned: boolean;
  giftAidDate: string;
};

const initialForm: DonorFormState = {
  name: "",
  email: "",
  phone: "",
  address: "",
  bankReference: "",
  notes: "",
  giftAidSigned: false,
  giftAidDate: "",
};

export default function DonorDirectoryPage() {
  const churches = useQuery(api.churches.listChurches, {});
  const [churchId, setChurchId] = useState<Id<"churches"> | null>(null);
  const donors = useQuery(api.donors.getDonors, churchId ? { churchId } : "skip");
  const [selectedDonor, setSelectedDonor] = useState<Doc<"donors"> | null>(null);
  const [form, setForm] = useState<DonorFormState>(initialForm);
  const [status, setStatus] = useState<string | null>(null);

  const createDonor = useMutation(api.donors.createDonor);
  const updateDonor = useMutation(api.donors.updateDonor);
  const archiveDonor = useMutation(api.donors.archiveDonor);
  const giftHistory = useQuery(
    api.donors.getDonorGivingHistory,
    selectedDonor ? { donorId: selectedDonor._id } : "skip"
  );
  const givingByFund = useQuery(
    api.donors.getDonorGivingByFund,
    selectedDonor ? { donorId: selectedDonor._id } : "skip"
  );

  useEffect(() => {
    if (!churchId && churches && churches.length > 0) {
      setChurchId(churches[0]._id);
    }
  }, [churches, churchId]);

  useEffect(() => {
    if (selectedDonor) {
      setForm({
        name: selectedDonor.name,
        email: selectedDonor.email ?? "",
        phone: selectedDonor.phone ?? "",
        address: selectedDonor.address ?? "",
        bankReference: selectedDonor.bankReference ?? "",
        notes: selectedDonor.notes ?? "",
        giftAidSigned: Boolean(selectedDonor.giftAidDeclaration?.signed),
        giftAidDate: selectedDonor.giftAidDeclaration?.date ?? "",
      });
    } else {
      setForm(initialForm);
    }
  }, [selectedDonor]);

  const handleSubmit = async () => {
    if (!churchId) {
      return;
    }

    if (selectedDonor) {
      await updateDonor({
        donorId: selectedDonor._id,
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        address: form.address || undefined,
        bankReference: form.bankReference || undefined,
        notes: form.notes || undefined,
        giftAidDeclaration: form.giftAidSigned
          ? {
              signed: true,
              date: form.giftAidDate || new Date().toISOString().slice(0, 10),
            }
          : undefined,
      });
      setStatus("Donor updated.");
    } else {
      await createDonor({
        churchId,
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        address: form.address || undefined,
        bankReference: form.bankReference || undefined,
        notes: form.notes || undefined,
        giftAidDeclaration: form.giftAidSigned
          ? {
              signed: true,
              date: form.giftAidDate || new Date().toISOString().slice(0, 10),
            }
          : undefined,
      });
      setStatus("New donor created.");
      setForm(initialForm);
    }
  };

  const donorTotals = useMemo(() => {
    if (!giftHistory) {
      return {
        totalGiving: 0,
        transactionCount: 0,
        giftAidEligible: 0,
      };
    }

    return giftHistory.totals;
  }, [giftHistory]);

  return (
    
      <div className="min-h-screen bg-paper pb-12">
      <div className="border-b border-ledger bg-paper">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-grey-mid">
                <Users className="h-5 w-5 text-grey-mid" />
                <span className="text-sm uppercase tracking-wide">Donor Management</span>
              </div>
              <h1 className="text-3xl font-semibold text-ink">Donor directory</h1>
              <p className="text-sm text-grey-mid">
                Manage Gift Aid declarations, track giving history, and prepare individual statements.
              </p>
            </div>
            <div className="flex flex-col gap-2 md:items-end">
              <span className="text-xs uppercase tracking-wide text-grey-mid">Active church</span>
              <Select
                value={churchId ?? undefined}
                onValueChange={(value) => setChurchId(value as Id<"churches">)}
              >
                <SelectTrigger className="w-[240px] font-primary">
                  <SelectValue placeholder="Select church" />
                </SelectTrigger>
                <SelectContent className="font-primary">
                  {churches?.map((church) => (
                    <SelectItem key={church._id} value={church._id}>
                      {church.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 text-xs text-grey-mid">
              <Badge variant="secondary" className="border-ledger bg-highlight text-ink">
                <HandHeart className="mr-1 h-3 w-3" /> Anonymous giving supported
              </Badge>
              <Badge variant="secondary" className="border-ledger bg-highlight text-ink">
                {donorTotals.transactionCount} gifts tracked · £{donorTotals.totalGiving.toFixed(2)} total
              </Badge>
            </div>
            <Link href="/donors/import">
              <Button variant="outline" className="border-ledger font-primary">
                <Upload className="mr-2 h-4 w-4" />
                Bulk import
              </Button>
            </Link>
          </div>
        </div>
      </div>
      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-10 lg:grid-cols-[1.4fr,1fr]">
        <Card className="border-ledger bg-paper shadow-none">
          <CardHeader>
            <CardTitle className="text-ink">{selectedDonor ? "Update donor" : "Add donor"}</CardTitle>
            <CardDescription className="text-grey-mid">
              Capture contact information and Gift Aid declarations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {status ? <p className="text-sm text-grey-mid">{status}</p> : null}
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm text-ink">
                Name
                <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              </label>
              <label className="flex flex-col gap-1 text-sm text-ink">
                Email
                <Input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
              </label>
              <label className="flex flex-col gap-1 text-sm text-ink">
                Phone
                <Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
              </label>
              <label className="flex flex-col gap-1 text-sm text-ink">
                Bank reference
                <Input
                  value={form.bankReference}
                  onChange={(event) => setForm({ ...form, bankReference: event.target.value })}
                />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-sm text-ink">
              Address
              <Textarea
                rows={2}
                value={form.address}
                onChange={(event) => setForm({ ...form, address: event.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-ink">
              Notes
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
              />
            </label>
            <div className="flex items-center justify-between rounded-md border border-ledger bg-highlight/30 px-3 py-2">
              <div className="space-y-1">
                <p className="text-sm font-medium text-ink">Gift Aid declaration</p>
                <p className="text-xs text-grey-mid">Track signed declarations to include donations in HMRC claims.</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.giftAidSigned}
                  onChange={(event) => setForm({ ...form, giftAidSigned: event.target.checked })}
                  className="h-4 w-4"
                />
                <Input
                  type="date"
                  value={form.giftAidDate}
                  onChange={(event) => setForm({ ...form, giftAidDate: event.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-between gap-3">
              {selectedDonor ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-error"
                  onClick={() => {
                    archiveDonor({ donorId: selectedDonor._id });
                    setSelectedDonor(null);
                    setStatus("Donor archived.");
                  }}
                >
                  Archive donor
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setForm(initialForm);
                    setSelectedDonor(null);
                    setStatus(null);
                  }}
                >
                  Reset form
                </Button>
              )}
              <Button className="border-ledger bg-ink text-paper" onClick={handleSubmit}>
                {selectedDonor ? "Save changes" : "Create donor"}
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card className="border-ledger bg-paper shadow-none">
          <CardHeader>
            <CardTitle className="text-ink">Directory</CardTitle>
            <CardDescription className="text-grey-mid">
              Select a donor to review giving history and produce statements.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-grey-mid">
            {donors && donors.length > 0 ? (
              donors.map((donor) => (
                <button
                  key={donor._id}
                  type="button"
                  className={`flex w-full flex-col rounded-md border border-ledger px-3 py-2 text-left transition hover:border-ink ${
                    selectedDonor?._id === donor._id ? "bg-highlight/60" : "bg-paper"
                  }`}
                  onClick={() => setSelectedDonor(donor)}
                >
                  <span className="font-medium text-ink">{donor.name}</span>
                  <span className="text-xs text-grey-mid">
                    {donor.email ?? "No email"} · {donor.bankReference ?? "No bank ref"}
                  </span>
                </button>
              ))
            ) : (
              <p>No donors yet. Add your first supporter on the left.</p>
            )}
            {selectedDonor && giftHistory ? (
              <div className="rounded-md border border-ledger bg-highlight/20 p-3 text-sm text-grey-mid">
                <p className="font-medium text-ink">Giving overview</p>
                <p>
                  {giftHistory.transactions.length} gifts · £{giftHistory.totals.totalGiving.toFixed(2)} total · Gift Aid eligible
                  £{giftHistory.totals.giftAidEligible.toFixed(2)}
                </p>
                {givingByFund ? (
                  <ul className="mt-2 space-y-1 text-xs">
                    {givingByFund.map((fund) => (
                      <li key={fund.fundName}>
                        {fund.fundName}: £{fund.amount.toFixed(2)} across {fund.count} gifts
                      </li>
                    ))}
                  </ul>
                ) : null}
                <Button
                  variant="outline"
                  className="mt-3 w-full border-ledger font-primary"
                  onClick={() => setStatus("Statement generation coming in iteration 8.")}
                >
                  Generate statement
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
      </div>
    
  );
}
