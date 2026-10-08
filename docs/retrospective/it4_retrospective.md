# **Iteration 4 Retrospective**

## **Overview**

During Iteration 4, our team focused on completing the payment workflow, finalizing the review system, deploying the alpha version to production, and addressing critical bugs and UI improvements. This iteration marked a significant milestone as we transitioned from development to deployment, making the platform accessible to real users on the Render platform.

The main achievements included implementing Stripe payment integration before reservation confirmation, completing the review system where owners can rate and review sitters with real-time updates displayed on sitter dashboards, and successfully deploying both frontend and backend services to a production environment. Additionally, we addressed numerous frontend UI/UX issues and backend validation problems to improve overall system reliability and user experience.

---

## **What We Delivered**

### **1. Payment Workflow with Stripe Integration**

* Implemented secure payment processing before booking confirmation using Stripe payment gateway.
* Connected `POST /api/v1/payments/` endpoint to create payment intents for reservations.
* Integrated `POST /api/v1/payments/pay` endpoint to process payments using Stripe PaymentIntent API.
* Added payment section on booking page that displays before final reservation confirmation.
* Integrated payment failure handling with clear error messages to users.
* Ensured booking is only successful upon successful payment completion.
* Result: a secure, end-to-end payment flow that prevents incomplete transactions.

### **2. Review System - Complete Integration**

#### **2.1 Owner Review Submission Workflow**

* Integrated review submission in frontend user portal for completed reservations.
* Connected `POST /api/v1/reviews/` endpoint to create review documents in MongoDB.
* Implemented ReviewModel component with proper API calls and success/error state handling.
* Added automatic reservation list refresh after successful review submission.
* Result: owners can seamlessly submit reviews that persist in the database.

#### **2.2 Sitter Dashboard Review Updates**

* Integrated backend review submission endpoint with sitter dashboard.
* Implemented "Reviews" tab displaying owner name, rating, and review text.
* Added dashboard refresh mechanism to show new reviews when data is updated.
* Ensured proper error handling for failed API calls.
* Result: sitters receive real-time updates and can view all reviews in their dashboard.

### **3. Alpha Version Deployment**

* Successfully deployed frontend and backend services to Render platform.
* Configured production environment with MongoDB Atlas shared database.
* Enabled data synchronization across all environments.
* Result: platform is now accessible in production, ready for alpha testing.

### **4. Frontend Bug Fixes & UI Optimization**

#### **4.1 Status Management**

* Removed "pending" status across platforms for clearer status flow.

#### **4.2 Code Cleanup**

* Removed testing/demo components and updated codebase to reflect deployment-ready state.

#### **4.3 Reservation Details UI Enhancement**

* Redesigned reservation details page for improved user experience and clarity.

#### **4.4 Pricing Input Fields**

* Updated all pricing inputs (Per Visit, Per Day, Per Week) to behave as controlled React inputs.
* Implemented proper increment/decrement behavior with arrow keys (step="1").
* Added validation to disallow negative values and non-numeric characters.
* Fixed leading zero handling (e.g., "033" becomes "33").
* Allowed empty input state for better UX.
* Switched to `type="text"` with `inputMode="numeric"` for better mobile support.
* Added placeholder "0" for consistency.

#### **4.5 Value Handling and Validation**

* Modified `handleChange()` logic to sanitize user input.
* Ensured no negative values, non-numeric input, or leading zeros.
* Preserved empty strings as valid input state.

#### **4.6 TypeScript Fixes**

* Fixed TypeScript errors (TS2367) caused by comparing number and string values in form fields.
* Updated form model definition to allow both types, aligning with React's controlled input pattern.

#### **4.7 Date Field Defaults**

* Start Date automatically initializes with today's date.
* End Date remains empty by default until user selection.

#### **4.8 Status Timeline Enhancement**

* Added "Confirm Completed" button logic that sets completed timestamp to current time.
* Implemented dynamic button color change (purple → pink) after confirmation.
* Displays formatted timestamp (MMM D, h:mm A using dayjs) immediately in Completed box.

### **5. Backend Bug Fixes**

#### **5.1 Zipcode Validation**

* Fixed invalid zipcode format validation during user registration.
* Implemented proper validation for 5-digit US zipcodes and 9-digit zip+4 formats.
* Result: improved data integrity for location-based features.

---

## **In Progress**

* **Recommendation Engine** – ongoing development to refine sitter–owner matching algorithm.
* **Performance Optimization** – continuous monitoring and optimization of production deployment.

---

## **Challenges We Ran Into**

1. **Stripe Version Compatibility**

   * Encountered code conflicts due to Stripe library version mismatches between dependencies.
   * Required careful dependency management and version alignment to resolve integration issues.

2. **Review Data Schema Design**

   * Initially designed reviews as a separate collection, which increased data and interface complexity.
   * Realized that reviews are strongly bound to reservations (aggregation relationship).
   * Implemented dual storage approach: reviews are stored both in the separate reviews collection (via `POST /api/v1/reviews/`) and embedded within reservation schema (via `POST /api/v1/reservations/{id}/rate`).
   * Sitter dashboard reads reviews from reservation schema (`owner_rating`, `owner_review` fields) as the primary source, applying OOP principles:
     * **Aggregation Principle**: Reviews are part of reservations, sharing the same lifecycle.
     * **Data Consistency**: Reservation document serves as the primary source for review display.
   * This approach maintains backward compatibility while simplifying the primary data access pattern.

3. **Frontend–Backend Schema Alignment**

   * Mismatch between frontend and backend review data structures required careful synchronization.
   * Needed to ensure both sides agreed on the same data model after schema refactoring.

4. **Production Deployment Configuration**

   * Configuring environment variables and database connections for Render platform required careful setup.
   * Ensuring MongoDB Atlas connectivity and proper CORS settings for production environment.

---

## **Approach for Next Iteration**

1. **Beta Release Preparation**

   * Conduct comprehensive testing in production environment.
   * Gather user feedback from alpha testing phase.
   * Address critical bugs and performance issues.

2. **Recommendation Engine Implementation**

   * Implement intelligent sitter–owner matching algorithm.
   * Incorporate sitter ratings, completed jobs, and plant type compatibility.
   * Enhance search results with personalized recommendations.

3. **Performance & Scalability**

   * Optimize database queries for faster response times.
   * Implement caching strategies for frequently accessed data.
   * Monitor and improve API response times.

4. **Enhanced User Experience**

   * Continue refining UI/UX based on user feedback.
   * Add more intuitive error messages and user guidance.
   * Improve mobile responsiveness.

---

## **Conclusion**

Iteration 4 marked a critical transition from development to production. We successfully deployed the alpha version, completed essential features like payment and reviews, and significantly improved the platform's reliability through bug fixes and UI optimizations. The architectural decision to embed reviews within reservations simplified our data model and improved consistency. As we move toward beta release, our focus will shift to recommendation features, performance optimization, and incorporating real user feedback to create a more polished and intelligent platform.

---

