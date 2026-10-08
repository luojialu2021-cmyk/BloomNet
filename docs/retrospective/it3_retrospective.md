# **Iteration 3 Retrospective**

## **Overview**

During Iteration 3, our team focused on completing the reservation management flow — from viewing all reservations to accessing detailed pages and enabling sitter–owner interaction. The iteration also introduced major UI and backend integrations to make the booking, feedback, and care processes seamless across both user roles.

The main frontend work included developing the `/reservations` and `/reservations/:reservation_id/detail` pages, improving the sitter dashboard, refining the global navigation, and finalizing the rating and review flow. Backend integration ensured that all updates persisted properly in the MongoDB database and that sitter and owner views stayed synchronized.

---

## **What We Delivered**

### **1. Reservation Summary Page (`/reservations`)**

* Simplified status filtering to **All / Active / Finished**, improving clarity.
* Added actionable buttons: **Cancel Reservation**, **Rate Sitter**, and **View Details**.
* Fully integrated frontend with backend APIs for fetching, updating, and persisting reservation data.
* Improved state management with React hooks to handle loading and updates efficiently.
* Result: a clean, intuitive interface for managing bookings.

### **2. Reservation Detail Page (`/reservations/:reservation_id/detail`)**

* Built a comprehensive detail view showing owner/sitter info, booking details, payment summary, and care history.
* Enabled full backend synchronization — all updates stored and fetched from MongoDB.
* Added editable **Daily Care Checklist** and image upload features with live preview and Base64 conversion.
* Implemented interactive status actions (cancel, complete payment) with visual progress tracking.
* Result: a complete end-to-end flow between sitter and owner roles.

### **3. Navigation System (Header & SitterAppHeader)**

* Refined global top navigation for both roles.
* Implemented conditional **Sign In** rendering and **Profile dropdowns** for owners/sitters.
* Unified redirect logic for consistent navigation behavior.
* Result: a more polished and reliable authentication and navigation experience.

### **4. Sitter Dashboard (`/sitter/dashboard`)**

* Implemented dashboard displaying sitter-specific reservations, upcoming bookings, and statistics.
* Developed filtering and sorting logic to distinguish between active, upcoming, and completed reservations.
* Added navigation to sitter detail pages via `?as=sitter` query parameter.
* Result: a dynamic, data-driven control center for sitters.

### **5. Sitter Reservation Detail Enhancements**

* Unified route and data-loading pipeline for sitter and owner access.
* Implemented sitter-specific task handling and care updates.
* Integrated comment thread and real-time collaboration for sitter–owner communication.
* Result: a smooth and interactive sitter workflow with clear feedback and data refresh cycles.

### **6. Review & Rating Functionality**

* Added post-completion rating modal integrated into the reservation summary flow.

---

## **In Progress**

* **Sitter Dashboard Optimization** – refining layout, improving responsiveness, and adding richer data visualization.
* **Cloud Database Stability** – enhancing backend performance for faster reservation and image data retrieval.
* **Chat Functionality Synchronization** – ongoing refinement of message synchronization between owner and sitter.

---

## **Challenges We Ran Into**

1. **Frontend–Backend Integration**

   * Handling multiple asynchronous API calls and ensuring consistent data states across views required careful refactoring.

2. **Google Authentication (OAuth)**

   * Managing token validation and role-based redirects was complex, especially when handling multiple login types (sitter vs. owner).

3. **Role Differentiation (Sitter vs. Owner)**

   * Ensuring proper data access and UI rendering logic for two user types added extra layers of conditional logic.

4. **Care Updates & Image Uploads**

   * Implementing reliable Base64 encoding and large file uploads caused performance issues, requiring optimization.

5. **Chat Synchronization**

   * Maintaining real-time message state between users proved difficult without a dedicated socket-based backend.

---

## **Approach for Next Iteration**

1. **Chat System Optimization**

   * Implement WebSocket or Firebase-based real-time messaging.
   * Add typing indicators and read receipts for better interaction feedback.

2. **Recommendation Engine Improvements**

   * Refine sitter–owner matching by incorporating sitter ratings, completed jobs, and plant type compatibility.

3. **Enhanced Sitter Profile Page**

   * Expand sitter profile.

4. **Backend Performance & Security**

   * Optimize MongoDB queries and enhance user data validation for reliability and safety.

---

## **Conclusion**

Iteration 3 marked a significant milestone — the reservation system and sitter interaction features reached near completion. The product is now functionally cohesive, and the next iteration will focus on polishing the experience, improving reliability, and adding intelligent features like chat and recommendations to elevate overall usability and engagement.

---
