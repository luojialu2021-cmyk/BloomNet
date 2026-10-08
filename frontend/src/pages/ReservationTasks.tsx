import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Camera,
  CheckCircle2,
  Circle,
  Loader2,
  NotebookPen,
  Sparkles,
  Trash2,
} from "lucide-react";
import { reservationService, uploadService } from "../api/services";
import type { CareTaskAssignment, CareUpdate, Reservation } from "../api/types";
import {
  getLocalReservationRecord,
  saveLocalReservation,
  isLocalReservationId,
} from "../utils/localReservations";
import { formatDateRangeET, formatDateTimeET } from "../utils/dateUtils";

type PhotoEntry = { file: File; preview: string };

const CARE_ACTION_CHOICES = [
  "Watered",
  "Misted",
  "Adjusted lights",
  "Checked soil",
  "Fertilized",
  "Pruned",
] as const;

// Use Eastern Time formatting
const formatDateLabel = (iso?: string | null) => {
  if (!iso) return "—";
  try {
    const dateStr = iso.includes("T") ? iso : `${iso}T00:00:00`;
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return iso;
    return new Intl.DateTimeFormat('en-US', {
      weekday: "long",
      month: "short",
      day: "numeric",
      timeZone: 'America/New_York',
    }).format(date);
  } catch (error) {
    return iso;
  }
};

const formatDateRange = formatDateRangeET;
const formatDateTime = formatDateTimeET;

const sortCareUpdates = (updates: CareUpdate[] = []) =>
  [...updates].sort((a, b) => {
    const aTime = new Date(a.date ?? "").getTime();
    const bTime = new Date(b.date ?? "").getTime();
    return bTime - aTime;
  });

