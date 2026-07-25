"use client";
/* eslint-disable react-hooks/refs -- dnd-kit intentionally exposes callback refs and reactive transforms. */

import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { FileSearch, GripVertical, MapPin } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  APPLICATION_STAGES,
  type ApplicationStage,
} from "@/modules/applications/constants";
import { STAGE_LABELS } from "@/modules/applications/stages";

type PipelineApplication = {
  id: string;
  stage: ApplicationStage;
  appliedAt: string;
  candidate: { id: string; fullName: string; email: string; location?: string };
};

function CandidateCard({ application }: { application: PipelineApplication }) {
  const draggable = useDraggable({
    id: application.id,
    data: { applicationId: application.id, from: application.stage },
  });
  return (
    <article
      ref={draggable.setNodeRef}
      style={{ transform: CSS.Translate.toString(draggable.transform) }}
      {...draggable.attributes}
      className="rounded-lg border bg-card p-3 shadow-sm"
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-0.5 cursor-grab text-muted-foreground active:cursor-grabbing"
          {...draggable.listeners}
          aria-label={`Move ${application.candidate.fullName}`}
        >
          <GripVertical className="size-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {application.candidate.fullName}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {application.candidate.email}
          </p>
          {application.candidate.location ? (
            <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3" />
              {application.candidate.location}
            </p>
          ) : null}
          <Link
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            href={`/dashboard/applications/${application.id}`}
          >
            <FileSearch className="size-3" />
            View report
          </Link>
        </div>
      </div>
    </article>
  );
}

function PipelineColumn({
  stage,
  applications,
}: {
  stage: ApplicationStage;
  applications: PipelineApplication[];
}) {
  const droppable = useDroppable({ id: `stage:${stage}` });
  return (
    <section ref={droppable.setNodeRef} className="w-72 shrink-0">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium">{STAGE_LABELS[stage]}</h2>
        <Badge variant="secondary">{applications.length}</Badge>
      </div>
      <div
        className={`min-h-40 space-y-2 rounded-xl border border-dashed p-2 transition-colors ${droppable.isOver ? "border-primary bg-primary/5" : "bg-muted/20"}`}
      >
        {applications.map((application) => (
          <CandidateCard key={application.id} application={application} />
        ))}
      </div>
    </section>
  );
}

export function PipelineBoard({
  initialApplications,
}: {
  initialApplications: PipelineApplication[];
}) {
  const [applications, setApplications] = useState(initialApplications);
  const [error, setError] = useState<string>();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );
  async function onDragEnd(event: DragEndEvent) {
    const overId = String(event.over?.id ?? "");
    if (!overId.startsWith("stage:")) return;
    const nextStage = overId.slice(6) as ApplicationStage;
    const applicationId = String(event.active.id);
    const previous = applications;
    const current = applications.find((item) => item.id === applicationId);
    if (!current || current.stage === nextStage) return;
    setError(undefined);
    setApplications((items) =>
      items.map((item) =>
        item.id === applicationId ? { ...item, stage: nextStage } : item,
      ),
    );
    const response = await fetch(`/api/applications/${applicationId}/stage`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stage: nextStage }),
    });
    if (!response.ok) {
      const result = await response.json();
      setApplications(previous);
      setError(result.error?.message ?? "The stage change was rejected.");
    }
  }
  return (
    <div className="space-y-4">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <DndContext
        id="job-applications-pipeline"
        sensors={sensors}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-5">
          {APPLICATION_STAGES.map((stage) => (
            <PipelineColumn
              key={stage}
              stage={stage}
              applications={applications.filter(
                (application) => application.stage === stage,
              )}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}
