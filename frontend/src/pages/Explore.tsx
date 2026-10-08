import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, MessageCircle } from "lucide-react";
import { useOwnerAuth } from "../contexts/AuthContext";
import { authService } from "../api/services";
import type { User, SitterProfile } from "../api/types";

interface SimilarUser {
  id: string;
  full_name: string;
  profile_image?: string;
  preferred_plant_types: string[];
  bio?: string;
  email?: string;
  is_sitter?: boolean;
  sitter_id?: string;
}

export default function Explore() {
  const navigate = useNavigate();
  const { user: ownerUser, token: ownerToken, isAuthenticated } = useOwnerAuth();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [similarUsers, setSimilarUsers] = useState<SimilarUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<SimilarUser | null>(null);
  const [loadingMessage, setLoadingMessage] = useState(false);

  useEffect(() => {
    const loadUserProfile = async () => {
      if (!ownerToken || !isAuthenticated) {
        setLoading(false);
        return;
      }

      try {
        // Get current user's full profile
        const response = await authService.getCurrentUser();
        if (response.data) {
          console.log("Current user data:", response.data); // Debug log

          // Use name from AuthContext as fallback if full_name is missing or is "test user"
          const userData = response.data;
          if (!userData.full_name || userData.full_name.toLowerCase().includes('test')) {
            userData.full_name = ownerUser?.name || ownerUser?.full_name || userData.email || "User";
          }

          setCurrentUser(userData);

          // Fetch users (plant owners) with similar interests
          try {
            const usersResponse = await authService.getUsersWithSimilarInterests(userData.id);
            const recs = usersResponse.data?.recommendations || [];
            const similarUsersList = recs
              .filter(user => user.id !== userData.id)
              .map(user => ({
                id: user.id,
                full_name: user.full_name || user.email || "User",
                profile_image: user.profile_image,
                preferred_plant_types: user.preferred_plant_types || [],
                bio: user.bio,
                email: user.email,
                is_sitter: false,
                score: user.score,   // similarity
            }));
            setSimilarUsers(similarUsersList);

           /*if (usersResponse.data && Array.isArray(usersResponse.data)) {
              const similarUsersList = usersResponse.data
                .filter((user) => {
                  // Double-check to exclude current user
                  // Normalize ID: handle both id and _id fields (API might return _id)
                  const userAny = user as any;
                  const userId = String(user.id || userAny._id || '');
                  const currentUserAny = userData as any;
                  const currentUserId = String(userData.id || currentUserAny._id || '');
                  return userId !== currentUserId;
                })
                .map((user): SimilarUser => {
                  // Ensure ID is properly set (handle both id and _id from API)
                  const userAny = user as any;
                  const userId = String(user.id || userAny._id || '');
                  console.log('[Explore] Processing user:', { id: userId, name: user.full_name, hasId: !!user.id, has_id: !!userAny._id });
                  return {
                    id: userId,
                    full_name: user.full_name || user.email || "User",
                    profile_image: user.profile_image,
                    preferred_plant_types: user.preferred_plant_types || [],
                    bio: user.bio,
                    email: user.email,
                    is_sitter: false,
                  };
                });

              console.log('[Explore] Similar users list:', similarUsersList.map(u => ({ id: u.id, name: u.full_name })));
              setSimilarUsers(similarUsersList);
            } else {
              setSimilarUsers([]);
            }*/
          } catch (error) {
            console.error("Error fetching similar users:", error);
            setSimilarUsers([]);
          }
        }
      } catch (error) {
        console.error("Error loading user profile:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, [ownerToken, isAuthenticated, ownerUser]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-white to-pink-200">
        <div className="max-w-6xl px-4 py-10 mx-auto">
          <div className="p-8 space-y-6 bg-white border shadow-lg rounded-3xl border-pink-50/50">
            <p className="text-sm text-pink-500">Loading...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!currentUser) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-white to-pink-200">
        <div className="max-w-6xl px-4 py-10 mx-auto">
          <div className="p-8 space-y-6 bg-white border shadow-lg rounded-3xl border-pink-50/50">
            <p className="text-sm text-pink-500">Please sign in to explore.</p>
          </div>
        </div>
      </main>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleUserClick = (user: SimilarUser) => {
    setSelectedUser(user);
  };

  const handleCloseModal = () => {
    setSelectedUser(null);
  };

  const handleMessage = async () => {
    if (!selectedUser || !ownerUser) {
      console.log('[Explore] Cannot message: missing selectedUser or ownerUser', { selectedUser: !!selectedUser, ownerUser: !!ownerUser });
      return;
    }

    console.log('[Explore] Message button clicked for user:', {
      targetUserId: selectedUser.id,
      targetUserName: selectedUser.full_name,
      ownerUserId: ownerUser?.user_id
    });

    setLoadingMessage(true);
    try {
      // For regular users (plant owners), navigate to dashboard messages
      // The dashboard will handle creating/finding the conversation
      const navState = {
        openMessages: true,
        targetUserId: selectedUser.id,
        targetUserName: selectedUser.full_name
      };
      console.log('[Explore] Navigating to dashboard with state:', navState);
      navigate('/dashboard', { state: navState });
    } catch (error) {
      console.error("[Explore] Error starting conversation:", error);
    } finally {
      setLoadingMessage(false);
      setSelectedUser(null);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-pink-200">
      <div className="max-w-6xl px-4 py-10 mx-auto space-y-6">
        {/* User's Own Profile */}
        <div className="p-6 space-y-4 bg-white border shadow-lg rounded-3xl border-pink-50/50">
          <div className="flex items-center gap-4">
            {currentUser.profile_image ? (
              <img
                src={currentUser.profile_image}
                alt={currentUser.full_name}
                className="w-20 h-20 rounded-full object-cover border-2 border-pink-200"
              />
            ) : (
              <div className="flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 text-white text-2xl font-semibold border-2 border-pink-200">
                {getInitials(currentUser.full_name || currentUser.email || "User")}
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-2xl font-normal text-black">
                {currentUser.full_name || currentUser.email || "User"}
              </h2>
              {currentUser.bio && (
                <p className="mt-1 text-sm text-pink-600">{currentUser.bio}</p>
              )}
            </div>
          </div>

          {currentUser.preferred_plant_types && currentUser.preferred_plant_types.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-pink-500 uppercase tracking-wide">
                Your Interests
              </h3>
              <div className="flex flex-wrap gap-2">
                {currentUser.preferred_plant_types.map((type) => (
                  <span
                    key={type}
                    className="px-3 py-1.5 text-sm font-medium rounded-full bg-pink-100 text-pink-700 border border-pink-200"
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Similar Users Section */}
        <div className="space-y-4">
          <div className="px-2">
            <h2 className="text-xl font-normal text-black">
              People with Similar Interests
            </h2>
            <p className="text-sm text-pink-500">
              Discover plant enthusiasts who share your interests
            </p>
          </div>

          {similarUsers.length === 0 ? (
            <div className="p-8 text-center bg-white border rounded-2xl border-pink-50 shadow-md">
              <p className="text-sm text-pink-500">
                No users with similar interests found. Check back later!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-4 px-2" style={{ minWidth: "max-content" }}>
                {similarUsers.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleUserClick(user)}
                  className="flex-shrink-0 w-64 p-4 space-y-3 bg-white border rounded-2xl border-pink-50 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    {user.profile_image ? (
                      <img
                        src={user.profile_image}
                        alt={user.full_name}
                        className="w-14 h-14 rounded-full object-cover border border-pink-200"
                      />
                    ) : (
                      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 text-white text-lg font-semibold border border-pink-200">
                        {getInitials(user.full_name)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-medium text-black truncate">
                        {user.full_name}
                      </h3>
                      {user.bio && (
                        <p className="text-xs text-pink-600 truncate">{user.bio}</p>
                      )}
                    </div>
                  </div>

                  {user.preferred_plant_types && user.preferred_plant_types.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {user.preferred_plant_types.map((type) => (
                        <span
                          key={type}
                          className="px-2 py-0.5 text-xs font-medium rounded-full bg-pink-50 text-pink-600 border border-pink-200"
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={handleCloseModal}
        >
          <div
            className="relative w-full max-w-md p-6 space-y-6 bg-white rounded-3xl shadow-2xl border border-pink-50 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleCloseModal}
              className="absolute right-4 top-4 p-2 text-gray-400 rounded-full hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4">
              {selectedUser.profile_image ? (
                <img
                  src={selectedUser.profile_image}
                  alt={selectedUser.full_name}
                  className="w-24 h-24 rounded-full object-cover border-2 border-pink-200"
                />
              ) : (
                <div className="flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 text-white text-3xl font-semibold border-2 border-pink-200">
                  {getInitials(selectedUser.full_name)}
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-2xl font-normal text-black">
                  {selectedUser.full_name}
                </h2>
                {selectedUser.email && (
                  <p className="mt-1 text-sm text-pink-600">{selectedUser.email}</p>
                )}
                {selectedUser.is_sitter && (
                  <span className="inline-block mt-2 px-2 py-1 text-xs font-semibold text-pink-700 bg-pink-100 rounded-full border border-pink-200">
                    Sitter
                  </span>
                )}
              </div>
            </div>

            {selectedUser.bio && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-pink-500 uppercase tracking-wide">
                  About
                </h3>
                <p className="text-sm text-black leading-relaxed">{selectedUser.bio}</p>
              </div>
            )}

            {selectedUser.preferred_plant_types && selectedUser.preferred_plant_types.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-pink-500 uppercase tracking-wide">
                  Interests
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedUser.preferred_plant_types.map((type) => (
                    <span
                      key={type}
                      className="px-3 py-1.5 text-sm font-medium rounded-full bg-pink-100 text-pink-700 border border-pink-200"
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-pink-100">
              <button
                onClick={handleMessage}
                disabled={loadingMessage}
                className="flex items-center justify-center gap-2 flex-1 px-4 py-3 text-sm font-semibold text-white bg-pink-500 rounded-xl shadow-md hover:bg-pink-600 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MessageCircle className="w-4 h-4" />
                {loadingMessage ? "Loading..." : "Message"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