export default function ReservationTasksPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [ownerName, setOwnerName] = useState("Plant owner");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [careNotes, setCareNotes] = useState("");
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [photoEntries, setPhotoEntries] = useState<PhotoEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [deletingUpdateId, setDeletingUpdateId] = useState<string | null>(null);

  const rawChecklist = reservation?.care_checklist ?? [];
  const schedule = reservation?.care_task_schedule ?? [];
  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const todaysAssignments = useMemo(() => {
    if (schedule.length) {
      return schedule.filter((entry) => entry.date === todayISO);
    }
    const fallback: CareTaskAssignment[] = [];
    rawChecklist.forEach((entry) => {
      if (!entry) return;
      if (entry.includes("|")) {
        const [date, name] = entry.split("|");
        if (date === todayISO && name) {
          fallback.push({
            id: `${date}:${name}`,
            template_id: "legacy",
            task_name: name,
            date,
          });
        }
      } else {
        fallback.push({
          id: `${todayISO}:${entry}`,
          template_id: "legacy",
          task_name: entry,
          date: todayISO,
        });
      }
    });
    return fallback;
  }, [schedule, rawChecklist, todayISO]);

  const tasks = useMemo(
    () => todaysAssignments.map((assignment) => assignment.task_name),
    [todaysAssignments]
  );
  const tasksKey = useMemo(
    () => todaysAssignments.map((assignment) => assignment.id).join("|"),
    [todaysAssignments]
  );
  const todayLabel = useMemo(() => formatDateLabel(new Date().toISOString()), []);
  const visitRange = formatDateRange(reservation?.start_date, reservation?.end_date);
  const recentUpdates = useMemo(
    () => sortCareUpdates(reservation?.care_updates),
    [reservation?.care_updates]
  );

  const persistLocalReservation = useCallback(
    (next: Reservation) => {
      const reservationId = next.id || (next as any)._id;
      if (!reservationId) return;
      if (isLocalReservationId(reservationId)) {
        const snapshot = getLocalReservationRecord(reservationId);
        saveLocalReservation({
          reservation: { ...next, id: reservationId },
          ownerSnapshot: snapshot?.ownerSnapshot,
          sitterSnapshot: snapshot?.sitterSnapshot,
        });
      }
    },
    []
  );

  const assignOwnerName = useCallback(
    (next: Reservation) => {
      const reservationId = next.id || (next as any)._id || id;
      const snapshot = getLocalReservationRecord(reservationId);
      if (snapshot?.ownerSnapshot?.name) {
        setOwnerName(snapshot.ownerSnapshot.name);
      } else if (snapshot?.reservation?.owner_notes) {
        setOwnerName(snapshot.reservation.owner_notes);
      } else {
        setOwnerName("Plant owner");
      }
    },
    [id]
  );

  const updateReservationState = useCallback(
    (next: Reservation) => {
      const normalized: Reservation = {
        ...next,
        id: next.id || (next as any)._id || id,
      };
      setReservation(normalized);
      assignOwnerName(normalized);
      persistLocalReservation(normalized);
    },
    [assignOwnerName, persistLocalReservation, id]
  );

  const loadReservation = useCallback(async () => {
    if (!id) {
      setError("Missing reservation id.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await reservationService.getById(id);
      if (response.data) {
        updateReservationState(response.data as Reservation);
        return;
      }
      if (response.error) {
        const snapshot = getLocalReservationRecord(id);
        if (snapshot?.reservation) {
          updateReservationState(snapshot.reservation);
        } else {
          setError(response.error || "Reservation not found.");
        }
      }
    } catch (err: any) {
      const snapshot = getLocalReservationRecord(id);
      if (snapshot?.reservation) {
        updateReservationState(snapshot.reservation);
        setError("Working with the latest saved copy of this reservation.");
      } else {
        setError(err?.message || "Unable to load reservation.");
      }
    } finally {
      setLoading(false);
    }
  }, [id, updateReservationState]);

  useEffect(() => {
    loadReservation();
  }, [loadReservation]);

  useEffect(() => {
    setSelectedTasks([]);
    setSelectedActions([]);
  }, [tasksKey]);

  const handleTaskToggle = (task: string) => {
    setSelectedTasks((prev) =>
      prev.includes(task)
        ? prev.filter((value) => value !== task)
        : [...prev, task]
    );
  };

  const handleActionToggle = (action: string) => {
    setSelectedActions((prev) =>
      prev.includes(action)
        ? prev.filter((value) => value !== action)
        : [...prev, action]
    );
  };

  const handlePhotoSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    const slotsRemaining = Math.max(0, 4 - photoEntries.length);
    files.slice(0, slotsRemaining).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const preview = typeof reader.result === "string" ? reader.result : "";
        if (!preview) return;
        setPhotoEntries((prev) => [...prev, { file, preview }]);
      };
      reader.readAsDataURL(file);
    });
    event.target.value = "";
  };

  const removePhotoEntry = (index: number) => {
    setPhotoEntries((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleDeleteCareUpdate = async (careUpdateId: string) => {
    if (!reservation) return;
    const confirmDelete = window.confirm(
      "Remove this care update? This will delete the update for you and the plant owner."
    );
    if (!confirmDelete) return;

    const reservationId = reservation.id || (reservation as any)._id || id;

    const applyLocalRemoval = () => {
      const filtered = (reservation.care_updates ?? []).filter(
        (update) => update.id !== careUpdateId
      );
      const nextReservation: Reservation = {
        ...reservation,
        care_updates: filtered,
      };
      updateReservationState(nextReservation);
    };

    setDeletingUpdateId(careUpdateId);
    setStatusMessage(null);

    if (
      !reservationId ||
      isLocalReservationId(reservationId) ||
      careUpdateId.startsWith("local-update-")
    ) {
      applyLocalRemoval();
      setStatusMessage("Care update removed.");
      setDeletingUpdateId(null);
      return;
    }

    try {
      const response = await reservationService.deleteCareUpdate(
        reservationId,
        careUpdateId
      );
      if (response.data) {
        updateReservationState(response.data as Reservation);
        setStatusMessage("Care update removed.");
      } else if (response.error) {
        if (response.status === 404 || response.status === 405) {
          applyLocalRemoval();
          setStatusMessage("Care update removed.");
        } else {
          setStatusMessage(
            typeof response.error === "string"
              ? response.error
              : "Unable to delete care update."
          );
        }
      } else {
        applyLocalRemoval();
        setStatusMessage("Care update removed locally.");
      }
    } catch (err: any) {
      console.error("Failed to delete care update:", err);
      const message = err?.message || "Unable to delete care update.";
      if (String(message).toLowerCase().includes("not found")) {
        applyLocalRemoval();
        setStatusMessage("Care update removed.");
      } else {
        setStatusMessage(message);
      }
    } finally {
      setDeletingUpdateId(null);
    }
  };

  const handleShareUpdate = async () => {
    if (!reservation) return;
    if (
      !careNotes.trim() &&
      selectedTasks.length === 0 &&
      selectedActions.length === 0 &&
      photoEntries.length === 0
    ) {
      setStatusMessage("Please complete a task, add a note, or attach a photo before sharing.");
      return;
    }

    const reservationId = reservation.id || (reservation as any)._id || id;
    if (!reservationId) return;

    setSubmitting(true);
    setStatusMessage(null);

    let photoUrls = photoEntries.map((entry) => entry.preview);

    if (photoEntries.length > 0) {
      try {
        const uploadResponse = await uploadService.uploadCarePhotos(
          photoEntries.map((entry) => entry.file)
        );
        if (uploadResponse.files?.length) {
          photoUrls = uploadResponse.files.map((file) => file.file_url);
        }
      } catch (uploadError) {
        console.warn("Photo upload failed, storing local previews.", uploadError);
      }
    }

    const payload = {
      notes: careNotes.trim(),
      photos: photoUrls,
      care_actions: selectedActions,
      tasks_completed: selectedTasks,
    };

    let nextReservation: Reservation | null = null;
    let message = "Care update shared with the owner.";

    try {
      const response = await reservationService.addCareUpdate(reservationId, payload);
      if (response.data) {
        nextReservation = response.data as Reservation;
      } else if (response.error) {
        throw new Error(
          typeof response.error === "string"
            ? response.error
            : "Unable to share update with the server."
        );
      }
    } catch (apiError) {
      console.warn("Falling back to local care update storage.", apiError);
      const localUpdate: CareUpdate = {
        id: `local-update-${Date.now()}`,
        date: new Date().toISOString(),
        photos: photoUrls,
        notes: payload.notes || "Shared tasks update.",
        care_actions: payload.care_actions,
        tasks_completed: payload.tasks_completed,
        timestamp_verified: true,
        liked_by: [],
        comments: [],
      };
      nextReservation = {
        ...reservation,
        care_updates: [...(reservation.care_updates ?? []), localUpdate],
      };
      message = "Care update saved locally.";
    }

    if (nextReservation) {
      updateReservationState(nextReservation);
      setCareNotes("");
      setSelectedTasks([]);
      setSelectedActions([]);
      setPhotoEntries([]);
      setStatusMessage(message);
    }

    setSubmitting(false);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-amber-50 via-yellow-50 to-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-amber-800">
          <Loader2 className="w-6 h-6 animate-spin" />
          <p className="text-sm font-medium">Loading today’s care plan…</p>
        </div>
      </main>
    );
  }

  if (error && !reservation) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-amber-50 via-yellow-50 to-white flex items-center justify-center px-4">
        <div className="max-w-md rounded-3xl border border-amber-200 bg-white/90 p-6 text-center shadow-sm">
          <p className="text-amber-800">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to dashboard
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 via-yellow-50 to-white pb-16">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-amber-700 hover:text-amber-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to reservation
        </button>

        {error && (
          <div className="rounded-3xl border border-amber-200 bg-amber-100/80 px-4 py-3 text-sm text-amber-900 shadow-sm">
            {error}
          </div>
        )}

        {statusMessage && (
          <div className="rounded-3xl border border-amber-300 bg-amber-100 px-4 py-3 text-sm text-amber-900 shadow-sm">
            {statusMessage}
          </div>
        )}

        <section className="rounded-3xl border border-amber-200 bg-white/90 p-6 shadow-sm backdrop-blur space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-amber-100 p-3 text-amber-600">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                  Daily task view
                </p>
                <h1 className="text-2xl font-semibold text-amber-900">
                  {ownerName}’s care plan
                </h1>
                <p className="mt-1 text-sm text-amber-700">
                  {reservation?.plants_info || "Houseplant collection"}
                </p>
              </div>
            </div>
            <div className="rounded-2xl bg-amber-100/70 px-4 py-3 text-sm text-amber-800 border border-amber-200">
              <p className="text-xs uppercase tracking-wide font-semibold text-amber-600">
                Visit window
              </p>
              <p className="mt-1 font-semibold">{visitRange}</p>
              <p className="text-xs text-amber-700/80">
                Status: {reservation?.status?.replace(/_/g, " ") ?? "—"}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-white/90 p-6 shadow-sm backdrop-blur space-y-5">
          <header className="flex items-center gap-3 text-amber-700">
            <Calendar className="w-5 h-5 text-amber-500" />
            <div>
              <p className="text-xs uppercase tracking-wide font-semibold text-amber-600">
                Today
              </p>
              <p className="text-lg font-semibold text-amber-900">{todayLabel}</p>
            </div>
          </header>

          {tasks.length === 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-5 text-sm text-amber-800">
              The plant owner hasn’t shared a detailed checklist yet. Review the care
              instructions in the reservation and share any updates after your visit.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {tasks.map((task) => {
                const isDone = selectedTasks.includes(task);
                return (
                  <button
                    key={task}
                    onClick={() => handleTaskToggle(task)}
                    className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-4 text-left transition ${
                      isDone
                        ? "border-amber-400 bg-amber-50 shadow-sm"
                        : "border-amber-200 bg-white hover:border-amber-300"
                    }`}
                  >
                    <span className="mt-0.5">
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-amber-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-amber-300" />
                      )}
                    </span>
                    <div>
                      <p className="font-semibold text-amber-900">{task}</p>
                      <p className="text-xs text-amber-700/70">
                        Tap to mark {isDone ? "incomplete" : "complete"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {reservation?.special_notes && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-4">
              <p className="text-xs uppercase tracking-wide font-semibold text-amber-600">
                Owner note
              </p>
              <p className="mt-1 text-sm text-amber-800">{reservation.special_notes}</p>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-amber-200 bg-white/90 p-6 shadow-sm backdrop-blur space-y-6">
          <header className="flex items-center gap-3">
            <NotebookPen className="w-5 h-5 text-amber-500" />
            <div>
              <h2 className="text-lg font-semibold text-amber-900">
                Share today’s care update
              </h2>
              <p className="text-sm text-amber-700/80">
                Let the plant owner know what you completed during this visit.
              </p>
            </div>
          </header>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-amber-800">
              Notes for the owner
            </label>
            <textarea
              value={careNotes}
              onChange={(event) => setCareNotes(event.target.value)}
              rows={4}
              placeholder="Share watering details, plant observations, or anything the owner should know."
              className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-amber-900 placeholder:text-amber-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-amber-800">
              Care actions completed
            </label>
            <div className="flex flex-wrap gap-2">
              {CARE_ACTION_CHOICES.map((action) => {
                const isSelected = selectedActions.includes(action);
                return (
                  <button
                    key={action}
                    onClick={() => handleActionToggle(action)}
                    type="button"
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      isSelected
                        ? "border-amber-500 bg-amber-500 text-white shadow-sm"
                        : "border-amber-200 text-amber-700 hover:bg-amber-100"
                    }`}
                  >
                    {action}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-amber-800">
              Photo updates
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-amber-300 bg-amber-50/60 text-xs font-medium text-amber-600 hover:border-amber-400 hover:bg-amber-100">
                <Camera className="mb-1 h-5 w-5" />
                Add photo
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoSelection}
                  className="hidden"
                />
              </label>
              {photoEntries.map((entry, index) => (
                <div
                  key={`${entry.preview}-${index}`}
                  className="relative h-24 w-24 overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 shadow-sm"
                >
                  <img src={entry.preview} alt="" className="h-full w-full object-cover" />
                  <button
                    onClick={() => removePhotoEntry(index)}
                    className="absolute right-1 top-1 rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-amber-800 shadow"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-amber-600">
              Add up to 4 photos per update. Photos are shared with the plant owner.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleShareUpdate}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Share update
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-white/90 p-6 shadow-sm backdrop-blur space-y-4">
          <header className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <div>
              <h2 className="text-lg font-semibold text-amber-900">
                Recent care updates
              </h2>
              <p className="text-sm text-amber-700/80">
                A timeline of your shared progress with the plant owner.
              </p>
            </div>
          </header>

          {recentUpdates.length === 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-5 text-sm text-amber-800">
              No updates yet. After you share your first update, it will appear here.
            </div>
          ) : (
            <div className="space-y-3">
              {recentUpdates.map((update) => (
                <article
                  key={update.id}
                  className="rounded-2xl border border-amber-200 bg-white px-4 py-4 shadow-sm"
                >
                  <header className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-semibold text-amber-900">
                        {formatDateTime(update.date)}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleDeleteCareUpdate(update.id)}
                        disabled={deletingUpdateId === update.id}
                        className="inline-flex items-center gap-1 rounded-full border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-600 transition hover:bg-amber-50 disabled:opacity-60"
                        aria-label="Delete care update"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                    {update.tasks_completed?.length ? (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                        {update.tasks_completed.length} task
                        {update.tasks_completed.length === 1 ? "" : "s"} completed
                      </span>
                    ) : null}
                  </header>
                  {update.notes && (
                    <p className="mt-3 text-sm text-amber-800">{update.notes}</p>
                  )}
                  {update.care_actions?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {update.care_actions.map((action) => (
                        <span
                          key={action}
                          className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"
                        >
                          {action}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {update.photos?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {update.photos.map((photo, index) => (
                        <img
                          key={`${photo}-${index}`}
                          src={photo}
                          alt=""
                          className="h-20 w-20 rounded-xl object-cover border border-amber-200"
                        />
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
