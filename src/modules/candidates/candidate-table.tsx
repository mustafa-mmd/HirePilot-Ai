"use client";
/* eslint-disable react-hooks/incompatible-library -- TanStack Table manages its own memoization contract. */

import { flexRender, getCoreRowModel, getFilteredRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { Search } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type CandidateRow = { id: string; fullName: string; email: string; location: string; createdAt: string; applicationCount: number; latestStage: string };

const columns: ColumnDef<CandidateRow>[] = [
  { accessorKey: "fullName", header: "Candidate", cell: ({ row }) => <div><p className="font-medium">{row.original.fullName}</p><p className="text-xs text-muted-foreground">{row.original.email}</p></div> },
  { accessorKey: "location", header: "Location" },
  { accessorKey: "applicationCount", header: "Applications" },
  { accessorKey: "latestStage", header: "Latest stage", cell: ({ getValue }) => <Badge variant="secondary" className="capitalize">{String(getValue()).replaceAll("_", " ")}</Badge> },
  { accessorKey: "createdAt", header: "Added", cell: ({ getValue }) => <span className="font-mono text-xs text-muted-foreground">{new Date(String(getValue())).toLocaleDateString("en-GB", { year: "numeric", month: "2-digit", day: "2-digit" })}</span> },
];

export function CandidateTable({ data }: { data: CandidateRow[] }) {
  const [filter, setFilter] = useState("");
  const table = useReactTable({ data, columns, state: { globalFilter: filter }, onGlobalFilterChange: setFilter, getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel() });
  return <div className="space-y-4"><div className="relative max-w-sm"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input className="pl-9" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Search candidates" aria-label="Search candidates" /></div><div className="overflow-hidden rounded-lg border"><Table><TableHeader>{table.getHeaderGroups().map((group) => <TableRow key={group.id}>{group.headers.map((header) => <TableHead key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</TableHead>)}</TableRow>)}</TableHeader><TableBody>{table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => <TableRow key={row.id}>{row.getVisibleCells().map((cell) => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>) : <TableRow><TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">No candidates match this search.</TableCell></TableRow>}</TableBody></Table></div></div>;
}