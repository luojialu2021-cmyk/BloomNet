import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  LayoutList,
  PlusCircle,
  Sparkles,
  Trash2,
} from "lucide-react";
import { reservationService } from "../api/services";
import type {
  CareTaskAssignment,
  CareTaskTemplate,
  Reservation,
} from "../api/types";
import {
  getLocalReservationRecord,
  isLocalReservationId,
  saveLocalReservation,
} from "../utils/localReservations";

type Frequency = CareTaskTemplate["frequency"];

const WEEKDAY_OPTIONS = [
  { label: "Sun", value: 0 },
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
];

const formatDate = (iso?: string | null) => {
  if (!iso) return "—";
  const date = new Date(iso.includes("T") ? iso : `${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatWeekday = (iso?: string | null) => {
  if (!iso) return "—";
  const date = new Date(iso.includes("T") ? iso : `${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { weekday: "long" });
};

const toISODate = (date: Date) => date.toISOString().slice(0, 10);

const buildDateSeries = (
  start: string,
  end: string,
  frequency: Frequency,
  params: {
    every_x_days?: number;
    weekly_days?: number[];
    custom_dates?: string[];
  }
) => {
  const startDate = new Date(start.includes("T") ? start : `${start}T00:00:00`);
  const endDate = new Date(end.includes("T") ? end : `${end}T00:00:00`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return [];
  }

  const results: string[] = [];

  switch (frequency) {
    case "daily": {
      for (
        let cursor = new Date(startDate);
        cursor <= endDate;
        cursor.setDate(cursor.getDate() + 1)
      ) {
        results.push(toISODate(cursor));
      }
      break;
    }
    case "every_x_days": {
      const step = Math.max(1, params.every_x_days ?? 1);
      for (
        let cursor = new Date(startDate);
        cursor <= endDate;
        cursor.setDate(cursor.getDate() + step)
      ) {
        results.push(toISODate(cursor));
      }
      break;
    }
    case "weekly": {
      const allowedDays =
        params.weekly_days && params.weekly_days.length
          ? params.weekly_days
          : [startDate.getDay()];

      for (
        let cursor = new Date(startDate);
        cursor <= endDate;
        cursor.setDate(cursor.getDate() + 1)
      ) {
        if (allowedDays.includes(cursor.getDay())) {
          results.push(toISODate(cursor));
        }
      }
      break;
    }
    case "custom": {
      const dates = params.custom_dates ?? [];
      results.push(
        ...dates
          .map((value) =>
            value.includes("T") ? value.slice(0, 10) : value.slice(0, 10)
          )
          .filter(Boolean)
      );
      break;
    }
    default:
      break;
  }

  return Array.from(new Set(results)).sort();
};

const generateAssignments = (
  templates: CareTaskTemplate[]
): CareTaskAssignment[] => {
  const assignments: CareTaskAssignment[] = [];

  templates.forEach((template) => {
    const dates = buildDateSeries(
      template.start_date,
      template.end_date,
      template.frequency,
      {
        every_x_days: template.every_x_days,
        weekly_days: template.weekly_days,
        custom_dates: template.custom_dates,
      }
    );

    dates.forEach((date) => {
      assignments.push({
        id: `${template.id}:${date}`,
        template_id: template.id,
        task_name: template.name,
        date,
      });
    });
  });

  return assignments.sort((a, b) => a.date.localeCompare(b.date));
};

const defaultTemplate = (start: string, end: string): CareTaskTemplate => ({
  id: `template-${Date.now()}`,
  name: "",
  description: "",
  frequency: "daily",
  start_date: start,
  end_date: end,
  every_x_days: 2,
  weekly_days: [1, 3, 5],
  custom_dates: [],
  requires_photo: true,
  requires_notes: true,
  requires_audio: false,
  notes: "",
});

export default function ReservationTaskPlannerPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [templates, setTemplates] = useState<CareTaskTemplate[]>([]);
  const [draft, setDraft] = useState<CareTaskTemplate | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customDateInput, setCustomDateInput] = useState("");

  const assignments = useMemo(
    () => generateAssignments(templates),
    [templates]
  );

  const templateLookup = useMemo(() => {
    const lookup = new Map<string, CareTaskTemplate>();
    templates.forEach((template) => {
      lookup.set(template.id, template);
    });
    return lookup;
  }, [templates]);

  const dailySchedule = useMemo(() => {
    const byDate = new Map<string, CareTaskAssignment[]>();

    if (reservation?.start_date && reservation?.end_date) {
      const startDate = new Date(
        reservation.start_date.includes("T")
          ? reservation.start_date
          : `${reservation.start_date}T00:00:00`
      );
      const endDate = new Date(
        reservation.end_date.includes("T")
          ? reservation.end_date
          : `${reservation.end_date}T00:00:00`
      );

      if (
        !Number.isNaN(startDate.getTime()) &&
        !Number.isNaN(endDate.getTime())
      ) {
        for (
          let cursor = new Date(startDate);
          cursor <= endDate;
          cursor.setDate(cursor.getDate() + 1)
        ) {
          byDate.set(toISODate(cursor), []);
        }
      }
    }

    assignments.forEach((assignment) => {
      if (!byDate.has(assignment.date)) {
        byDate.set(assignment.date, []);
      }
      byDate.get(assignment.date)?.push(assignment);
    });

    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, tasks]) => ({
        date,
        tasks: [...tasks],
      }));
  }, [assignments, reservation?.start_date, reservation?.end_date]);

  const activeDayCount = useMemo(
    () => dailySchedule.filter((day) => day.tasks.length > 0).length,
    [dailySchedule]
  );

  useEffect(() => {
    let cancelled = false;
    const loadReservation = async () => {
      if (!id) {
        setError("Missing reservation id.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      const response = await reservationService.getById(id);
      if (cancelled) return;

      if (response.data) {
        const fetched = response.data as Reservation;
        fetched.id = fetched.id || (fetched as any)._id || id;
        setReservation(fetched);
        setTemplates(fetched.care_task_templates ?? []);
        setDraft(
          defaultTemplate(
            fetched.start_date.slice(0, 10),
            fetched.end_date.slice(0, 10)
          )
        );
      } else {
        const snapshot = getLocalReservationRecord(id);
        if (snapshot?.reservation) {
          const localReservation = {
            ...snapshot.reservation,
            id: snapshot.reservation.id || id,
          };
          setReservation(localReservation);
          setTemplates(localReservation.care_task_templates ?? []);
          setDraft(
            defaultTemplate(
              localReservation.start_date.slice(0, 10),
              localReservation.end_date.slice(0, 10)
            )
          );
        } else {
          setError(response.error || "Reservation not found.");
        }
      }
      setLoading(false);
    };

    loadReservation();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const reservationWindow = useMemo(() => {
    if (!reservation) return "—";
    return `${formatDate(reservation.start_date)} → ${formatDate(
      reservation.end_date
    )}`;
  }, [reservation]);

  const handleDraftChange = useCallback(
    (updates: Partial<CareTaskTemplate>) => {
      setDraft((prev) => (prev ? { ...prev, ...updates } : prev));
    },
    []
  );

  const handleAddCustomDate = () => {
    if (!draft || !customDateInput) return;
    if (!draft.custom_dates?.includes(customDateInput)) {
      handleDraftChange({
        custom_dates: [...(draft.custom_dates ?? []), customDateInput],
      });
    }
    setCustomDateInput("");
  };

  const handleRemoveCustomDate = (value: string) => {
    if (!draft) return;
    handleDraftChange({
      custom_dates: (draft.custom_dates ?? []).filter((date) => date !== value),
    });
  };

  const handleToggleWeekday = (value: number) => {
    if (!draft) return;
    const current = new Set(draft.weekly_days ?? []);
    if (current.has(value)) {
      current.delete(value);
    } else {
      current.add(value);
    }
    handleDraftChange({ weekly_days: Array.from(current).sort() });
  };

  const handleAddTemplate = () => {
    if (!draft) return;
    if (!draft.name.trim()) {
      setStatusMessage("Please enter a task name before adding.");
      return;
    }
    const normalized: CareTaskTemplate = {
      ...draft,
      id: `template-${Date.now()}`,
      name: draft.name.trim(),
      description: draft.description?.trim() || "",
      notes: draft.notes?.trim() || "",
    };
    setTemplates((prev) => [...prev, normalized]);
    setDraft(defaultTemplate(normalized.start_date, normalized.end_date));
    setStatusMessage(`Template “${normalized.name}” added.`);
  };

  const handleDeleteTemplate = (templateId: string) => {
    setTemplates((prev) => prev.filter((item) => item.id !== templateId));
  };

  const persistToLocal = (updated: Reservation) => {
    if (!updated.id) return;
    if (!isLocalReservationId(updated.id)) return;

    const snapshot = getLocalReservationRecord(updated.id);
    saveLocalReservation({
      reservation: { ...updated },
      ownerSnapshot: snapshot?.ownerSnapshot,
      sitterSnapshot: snapshot?.sitterSnapshot,
    });
  };

  const handleSavePlanner = async () => {
    if (!reservation) return;
    if (!templates.length) {
      setStatusMessage("Add at least one task template before saving.");
      return;
    }
    setSaving(true);
    setStatusMessage(null);

    const nextAssignments = generateAssignments(templates);
    const checklistEntries = nextAssignments.map(
      (entry) => `${entry.date}|${entry.task_name}`
    );

    const updatedReservation: Reservation = {
      ...reservation,
      care_task_templates: templates,
      care_task_schedule: nextAssignments,
      care_checklist: checklistEntries,
    };

    setReservation(updatedReservation);
    persistToLocal(updatedReservation);

    if (isLocalReservationId(updatedReservation.id)) {
      setStatusMessage(
        "Task templates saved. Your sitter will see the new checklist."
      );
    } else {
      try {
        const response = await reservationService.updateCareChecklist(
          updatedReservation.id,
          {
            tasks: checklistEntries,
            templates,
            schedule: nextAssignments,
          }
        );
        if (response.data) {
          const syncedReservation = response.data as Reservation;
          setReservation(syncedReservation);
          setTemplates(syncedReservation.care_task_templates ?? []);
          persistToLocal(syncedReservation);
          setStatusMessage(
            "Task templates saved and synced to the sitter checklist."
          );
        } else {
          setStatusMessage(
            "Checklist updated with generated tasks. Template details are stored locally."
          );
        }
      } catch (apiError: any) {
        setStatusMessage(
          apiError?.message ??
            "Unable to sync templates to the server. Checklist updated locally."
        );
      }
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-emerald-50 flex items-center justify-center text-emerald-800">
        Loading care task planner…
      </main>
    );
  }

  if (error || !reservation || !draft) {
    return (
      <main className="min-h-screen bg-emerald-50 flex items-center justify-center px-4">
        <div className="max-w-md rounded-3xl border border-emerald-200 bg-white p-6 text-center shadow-sm text-emerald-900 space-y-4">
          <p>{error || "Reservation not found."}</p>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-emerald-50 pb-16">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        <div className="flex items-center justify-between">
          <Link
            to={`/reservations/${reservation.id}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to reservation
          </Link>
          <div className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-600">
            Reservation window {reservationWindow}
          </div>
        </div>

        <section className="rounded-3xl border border-emerald-200 bg-white p-8 shadow-sm space-y-6">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-6 w-6 text-emerald-500" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500">
                  Care task planner
                </p>
                <h1 className="text-2xl font-semibold text-emerald-900">
                  Design task templates for your sitter
                </h1>
              </div>
            </div>
            <div className="text-sm text-emerald-700">
              <div className="font-semibold text-emerald-800">
                {reservation.plants_info || "Houseplant collection"}
              </div>
              <div className="text-xs text-emerald-600">
                {reservation.location_address}
              </div>
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <div className="space-y-6 rounded-3xl border border-emerald-100 bg-emerald-50/70 p-6">
              <div className="flex items-center gap-3">
                <PlusCircle className="h-5 w-5 text-emerald-500" />
                <div>
                  <h2 className="text-lg font-semibold text-emerald-900">
                    Create task template
                  </h2>
                  <p className="text-sm text-emerald-700">
                    Combine clear instructions, checkpoints, and smart
                    scheduling.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-emerald-800">
                    Task name
                  </label>
                  <input
                    value={draft.name}
                    onChange={(event) =>
                      handleDraftChange({ name: event.target.value })
                    }
                    placeholder="e.g. Water fiddle-leaf fig, clean leaves, take close-up photo"
                    className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-2 text-sm text-emerald-900 placeholder:text-emerald-300 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-emerald-800">
                    Description
                  </label>
                  <textarea
                    value={draft.description}
                    onChange={(event) =>
                      handleDraftChange({ description: event.target.value })
                    }
                    rows={3}
                    placeholder="Add context or special care notes (watering amount, tools, signs to watch)."
                    className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm text-emerald-900 placeholder:text-emerald-300 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold text-emerald-800">
                    Frequency
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(
                      ["daily", "every_x_days", "weekly", "custom"] as Frequency[]
                    ).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleDraftChange({ frequency: option })}
                        className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                          draft.frequency === option
                            ? "border-emerald-500 bg-emerald-500 text-white shadow-sm"
                            : "border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        {option === "daily" && "Daily"}
                        {option === "every_x_days" && "Every X days"}
                        {option === "weekly" && "Weekly"}
                        {option === "custom" && "Custom dates"}
                      </button>
                    ))}
                  </div>

                  {draft.frequency === "every_x_days" && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                        Run every
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={draft.every_x_days ?? ""}
                        onChange={(event) =>
                          handleDraftChange({
                            every_x_days: Number(event.target.value),
                          })
                        }
                        className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-2 text-sm text-emerald-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                      />
                    </div>
                  )}

                  {draft.frequency === "weekly" && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                        Select weekdays
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {WEEKDAY_OPTIONS.map((day) => (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => handleToggleWeekday(day.value)}
                            className={`rounded-full border px-3 py-1 text-sm transition ${
                              draft.weekly_days?.includes(day.value)
                                ? "border-emerald-500 bg-emerald-500 text-white shadow-sm"
                                : "border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                            }`}
                          >
                            {day.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {draft.frequency === "custom" && (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="date"
                          value={customDateInput}
                          onChange={(event) =>
                            setCustomDateInput(event.target.value)
                          }
                          className="flex-1 rounded-2xl border border-emerald-200 bg-white px-4 py-2 text-sm text-emerald-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomDate}
                          className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600"
                        >
                          Add
                        </button>
                      </div>
                      {draft.custom_dates?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {draft.custom_dates.map((date) => (
                            <span
                              key={date}
                              className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs text-emerald-600"
                            >
                              {formatDate(date)}
                              <button
                                type="button"
                                onClick={() => handleRemoveCustomDate(date)}
                                className="text-emerald-500 hover:text-emerald-700"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-emerald-500">
                          Select exact dates to trigger this task.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-emerald-800">
                      Start date
                    </label>
                    <input
                      type="date"
                      value={draft.start_date.slice(0, 10)}
                      onChange={(event) =>
                        handleDraftChange({ start_date: event.target.value })
                      }
                      className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-2 text-sm text-emerald-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-emerald-800">
                      End date
                    </label>
                    <input
                      type="date"
                      value={draft.end_date.slice(0, 10)}
                      onChange={(event) =>
                        handleDraftChange({ end_date: event.target.value })
                      }
                      className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-2 text-sm text-emerald-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold text-emerald-800">
                    Completion proof
                  </label>
                  <div className="flex flex-wrap gap-2 text-sm text-emerald-700">
                    <label className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2">
                      <input
                        type="checkbox"
                        checked={draft.requires_photo}
                        onChange={(event) =>
                          handleDraftChange({ requires_photo: event.target.checked })
                        }
                      />
                      Photo proof
                    </label>
                    <label className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2">
                      <input
                        type="checkbox"
                        checked={draft.requires_notes}
                        onChange={(event) =>
                          handleDraftChange({ requires_notes: event.target.checked })
                        }
                      />
                      Written notes
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-emerald-800">
                    Notes for sitter
                  </label>
                  <textarea
                    value={draft.notes}
                    onChange={(event) =>
                      handleDraftChange({ notes: event.target.value })
                    }
                    rows={3}
                    placeholder="Optional reminders, e.g. fertilizer schedule, camera to check, or security notes."
                    className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm text-emerald-900 placeholder:text-emerald-300 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddTemplate}
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Add template
                  </button>
                </div>
              </div>
            </div>

            <aside className="space-y-4 rounded-3xl border border-emerald-100 bg-emerald-50/80 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-emerald-900">
                    Current task templates
                  </h2>
                  <p className="text-sm text-emerald-700">
                    Tasks generate a clear plan the sitter can follow each day.
                  </p>
                </div>
                <div className="flex flex-col items-end text-xs font-semibold uppercase tracking-wide text-emerald-600">
                  <span>{templates.length}</span>
                  <span>templates</span>
                </div>
              </div>

              {templates.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-emerald-200 bg-white/80 p-5 text-sm text-emerald-700">
                  No templates yet. Add one to see a structured checklist here.
                </div>
              ) : (
                <div className="space-y-4">
                  {templates.map((template) => (
                    <article
                      key={template.id}
                      className="rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm text-emerald-800 shadow-sm space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-emerald-900">
                            {template.name}
                          </p>
                          {template.description && (
                            <p className="text-sm text-emerald-700">
                              {template.description}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="text-emerald-500 hover:text-emerald-700"
                          aria-label="Delete template"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-600">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 border border-emerald-200">
                          <Clock className="h-3 w-3" />
                          {template.frequency === "daily" && "Daily"}
                          {template.frequency === "every_x_days" &&
                            `Every ${template.every_x_days ?? 1} days`}
                          {template.frequency === "weekly" &&
                            `Weekly ${
                              template.weekly_days?.length
                                ? template.weekly_days
                                    .map(
                                      (value) =>
                                        WEEKDAY_OPTIONS.find(
                                          (day) => day.value === value
                                        )?.label ?? value
                                    )
                                    .join(", ")
                                : ""
                            }`}
                          {template.frequency === "custom" && "Custom dates"}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 border border-emerald-200">
                          <Calendar className="h-3 w-3" />
                          {formatDate(template.start_date)} →{" "}
                          {formatDate(template.end_date)}
                        </span>
                      </div>

                      {(template.requires_photo || template.requires_notes) && (
                        <div className="flex flex-wrap gap-2 text-xs text-emerald-600">
                          {template.requires_photo && (
                            <span className="rounded-full bg-emerald-50 px-3 py-1 border border-emerald-200">
                              📸 Photo proof
                            </span>
                          )}
                          {template.requires_notes && (
                            <span className="rounded-full bg-emerald-50 px-3 py-1 border border-emerald-200">
                              📝 Written notes
                            </span>
                          )}
                        </div>
                      )}

                      {template.notes && (
                        <p className="text-xs text-emerald-600 bg-emerald-50/80 border border-emerald-100 rounded-xl px-3 py-2">
                          {template.notes}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </aside>
          </div>
        </section>

        <section className="rounded-3xl border border-emerald-200 bg-white p-8 shadow-sm space-y-6">
          <header className="flex items-center gap-3">
            <LayoutList className="h-5 w-5 text-emerald-500" />
            <div>
              <h2 className="text-xl font-semibold text-emerald-900">
                Task dashboard preview
              </h2>
              <p className="text-sm text-emerald-700">
                Visualize the schedule your sitter will receive each day.
              </p>
            </div>
          </header>

          {assignments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 p-6 text-sm text-emerald-700">
              Add templates or adjust their schedules to generate a daily plan for your sitter.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-600">
                <div className="inline-flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>
                    {assignments.length} generated checklist{" "}
                    {assignments.length === 1 ? "entry" : "entries"}
                  </span>
                </div>
                <div className="inline-flex items-center gap-2 text-emerald-500">
                  <CalendarDays className="h-4 w-4" />
                  <span>
                    {activeDayCount} active{" "}
                    {activeDayCount === 1 ? "day" : "days"} across{" "}
                    {dailySchedule.length} total
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <div className="grid min-w-full gap-4 text-sm text-emerald-800 sm:grid-cols-2 lg:grid-cols-3">
                  {dailySchedule.map((day) => (
                    <div
                      key={day.date}
                      className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
                    >
                      <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-wide">
                        <div className="flex flex-col">
                          <span className="font-semibold text-emerald-900">
                            {formatDate(day.date)}
                          </span>
                          <span className="text-emerald-500">
                            {formatWeekday(day.date)}
                          </span>
                        </div>
                        <div className="rounded-full bg-white px-3 py-1 text-emerald-600">
                          {day.tasks.length}{" "}
                          {day.tasks.length === 1 ? "task" : "tasks"}
                        </div>
                      </div>

                      {day.tasks.length > 0 ? (
                        <div className="space-y-3">
                          {day.tasks.map((assignment) => {
                            const template = templateLookup.get(
                              assignment.template_id
                            );
                            return (
                              <div
                                key={assignment.id}
                                className="rounded-xl border border-emerald-200 bg-white p-3 shadow-sm"
                              >
                                <p className="text-sm font-semibold text-emerald-900">
                                  {assignment.task_name}
                                </p>
                                {template?.description && (
                                  <p className="mt-1 text-xs text-emerald-600">
                                    {template.description}
                                  </p>
                                )}
                                {template?.notes && (
                                  <p className="mt-2 text-xs text-emerald-500">
                                    Notes: {template.notes}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-emerald-200 bg-white/80 p-3 text-xs text-emerald-500">
                          No tasks scheduled for this day.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs text-emerald-600">
                Saving will generate the full schedule and push it to the sitter’s daily checklist.
              </p>
            </div>
          )}
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-5 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSavePlanner}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving && <Clock className="h-4 w-4 animate-spin" />}
            Save task plan
          </button>
        </div>
      </div>
      {statusMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/40 px-4">
          <div className="w-full max-w-sm space-y-4 rounded-3xl border border-emerald-200 bg-white p-6 text-center shadow-xl">
            <p className="text-sm text-emerald-800">{statusMessage}</p>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
