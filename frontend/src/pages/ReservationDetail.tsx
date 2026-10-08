import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  reservationService,
  authService,
  paymentService,
  uploadService,
} from "../api/services";
import type { Reservation, User } from "../api/types";
import ReservationStatusBadge from "../components/ReservationStatusBadge";
import PaymentStatusBadge from "../components/PaymentStatusBadge";
import { useOwnerAuth, useSitterAuth } from "../contexts/AuthContext";
import { formatDateTimeET, formatDateET, formatFullDateTimeET } from "../utils/dateUtils";

const CARE_ACTION_OPTIONS = [
  "Watered",
  "Fertilized",
  "Pruned",
  "Humidity check",
  "Rotated pots",
];

// Use Eastern Time formatting
const formatDate = formatDateET;
const formatDateTime = formatDateTimeET;

type Role = "owner" | "sitter" | "viewer";

export default function ReservationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Support both owner and sitter authentication
  const { user: ownerUser } = useOwnerAuth();
  const { user: sitterUser } = useSitterAuth();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [owner, setOwner] = useState<User | null>(null);
  const [sitter, setSitter] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [careNotes, setCareNotes] = useState("");
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [isUploadingCareUpdate, setIsUploadingCareUpdate] = useState(false);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingReview, setRatingReview] = useState("");
  const [ratingMessage, setRatingMessage] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentSubmittingId, setCommentSubmittingId] = useState<string | null>(null);
  const [careChecklistDraft, setCareChecklistDraft] = useState<string[]>([]);
  const [newChecklistTask, setNewChecklistTask] = useState("");
  const [savingChecklist, setSavingChecklist] = useState(false);
  const [checklistMessage, setChecklistMessage] = useState<string | null>(null);
  const [testUploadPreviews, setTestUploadPreviews] = useState<
    { file: File; url: string }[]
  >([]);
  const testUploadInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingTest, setIsUploadingTest] = useState(false);
  const [testUploadMessage, setTestUploadMessage] = useState<string | null>(null);
  const photoPreviews = useMemo(
    () =>
      photoFiles.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      })),
    [photoFiles]
  );

  useEffect(() => {
    return () => {
      photoPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
      testUploadPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [photoPreviews, testUploadPreviews]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!id) {
        setError("Missing reservation id");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const reservationRes = await reservationService.getById(id);

        if (!mounted) return;

        if (reservationRes.data) {
          const normalized = reservationRes.data as Reservation;
          normalized.id = normalized.id || (normalized as any)._id || id;
          setReservation(normalized);
        } else {
          setError(reservationRes.error || "Reservation not found.");
        }

        // Determine current user from owner or sitter auth based on reservation
        // Priority depends on current path: if /sitter/*, prioritize sitter; otherwise prioritize owner
        let matchedUser: User | null = null;
        const currentPath = window.location.pathname;
        const isSitterPortal = currentPath.startsWith('/sitter');
        
        if (reservationRes.data) {
          const normalized = reservationRes.data as Reservation;
          const reservationOwnerId = String(normalized.owner_id || '');
          const reservationSitterId = String(normalized.sitter_id || '');
          
          // If on sitter portal, prioritize sitter match
          if (isSitterPortal) {
            // Check sitter first if on sitter portal
            if (sitterUser) {
              const sitterUserId = String(sitterUser.user_id || (sitterUser as any).id || '');
              console.log('[ReservationDetail] Checking sitter match (sitter portal):', {
                sitterUserEmail: sitterUser.email,
                sitterUserId,
                reservationSitterId,
                match: reservationSitterId === sitterUserId
              });
              if (reservationSitterId && reservationSitterId === sitterUserId) {
                console.log('[ReservationDetail] Matched sitter user:', sitterUser.email);
                matchedUser = {
                  id: sitterUserId,
                  email: sitterUser.email || '',
                  full_name: sitterUser.name || sitterUser.full_name || '',
                  jhu_id: '',
                  phone: '',
                  bio: '',
                  profile_image: sitterUser.profile_image,
                  rating: 0,
                  total_reviews: 0,
                  specialties: [],
                  service_areas: [],
                  is_available: true,
                  preferred_plant_types: [],
                  is_active: true,
                  is_verified: false,
                  created_at: '',
                  updated_at: '',
                };
              }
            }
            // Check owner only if sitter didn't match
            if (!matchedUser && ownerUser) {
              const ownerUserId = String(ownerUser.user_id || (ownerUser as any).id || '');
              console.log('[ReservationDetail] Checking owner match (sitter portal, fallback):', {
                ownerUserEmail: ownerUser.email,
                ownerUserId,
                reservationOwnerId,
                match: reservationOwnerId === ownerUserId
              });
              if (reservationOwnerId && reservationOwnerId === ownerUserId) {
                console.log('[ReservationDetail] Matched owner user (fallback):', ownerUser.email);
                matchedUser = {
                  id: ownerUserId,
                  email: ownerUser.email || '',
                  full_name: ownerUser.name || ownerUser.full_name || '',
                  jhu_id: '',
                  phone: '',
                  bio: '',
                  profile_image: ownerUser.profile_image,
                  rating: 0,
                  total_reviews: 0,
                  specialties: [],
                  service_areas: [],
                  is_available: true,
                  preferred_plant_types: [],
                  is_active: true,
                  is_verified: false,
                  created_at: '',
                  updated_at: '',
                };
              }
            }
          } else {
            // Not on sitter portal, prioritize owner match
            // Check owner first if owner_id matches (owner has priority)
            if (ownerUser) {
              const ownerUserId = String(ownerUser.user_id || (ownerUser as any).id || '');
              console.log('[ReservationDetail] Checking owner match:', {
                ownerUserEmail: ownerUser.email,
                ownerUserId,
                reservationOwnerId,
                match: reservationOwnerId === ownerUserId
              });
              if (reservationOwnerId && reservationOwnerId === ownerUserId) {
                console.log('[ReservationDetail] Matched owner user:', ownerUser.email);
                matchedUser = {
                  id: ownerUserId,
                  email: ownerUser.email || '',
                  full_name: ownerUser.name || ownerUser.full_name || '',
                  jhu_id: '',
                  phone: '',
                  bio: '',
                  profile_image: ownerUser.profile_image,
                  rating: 0,
                  total_reviews: 0,
                  specialties: [],
                  service_areas: [],
                  is_available: true,
                  preferred_plant_types: [],
                  is_active: true,
                  is_verified: false,
                  created_at: '',
                  updated_at: '',
                };
              }
            }
            // Check sitter if sitter_id matches (only if owner didn't match)
            if (!matchedUser && sitterUser) {
              const sitterUserId = String(sitterUser.user_id || (sitterUser as any).id || '');
              console.log('[ReservationDetail] Checking sitter match:', {
                sitterUserEmail: sitterUser.email,
                sitterUserId,
                reservationSitterId,
                match: reservationSitterId === sitterUserId
              });
              if (reservationSitterId && reservationSitterId === sitterUserId) {
                console.log('[ReservationDetail] Matched sitter user:', sitterUser.email);
                matchedUser = {
                  id: sitterUserId,
                  email: sitterUser.email || '',
                  full_name: sitterUser.name || sitterUser.full_name || '',
                  jhu_id: '',
                  phone: '',
                  bio: '',
                  profile_image: sitterUser.profile_image,
                  rating: 0,
                  total_reviews: 0,
                  specialties: [],
                  service_areas: [],
                  is_available: true,
                  preferred_plant_types: [],
                  is_active: true,
                  is_verified: false,
                  created_at: '',
                  updated_at: '',
                };
              }
            }
          }
          
          // Fallback: use user based on current portal context
          // If on sitter portal, prefer sitter; otherwise prefer owner
          if (!matchedUser) {
            if (isSitterPortal && sitterUser) {
              // On sitter portal, prefer sitter even if ID doesn't match
              console.log('[ReservationDetail] Using sitter user as fallback (sitter portal, ID may not match):', sitterUser.email);
              matchedUser = {
                id: sitterUser.user_id || (sitterUser as any).id || '',
                email: sitterUser.email || '',
                full_name: sitterUser.name || sitterUser.full_name || '',
                jhu_id: '',
                phone: '',
                bio: '',
                profile_image: sitterUser.profile_image,
                rating: 0,
                total_reviews: 0,
                specialties: [],
                service_areas: [],
                is_available: true,
                preferred_plant_types: [],
                is_active: true,
                is_verified: false,
                created_at: '',
                updated_at: '',
              };
            } else if (!isSitterPortal && ownerUser) {
              // Not on sitter portal, prefer owner
              console.log('[ReservationDetail] Using owner user as fallback (owner portal, ID may not match):', ownerUser.email);
              matchedUser = {
                id: ownerUser.user_id || (ownerUser as any).id || '',
                email: ownerUser.email || '',
                full_name: ownerUser.name || ownerUser.full_name || '',
                jhu_id: '',
                phone: '',
                bio: '',
                profile_image: ownerUser.profile_image,
                rating: 0,
                total_reviews: 0,
                specialties: [],
                service_areas: [],
                is_available: true,
                preferred_plant_types: [],
                is_active: true,
                is_verified: false,
                created_at: '',
                updated_at: '',
              };
            } else if (ownerUser) {
              // Final fallback: use owner if available
              console.log('[ReservationDetail] Using owner user as final fallback:', ownerUser.email);
              matchedUser = {
                id: ownerUser.user_id || (ownerUser as any).id || '',
                email: ownerUser.email || '',
                full_name: ownerUser.name || ownerUser.full_name || '',
                jhu_id: '',
                phone: '',
                bio: '',
                profile_image: ownerUser.profile_image,
                rating: 0,
                total_reviews: 0,
                specialties: [],
                service_areas: [],
                is_available: true,
                preferred_plant_types: [],
                is_active: true,
                is_verified: false,
                created_at: '',
                updated_at: '',
              };
            } else if (sitterUser) {
              // Final fallback: use sitter if available
              console.log('[ReservationDetail] Using sitter user as final fallback:', sitterUser.email);
              matchedUser = {
                id: sitterUser.user_id || (sitterUser as any).id || '',
                email: sitterUser.email || '',
                full_name: sitterUser.name || sitterUser.full_name || '',
                jhu_id: '',
                phone: '',
                bio: '',
                profile_image: sitterUser.profile_image,
                rating: 0,
                total_reviews: 0,
                specialties: [],
                service_areas: [],
                is_available: true,
                preferred_plant_types: [],
                is_active: true,
                is_verified: false,
                created_at: '',
                updated_at: '',
              };
            }
          }
        }
        
        if (matchedUser) {
          setCurrentUser(matchedUser);
        }
      } catch (err: any) {
        if (mounted) setError(err?.message || "Failed to load reservation.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [id, ownerUser, sitterUser]);

  useEffect(() => {
    let cancelled = false;
    const fetchUsers = async () => {
      if (!reservation) return;
      const [ownerRes, sitterRes] = await Promise.all([
        authService.getUserById(reservation.owner_id),
        authService.getUserById(reservation.sitter_id),
      ]);
      if (!cancelled) {
        if (ownerRes.data) setOwner(ownerRes.data as User);
        if (sitterRes.data) setSitter(sitterRes.data as User);
      }
    };
    fetchUsers();
    return () => {
      cancelled = true;
    };
  }, [reservation]);

  useEffect(() => {
    if (!reservation) {
      setCareChecklistDraft([]);
      return;
    }
    setCareChecklistDraft(reservation.care_checklist ?? []);
  }, [reservation?.care_checklist, reservation]);

  useEffect(() => {
    setSelectedTasks((prev) =>
      prev.filter((task) => careChecklistDraft.includes(task))
    );
  }, [careChecklistDraft]);

  useEffect(() => {
    if (!reservation?.care_updates) {
      setCommentDrafts({});
      return;
    }
    setCommentDrafts((prev) => {
      const next: Record<string, string> = {};
      reservation.care_updates.forEach((update) => {
        next[update.id] = prev[update.id] ?? "";
      });
      return next;
    });
  }, [reservation?.care_updates]);

  const role: Role = useMemo(() => {
    if (!reservation) return "viewer";
    
    // First priority: check URL ?as= parameter
    const urlParams = new URLSearchParams(window.location.search);
    const asParam = urlParams.get('as');
    if (asParam === 'sitter' && sitterUser) {
      return "sitter";
    }
    if (asParam === 'owner' && ownerUser) {
      return "owner";
    }
    
    const ownerId = String(reservation.owner_id || '');
    const sitterId = String(reservation.sitter_id || '');
    const currentPath = window.location.pathname;
    const isSitterPortal = currentPath.startsWith('/sitter');
    
    // Second priority: check if logged-in user matches reservation IDs
    if (ownerUser) {
      const ownerUserId = String(ownerUser.user_id || '');
      if (ownerId && ownerId === ownerUserId) {
        return "owner";
      }
    }
    
    if (sitterUser) {
      const sitterUserId = String(sitterUser.user_id || '');
      if (sitterId && sitterId === sitterUserId) {
        return "sitter";
      }
    }
    
    // Fallback: use portal context
    if (isSitterPortal && sitterUser) {
      return "sitter";
    }
    if (!isSitterPortal && ownerUser) {
      return "owner";
    }
    
    return "viewer";
  }, [reservation, ownerUser, sitterUser]);

  const isOwner = role === "owner";
  const isSitter = role === "sitter";

  const getParticipantName = (userId?: string, role?: string) => {
    if (!userId) return "Unknown";
    
    // Normalize IDs to strings for comparison
    const normalizedUserId = String(userId || '');
    
    // Check owner first
    if (owner) {
      const ownerId = String(owner.id || '');
      if (ownerId && ownerId === normalizedUserId) {
        console.log('[getParticipantName] Matched owner:', owner.full_name || owner.email);
        return owner.full_name || owner.email || "Owner";
      }
    }
    
    // Check ownerUser (current logged-in owner from auth)
    if (ownerUser) {
      const ownerUserId = String((ownerUser as any).user_id || (ownerUser as any).id || '');
      if (ownerUserId && ownerUserId === normalizedUserId) {
        console.log('[getParticipantName] Matched ownerUser:', ownerUser.email);
        return (ownerUser as any).name || (ownerUser as any).full_name || ownerUser.email || "Owner";
      }
    }
    
    // Check sitter (from API, users collection)
    if (sitter) {
      const sitterId = String(sitter.id || '');
      if (sitterId && sitterId === normalizedUserId) {
        console.log('[getParticipantName] Matched sitter:', sitter.full_name || sitter.email);
        return sitter.full_name || sitter.email || "Sitter";
      }
    }
    
    // Check sitterUser (current logged-in sitter from auth, auth_users collection)
    // This is the most important check for OAuth-logged-in sitters!
    if (sitterUser) {
      const sitterUserId = String((sitterUser as any).user_id || (sitterUser as any).id || '');
      if (sitterUserId && sitterUserId === normalizedUserId) {
        const sitterName = (sitterUser as any).name || (sitterUser as any).full_name || sitterUser.email || "Sitter";
        console.log('[getParticipantName] Matched sitterUser:', { email: sitterUser.email, name: sitterName, user_id: sitterUserId });
        return sitterName;
      }
    }
    
    // Check current user (matched user)
    if (currentUser) {
      const currentUserId = String(currentUser.id || '');
      if (currentUserId && currentUserId === normalizedUserId) {
        console.log('[getParticipantName] Matched currentUser:', currentUser.full_name || currentUser.email);
        return currentUser.full_name || currentUser.email || "You";
      }
    }
    
    // Fallback: If role is provided and no match found, use role-based naming
    const roleLower = role?.toLowerCase();
    if (roleLower === "sitter") {
      // First try to use sitterUser if email matches
      if (sitterUser && reservation?.sitter_email && sitterUser.email === reservation.sitter_email) {
        console.log('[getParticipantName] Using sitterUser by email match:', sitterUser.email);
        return (sitterUser as any).name || (sitterUser as any).full_name || sitterUser.email || "Sitter";
      }
      // Then try reservation's sitter_name
      if (reservation?.sitter_name) {
        console.log('[getParticipantName] Using reservation.sitter_name as fallback:', reservation.sitter_name);
        return reservation.sitter_name;
      }
      // Last resort: generic "Sitter"
      console.log('[getParticipantName] Using "Sitter" as fallback for role:', role);
      return "Sitter";
    }
    
    if (roleLower === "user" || roleLower === "owner") {
      if (owner) {
        return owner.full_name || owner.email || "Owner";
      }
      if (ownerUser) {
        return (ownerUser as any).name || (ownerUser as any).full_name || ownerUser.email || "Owner";
      }
      return "Owner";
    }
    
    console.log('[getParticipantName] No match found for userId:', normalizedUserId, {
      ownerIdChecked: owner ? String(owner.id || '') : 'none',
      ownerUserIdChecked: ownerUser ? String((ownerUser as any).user_id || (ownerUser as any).id || '') : 'none',
      sitterIdChecked: sitter ? String(sitter.id || '') : 'none',
      sitterUserIdChecked: sitterUser ? String((sitterUser as any).user_id || (sitterUser as any).id || '') : 'none',
      currentUserIdChecked: currentUser ? String(currentUser.id || '') : 'none',
      role,
      reservationSitterEmail: reservation?.sitter_email
    });
    
    return `User ${normalizedUserId.slice(-5)}`;
  };

  const totalDays = useMemo(() => {
    if (!reservation) return null;
    const start = new Date(reservation.start_date);
    const end = new Date(reservation.end_date);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return null;
    }
    const diffMs = Math.max(0, end.getTime() - start.getTime());
    return Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
  }, [reservation]);

  const refreshReservation = async () => {
    if (!id) return;
    const updated = await reservationService.getById(id);
    if (updated.data) {
      const normalized = updated.data as Reservation;
      normalized.id = normalized.id || (normalized as any)._id || id;
      setReservation(normalized);
    }
  };

  const handleReservationAction = async (
    action: "start" | "complete" | "cancel",
    reason?: string
  ) => {
    if (!reservation) return;
    const reservationId = reservation.id || (reservation as any)._id;
    const applyOptimisticComplete = () => {
      setReservation((prev) =>
        prev
          ? {
              ...prev,
              status: "completed",
              completed_at: new Date().toISOString(),
            }
          : prev
      );
    };
    const applyOptimisticStart = () => {
      setReservation((prev) =>
        prev
          ? {
              ...prev,
              status: "in_progress",
              started_at: new Date().toISOString(),
            }
          : prev
      );
    };

    setActionMessage(null);
    let response;
    switch (action) {
      case "start":
        // Optimistically update started_at when sitter clicks "Start care period"
        applyOptimisticStart();
        response = await reservationService.start(reservationId);
        break;
      case "complete":
        response = await reservationService.complete(reservationId);
        break;
      case "cancel":
        response = await reservationService.cancel(reservationId, reason);
        break;
      default:
        return;
    }

    if (response.error) {
      if (action === "complete") {
        applyOptimisticComplete();
        setActionMessage("Reservation marked as completed.");
        return;
      }
      if (action === "start") {
        // Revert optimistic update on error
        await refreshReservation();
        setActionMessage(response.error);
        return;
      }
      setActionMessage(response.error);
      return;
    }

    const updatedReservation = response.data as Reservation | undefined;
    if (updatedReservation) {
      const normalized: Reservation = {
        ...updatedReservation,
        id:
          updatedReservation.id ||
          (updatedReservation as any)._id ||
          reservationId,
      };
      setReservation(normalized);
    } else if (action === "complete") {
      applyOptimisticComplete();
    } else if (action === "start") {
      // If backend doesn't return updated reservation, refresh to get started_at
      await refreshReservation();
    }

    setActionMessage("Reservation updated.");

    if (!updatedReservation && action !== "start") {
      await refreshReservation();
    }
  };

  const handleCareUpdate = async () => {
    if (!reservation || !careNotes.trim()) {
      setActionMessage("Please add a note for your care update.");
      return;
    }
    const reservationId = reservation.id || (reservation as any)._id;
    let photoUrls: string[] = [];

    try {
      setIsUploadingCareUpdate(true);
      if (photoFiles.length > 0) {
        const uploadResponse = await uploadService.uploadCarePhotos(photoFiles);
        photoUrls = uploadResponse.files?.map((file) => file.file_url) ?? [];
      }

      const response = await reservationService.addCareUpdate(reservationId, {
        notes: careNotes.trim(),
        photos: photoUrls,
        care_actions: selectedActions,
        tasks_completed: selectedTasks,
      });

      if (response.error) {
        setActionMessage(
          typeof response.error === "string"
            ? response.error
            : "Unable to share care update."
        );
        return;
      }

      setActionMessage("Care update shared with the owner.");
      setCareNotes("");
      setSelectedActions([]);
      setSelectedTasks([]);
      setPhotoFiles([]);
      await refreshReservation();
    } catch (error: any) {
      setActionMessage(error?.message || "Failed to share care update.");
    } finally {
      setIsUploadingCareUpdate(false);
    }
  };

  const handleTaskToggle = (task: string) => {
    setSelectedTasks((prev) =>
      prev.includes(task)
        ? prev.filter((value) => value !== task)
        : [...prev, task]
    );
  };

  const handlePhotoSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setPhotoFiles((prev) => [...prev, ...files.slice(0, 5 - prev.length)]);
  };

  const removePhotoFile = (index: number) => {
    setPhotoFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddChecklistTask = () => {
    const trimmed = newChecklistTask.trim();
    if (!trimmed) return;
    if (careChecklistDraft.includes(trimmed)) {
      setChecklistMessage("Task already added to checklist.");
      return;
    }
    setCareChecklistDraft((prev) => [...prev, trimmed]);
    setNewChecklistTask("");
    setChecklistMessage(null);
  };

  const handleRemoveChecklistTask = (task: string) => {
    setCareChecklistDraft((prev) => prev.filter((item) => item !== task));
  };

  const handleSaveChecklist = async () => {
    if (!reservation) return;
    setSavingChecklist(true);
    setChecklistMessage(null);
    const reservationId = reservation.id || (reservation as any)._id;
    try {
      const response = await reservationService.updateCareChecklist(
        reservationId,
        { tasks: careChecklistDraft }
      );
      if (response.error) {
        setChecklistMessage(
          typeof response.error === "string"
            ? response.error
            : "Unable to update checklist."
        );
      } else {
        setChecklistMessage("Checklist updated.");
        await refreshReservation();
      }
    } catch (error: any) {
      setChecklistMessage(error?.message || "Unable to update checklist.");
    } finally {
      setSavingChecklist(false);
    }
  };

  const handleSubmitComment = async (careUpdateId: string) => {
    if (!reservation) return;
    const message = commentDrafts[careUpdateId]?.trim();
    if (!message) return;
    const reservationId = reservation.id || (reservation as any)._id;
    setCommentSubmittingId(careUpdateId);
    const response = await reservationService.addCareUpdateComment(
      reservationId,
      careUpdateId,
      message
    );
    if (response.error) {
      setActionMessage(
        typeof response.error === "string"
          ? response.error
          : "Unable to send comment."
      );
    } else {
      setCommentDrafts((prev) => ({ ...prev, [careUpdateId]: "" }));
      await refreshReservation();
    }
    setCommentSubmittingId(null);
  };

  const triggerTestUpload = () => {
    testUploadInputRef.current?.click();
  };

/*
  const handleTestUploadSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    const previews = files.slice(0, 5).map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));

    setTestUploadPreviews((prev) => {
      prev.forEach((preview) => URL.revokeObjectURL(preview.url));
      return previews;
    });
  };

*/
  const handleTestUploadSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    const file = files[0];
    if (!file.type.startsWith('image/')) {
      setTestUploadMessage('Please upload an image file (PNG, JPG, etc.)');
      return;
    }
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setTestUploadMessage('Image size must be less than 5MB');
      return;
    }
    const previews = files.slice(0, 5).map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setTestUploadPreviews((prev) => {
      prev.forEach((preview) => URL.revokeObjectURL(preview.url));
      return previews;
    });
    if (!reservation) return;
    const reservationId = reservation.id || (reservation as any)._id;

    setIsUploadingTest(true);
    setTestUploadMessage(null);

    try {
      const response = await reservationService.addCareUpdate(reservationId, {
      photos: [file], // transform to Base64 automatically
      notes: 'Photo update',
      care_actions: ['Photo Update'],
      tasks_completed: [],
      });

      if (response.error) {
        setTestUploadMessage(
          typeof response.error === 'string'
            ? response.error
            : 'Failed to upload image'
        );
      } else {
        setTestUploadMessage('Image uploaded successfully!');
        await refreshReservation();
        setTimeout(() => {
          setTestUploadMessage(null);
          setTestUploadPreviews([]);
        }, 3000);
      }
    } catch (error: any) {
      console.error('Error uploading test image:', error);
      setTestUploadMessage(error?.message || 'Failed to upload image');
    } finally {
      setIsUploadingTest(false);
      if (testUploadInputRef.current) {
        testUploadInputRef.current.value = '';
      }
    }
  };

  const removeTestUploadPreview = (index: number) => {
    setTestUploadPreviews((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed) {
        URL.revokeObjectURL(removed.url);
      }
      return next;
    });
  };

  const handleRatingSubmit = async () => {
    if (!reservation) return;
    const reservationId = reservation.id || (reservation as any)._id;
    const response = await reservationService.rate(
      reservationId,
      ratingValue,
      ratingReview.trim() || undefined
    );
    if (response.error) {
      setRatingMessage(response.error);
    } else {
      setRatingMessage("Thank you for rating!");
      await refreshReservation();
    }
  };

  const handleSimulatePayment = async () => {
    if (!reservation) return;
    const reservationId = reservation.id || (reservation as any)._id;
    setActionMessage("Initiating payment intent (demo)...");
    const intentRes = await paymentService.createIntent(reservationId);
    if (intentRes.error || !intentRes.data) {
      setActionMessage(intentRes.error || "Failed to create payment intent.");
      return;
    }
    const paymentIntentId = intentRes.data.payment_intent.id;
    const capture = await paymentService.capture(reservationId, paymentIntentId);
    if (capture.error) {
      setActionMessage(capture.error);
      return;
    }
    setActionMessage("Payment captured successfully (demo).");
    await refreshReservation();
  };

  //const showCareUpdateForm =
   // role === "sitter" && reservation?.status === "in_progress";
  
  const showCareUpdateForm = false;

  const canConfirm = false; // Removed pending status, automatic confirmation
  // Allow starting if status is None or confirmed (no longer checking for confirmed since we removed that status)
  const canStart = role === "sitter" && 
    reservation && 
    reservation.status !== "completed" && 
    reservation.status !== "cancelled" &&
    !(reservation.status === "in_progress" && reservation.started_at);
  // Only owner can complete if reservation is in_progress (has been started)
  const canComplete =
    reservation &&
    role === "owner" &&
    (reservation.status === "in_progress" || reservation.started_at) &&
    !reservation.completed_at; // Don't show if already completed
  const canPay = false; // Payment is now handled automatically on completion

  // Show ratings only for owner, and only if reservation has been completed (completed_at exists)
  const shouldShowRating =
    reservation?.completed_at &&
    role === "owner" &&
    reservation.owner_rating == null;

  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-gradient-to-b from-pink-50 via-white to-pink-50">
        <div className="text-center text-pink-500">
          Loading reservation details…
        </div>
      </main>
    );
  }

  if (error || !reservation) {
    return (
      <main className="flex items-center justify-center min-h-screen px-4 bg-gradient-to-b from-pink-50 via-white to-pink-50">
        <div className="max-w-md p-6 text-center text-pink-600 border border-pink-200 shadow-sm rounded-3xl bg-white/80">
          {error || "Not found"}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-pink-200">
      <div className="max-w-5xl px-4 py-10 mx-auto space-y-6">
        <section className="p-8 space-y-6 bg-white border shadow-lg rounded-3xl border-pink-50/50">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-500">
              Reservation overview
            </p>
            <h1 className="text-3xl font-normal leading-tight text-black">
              {owner?.full_name || "Plant owner"}{" "}
              <span className="text-pink-400">→</span>{" "}
              {sitter?.full_name || "Sitter"}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-pink-600">
              <span>
                {formatDate(reservation.start_date)} –{" "}
                {formatDate(reservation.end_date)}
              </span>
              {totalDays && (
                <>
                  <span className="hidden text-pink-400 sm:inline">•</span>
                  <span>{totalDays} day{totalDays > 1 ? "s" : ""} of care</span>
                </>
              )}
              <span className="hidden text-pink-400 sm:inline">•</span>
              <span>
                {reservation.location_address.split(",")[0] ??
                  reservation.location_address}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="flex flex-wrap justify-end gap-2">
              <ReservationStatusBadge status={reservation.status} />
              <PaymentStatusBadge status={reservation.payment_status} />
            </div>
            <div className="px-6 py-4 text-right bg-white border border-pink-100 shadow-md rounded-3xl">
              <div className="text-xs font-semibold tracking-wide text-pink-500 uppercase">
                Total amount
              </div>
              <div className="text-3xl font-semibold text-pink-600">
                ${reservation.total_amount.toFixed(2)}
              </div>
              {totalDays && (
                <div className="text-xs text-pink-500">
                  ≈ ${(reservation.total_amount / totalDays).toFixed(2)} per day
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-4 text-sm text-pink-600 md:grid-cols-3">
          <div className="p-4 transition-all duration-200 bg-white border shadow-md rounded-2xl border-pink-50 hover:shadow-lg">
            <h3 className="text-xs font-semibold tracking-wide text-pink-500 uppercase">
              Location
            </h3>
            <p className="mt-2 text-sm text-pink-600">
              {reservation.location_address}
            </p>
            {reservation.access_instructions && (
              <p className="mt-2 text-xs text-pink-500">
                Access instructions: {reservation.access_instructions}
              </p>
            )}
          </div>
          <div className="p-4 transition-all duration-200 bg-white border shadow-md rounded-2xl border-pink-50 hover:shadow-lg">
            <h3 className="text-xs font-semibold tracking-wide text-pink-500 uppercase">
              Plants overview
            </h3>
            <p className="mt-2 text-sm text-pink-600">
              {reservation.plants_info}
            </p>
          </div>
          <div className="p-4 bg-white border border-pink-200 rounded-2xl md:col-span-3">
            <h3 className="text-xs font-semibold tracking-wide text-pink-500 uppercase">
              Care instructions
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-pink-600 whitespace-pre-wrap">
              {reservation.care_instructions}
            </p>
          </div>
        </div>
      </section>

      <section className="p-8 space-y-6 bg-white border shadow-lg rounded-3xl border-pink-50/50">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-normal text-black">
            Status timeline
          </h2>
          <p className="text-sm text-pink-500">
            Track each milestone from booking request through completed care.
          </p>
        </div>

        <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Created",
              value: formatDateTime(reservation.created_at) || "—",
            },
            {
              label: "Started",
              value: formatDateTime(reservation.started_at) || "—",
            },
            {
              label: "Completed",
              value: formatDateTime(reservation.completed_at) || "—",
            },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="p-4 transition-all duration-200 bg-white border shadow-md rounded-2xl border-pink-50 hover:shadow-lg"
            >
              <div className="text-xs font-semibold tracking-wide text-pink-500 uppercase">
                {label}
              </div>
              <div className="mt-2 text-sm text-black">{value}</div>
            </div>
          ))}
        </div>

        {canComplete && (
          <div className="pt-2">
            <button
              onClick={() => handleReservationAction("complete")}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-pink-500 border border-pink-100 shadow-sm rounded-xl bg-pink-50 hover:bg-pink-100"
            >
              Confirm completed
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          {canStart && (
            <button
              onClick={() => handleReservationAction("start")}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 shadow-sm rounded-xl hover:bg-blue-700"
            >
              Start care period
            </button>
          )}
          {canPay && (
            <button
              onClick={handleSimulatePayment}
              className="px-4 py-2 text-sm font-semibold text-white transition-all bg-pink-500 shadow-md rounded-xl hover:bg-pink-600 hover:shadow-lg"
            >
              Complete payment (demo)
            </button>
          )}
        </div>

        {actionMessage && (
          <div className="px-4 py-3 text-sm text-pink-600 border border-pink-100 rounded-xl bg-pink-50/30">
            {actionMessage}
          </div>
        )}
      </section>

      {(isOwner || isSitter) && (
        <section className="p-8 space-y-6 bg-white border shadow-lg rounded-3xl border-pink-50/50">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-normal text-black">
              Daily care checklist
            </h2>
            <p className="text-sm text-pink-500">
              Shared tasks that track each day of the reservation.
            </p>
          </div>

          {isOwner && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  value={newChecklistTask}
                  onChange={(e) => setNewChecklistTask(e.target.value)}
                  placeholder="Add a required action (e.g. Upload daily photo)"
                  className="flex-1 px-4 py-2 text-sm border border-pink-200 rounded-xl"
                />
                <button
                  type="button"
                  onClick={handleAddChecklistTask}
                  className="px-4 py-2 text-sm font-semibold text-white bg-pink-500 rounded-xl hover:bg-pink-600"
                >
                  Add task
                </button>
              </div>
              {careChecklistDraft.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {careChecklistDraft.map((task) => (
                    <span
                      key={task}
                      className="inline-flex items-center gap-2 px-4 py-1 text-sm text-pink-600 border border-pink-200 rounded-full bg-pink-50/50"
                    >
                      {task}
                      <button
                        type="button"
                        onClick={() => handleRemoveChecklistTask(task)}
                        className="text-xs text-pink-600/70 hover:text-pink-600"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-sm text-pink-500 border border-pink-200 border-dashed rounded-2xl">
                  No tasks yet. Add a few to guide your sitter.
                </div>
              )}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={handleSaveChecklist}
                  disabled={savingChecklist}
                  className="px-4 py-2 text-sm font-semibold text-white bg-pink-900 shadow-sm rounded-xl hover:bg-pink-800 disabled:bg-pink-400"
                >
                  {savingChecklist ? "Saving..." : "Save checklist"}
                </button>
                {checklistMessage && (
                  <span className="text-sm text-pink-600">{checklistMessage}</span>
                )}
              </div>
            </div>
          )}

          {!isOwner && careChecklistDraft.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {careChecklistDraft.map((task) => (
                <span
                  key={task}
                  className="px-4 py-1 text-sm text-pink-600 border border-pink-200 rounded-full bg-pink-50/50"
                >
                  {task}
                </span>
              ))}
            </div>
          )}

          {careChecklistDraft.length === 0 && isSitter && (
            <div className="p-4 text-sm text-pink-500 border border-pink-200 border-dashed rounded-2xl">
              The owner hasn’t shared a checklist yet.
            </div>
          )}
        </section>
      )}

      <section className="p-8 space-y-6 bg-white border shadow-lg rounded-3xl border-pink-50/50">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-normal text-black">
              Care updates
            </h2>
            <p className="text-sm text-pink-500">
              Real-time updates shared by the sitter during in-progress care.
            </p>
          </div>
        </header>

        <div className="p-4 space-y-3 border-2 border-dashed rounded-2xl border-pink-200/50 bg-pink-50/20">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-pink-600">
                Upload
              </h3>
            </div>
            <button
              type="button"
              onClick={triggerTestUpload}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white transition-all bg-pink-500 rounded-full shadow-md hover:bg-pink-600 hover:shadow-lg"
            >
              Upload
            </button>
          </div>
          <input
            ref={testUploadInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleTestUploadSelection}
          />
          {testUploadPreviews.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {testUploadPreviews.map((preview, index) => (
                <div
                  key={`${preview.file.name}-${index}`}
                  className="relative w-20 h-20 overflow-hidden bg-white border shadow-md rounded-xl border-pink-50"
                >
                  <img
                    src={preview.url}
                    alt={preview.file.name}
                    className="object-cover w-full h-full"
                  />
                  <button
                    type="button"
                    onClick={() => removeTestUploadPreview(index)}
                    className="absolute right-1 top-1 rounded-full bg-white/80 px-2 py-0.5 text-xs text-pink-600 hover:bg-white"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {!reservation.care_updates?.length && (
          <div className="p-6 text-sm text-center text-pink-500 border border-dashed rounded-2xl border-pink-200/50 bg-pink-50/20">
            No care updates yet.
          </div>
        )}

        <ul className="space-y-6">
          {(reservation.care_updates ?? []).map((update) => {
            const completedTasks = new Set(update.tasks_completed ?? []);
            const checklist = reservation.care_checklist ?? [];
            const additionalActions = update.care_actions?.filter(
              (action) => !checklist.includes(action)
            );
            return (
              <li
                key={update.id}
                className="p-6 space-y-4 transition-all duration-200 bg-white border shadow-lg rounded-2xl border-pink-50 hover:shadow-xl"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold tracking-wide text-pink-500 uppercase">
                  <span>{formatDateTime(update.date)}</span>
                  <span className="text-pink-400">
                    {(reservation as any).sitter_name || getParticipantName(reservation.sitter_id)}
                  </span>
                </div>

                {checklist.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {checklist.map((task) => {
                      const done = completedTasks.has(task);
                      return (
                        <span
                          key={task}
                          className={`inline-flex items-center gap-2 rounded-full px-4 py-1 text-xs font-medium border ${
                            done
                              ? "border-pink-300 bg-pink-100 text-pink-600"
                              : "border-pink-200 bg-white text-pink-600"
                          }`}
                        >
                          {done ? "✅" : "⬜️"}
                          {task}
                        </span>
                      );
                    })}
                  </div>
                )}

                {additionalActions && additionalActions.length > 0 && (
                  <div className="flex flex-wrap gap-2 text-xs text-pink-600">
                    {additionalActions.map((action) => (
                      <span
                        key={action}
                        className="px-3 py-1 border border-pink-200 rounded-full bg-pink-50/50"
                      >
                        {action}
                      </span>
                    ))}
                  </div>
                )}

                {update.photos && update.photos.length > 0 && (
                  <div className="flex flex-wrap gap-3">
                    {update.photos.map((url, idx) => (
                      <img
                        key={`${update.id}-photo-${idx}`}
                        src={url}
                        alt={`Care update ${idx + 1}`}
                        className="object-cover w-24 h-24 border border-white shadow rounded-xl"
                      />
                    ))}
                  </div>
                )}

                <p className="text-sm leading-relaxed text-pink-600 whitespace-pre-line">
                  {update.notes}
                </p>

                {update.comments && update.comments.length > 0 && (
                  <div className="pt-4 space-y-3 border-t border-pink-200">
                    {update.comments.map((comment) => (
                      <div key={comment.id} className="text-sm">
                        <div className="flex items-center gap-2 text-xs text-pink-500">
                          <span className="font-semibold text-pink-600">
                            {getParticipantName(comment.user_id, comment.role)}
                          </span>
                          <span>•</span>
                          <span>{formatDateTime(comment.created_at)}</span>
                          <span className="uppercase">
                            {comment.role === "sitter" ? "Sitter" : "Owner"}
                          </span>
                        </div>
                        <p className="px-4 py-2 mt-1 text-pink-600 bg-white shadow-sm rounded-xl">
                          {comment.message}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {(isOwner || isSitter) && (
                  <div className="flex flex-col gap-2 pt-4 border-t border-pink-200 sm:flex-row sm:items-center">
                    <input
                      value={commentDrafts[update.id] ?? ""}
                      onChange={(e) =>
                        setCommentDrafts((prev) => ({
                          ...prev,
                          [update.id]: e.target.value,
                        }))
                      }
                      placeholder="Leave a note or feedback"
                      className="flex-1 px-3 py-2 text-sm border border-pink-200 rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => handleSubmitComment(update.id)}
                      disabled={commentSubmittingId === update.id}
                      className="px-4 py-2 text-sm font-semibold text-white bg-pink-900 shadow-sm rounded-xl hover:bg-pink-800 disabled:bg-pink-400"
                    >
                      {commentSubmittingId === update.id ? "Sending..." : "Send"}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {showCareUpdateForm && (
          <div className="p-5 mt-4 space-y-4 bg-white border shadow-md rounded-2xl border-pink-50">
            <h3 className="text-base font-semibold text-pink-600">
              Share update with plant owner
            </h3>
            <textarea
              value={careNotes}
              onChange={(e) => setCareNotes(e.target.value)}
              placeholder="E.g. Watered fiddle leaf fig and misted pothos leaves."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-pink-200 rounded-xl"
            />
            {careChecklistDraft.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold tracking-wide text-pink-600 uppercase">
                  Required tasks today
                </p>
                <div className="flex flex-wrap gap-2">
                  {careChecklistDraft.map((task) => {
                    const active = selectedTasks.includes(task);
                    return (
                      <button
                        type="button"
                        key={task}
                        onClick={() => handleTaskToggle(task)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full border transition ${
                          active
                            ? "bg-pink-500 text-white border-pink-500 shadow"
                            : "border-pink-200 text-pink-600/80 hover:border-pink-300"
                        }`}
                      >
                        {task}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {CARE_ACTION_OPTIONS.map((action) => {
                const active = selectedActions.includes(action);
                return (
                  <button
                    type="button"
                    key={action}
                    onClick={() =>
                      setSelectedActions((prev) =>
                        active
                          ? prev.filter((value) => value !== action)
                          : [...prev, action]
                      )
                    }
                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition ${
                      active
                        ? "bg-white border-pink-400 text-pink-600"
                        : "border-pink-200 text-pink-600/70 hover:border-pink-300"
                    }`}
                  >
                    {action}
                  </button>
                );
              })}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-wide text-pink-600 uppercase">
                Attach progress photos
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoSelection}
                className="block w-full text-sm text-pink-600 file:mr-4 file:rounded-full file:border-0 file:bg-pink-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-pink-600"
              />
              {photoPreviews.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {photoPreviews.map((preview, idx) => (
                    <div
                      key={`${preview.file.name}-${idx}`}
                      className="relative w-20 h-20 overflow-hidden bg-white border border-pink-200 shadow rounded-xl"
                    >
                      <img
                        src={preview.url}
                        alt={preview.file.name}
                        className="object-cover w-full h-full"
                      />
                      <button
                        type="button"
                        onClick={() => removePhotoFile(idx)}
                        className="absolute right-1 top-1 rounded-full bg-white/80 px-2 py-0.5 text-xs text-pink-600 hover:bg-white"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={handleCareUpdate}
              disabled={isUploadingCareUpdate}
              className="px-4 py-2 text-sm font-semibold text-white bg-pink-500 rounded-xl hover:bg-pink-600 disabled:bg-pink-300"
            >
              {isUploadingCareUpdate ? "Uploading..." : "Share update"}
            </button>
          </div>
        )}
      </section>

      {shouldShowRating && (
        <section className="p-8 space-y-6 bg-white border shadow-lg rounded-3xl border-pink-50/50">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-pink-600">
              Rate this reservation
            </h2>
            <p className="text-sm text-pink-500">
              Share feedback once the visit is complete to help future bookings.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-[160px_1fr] items-start">
            <label className="text-sm font-medium text-pink-600">
              Rating (1-5)
            </label>
            <input
              type="number"
              min={1}
              max={5}
              value={ratingValue}
              onChange={(e) => setRatingValue(Number(e.target.value))}
              className="w-24 px-3 py-2 text-sm border border-pink-200 rounded-xl"
            />
            <label className="text-sm font-medium text-pink-600">
              Review (optional)
            </label>
            <textarea
              value={ratingReview}
              onChange={(e) => setRatingReview(e.target.value)}
              rows={3}
              placeholder="What went well? Anything we can improve?"
              className="px-3 py-2 text-sm border border-pink-200 rounded-xl"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRatingSubmit}
              className="px-4 py-2 text-sm font-semibold text-white transition-all bg-pink-500 shadow-md rounded-xl hover:bg-pink-600 hover:shadow-lg"
            >
              Submit rating
            </button>
            {ratingMessage && (
              <span className="text-sm text-pink-600">{ratingMessage}</span>
            )}
          </div>
        </section>
      )}

          <div className="flex justify-end">
            <button
              onClick={() => {
                // Navigate based on user role
                if (isSitter) {
                  navigate("/sitter/dashboard");
                } else {
                  navigate("/reservations");
                }
              }}
              className="text-sm font-medium text-pink-600 hover:text-pink-500"
            >
            Back to all reservations
          </button>
        </div>
      </div>
    </main>
  );
}
