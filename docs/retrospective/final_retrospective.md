# Final Retrospective
## Revisiting 
When we began this project, our goal was straightforward: create a plant care platform connecting people who needed plant care with trusted sitters in the community. We envisioned a two-sided platform where plant owners could search for sitters, book their services, communicate securely, make payments, and leave reviews. Looking back now with our platform deployed and serving real users, we've successfully delivered on our core vision—though the journey took unexpected turns that taught us invaluable lessons about software development.
## Delivered Features and Changes
**Core Features Successfully Delivered**   
Our platform delivers a complete end-to-end experience. Users authenticate securely through Gmail verification. Both plant owners and sitters can create comprehensive profiles.

The search and discovery system works exactly as envisioned. Plant owners search for sitters by ZIP code and availability dates, filter results by price range, plant type, and campus area, and view results sorted by weighted scores. Each sitter profile displays key information.

Our reservation system provides complete lifecycle management. Users can book sitters through an intuitive flow that requires Stripe payment confirmation before finalizing reservations. Both owners and sitters access detailed reservation pages showing booking information, and care history. Sitters can upload photos in reservation details page, allowing owners to monitor their plants remotely. After completion, owners rate and review sitters, with feedback appearing immediately on sitter dashboards.

Communication happens through our in-platform messaging interface, enabling direct real-time conversation between owners and sitters about care requirements and scheduling.

We pivoted to TF-IDF (Term Frequency-Inverse Document Frequency), a lightweight NLP technique that analyzes user bios and preferred plants types to identify semantically similar profiles. This solution successfully delivers recommendations in explore page.

**Changes**    
We implemented an authentication system using Gmail verification instead of JHU SSO.

We streamlined the reservation process to make it smoother and more intuitive.

We have not launched any advertising campaigns yet.

We revised our original “beyond CRUD” idea by developing an advanced recommendation system for matching users with each other, rather than exclusively with sitters. Since the sitter-search feature already includes extensive filters, we chose to implement a simpler weighted sitter recommendation instead.

## Challenges 
**Development Environment Inconsistencies**   
Team members experienced wildly different behaviors running identical code. Code that worked perfectly for one person failed completely for another. We addressed this systematically. We implemented virtual environments with pinned versions in requirements.txt, ensuring consistency. Finally, we established clear installation procedures.

**Frontend-Backend Integration Complexity**
As features grew more complex, integration challenges multiplied. Many mismatches caused frequent runtime errors that were difficult to debug since they only appeared during integration testing. We implemented several solutions. Regular synchronization meetings between frontend and backend teammates, catching discrepancies early. We created shared interface definitions as TypeScript types and Python Pydantic models, ensuring both sides agreed on data structures. We drafted comprehensive API documentation with example requests and responses for endpoints.

**Real-Time Chat Synchronization**    
The core technical challenge was maintaining synchronized message state between two users viewing the same conversation simultaneously. Finally, we implement WebSocket to ensure real-time messaging.

**Recommendation System Resource Constraints**
This challenge exemplifies the gap between local development and production deployment. Our Sentence-BERT implementation worked beautifully in local testing, generating semantically rich recommendations based on user bios and preferred plant types. Confidence was high as we prepared for deployment—until Render's free tier (512MB RAM) crashed with out-of-memory errors within seconds of loading the model. Rather than abandon the feature, we researched lightweight alternatives. We implemented TF-IDF, using only under 200MB of the memory. More importantly, it deployed successfully and performed well under production load.

**Data Architecture for Reviews**   
Midway through implementing our review system, we faced an architectural dilemma. Should reviews live in a separate collection or be embedded within reservation documents? Initially, we created a separate reviews collection accessed via dedicated API endpoints. However, this created complexity—displaying reviews on sitter dashboards required joining collections, and ensuring consistency between reservations and reviews became error-prone.

We analyzed the relationship using object-oriented principles. Reviews are inherently tied to reservations (aggregation relationship). A reservation has one optional review; a review cannot exist without a reservation. This insight led us to implement dual storage: reviews are created via a dedicated endpoint and stored in the reviews collection for flexibility, but also embedded within reservation documents. The reservation document serves as the primary source when displaying reviews, ensuring consistency and simplifying queries.

## Final Reflection
Looking back across five iterations, from our initial environment setup struggles to our deployed production platform, we recognize that our journey was messy, nonlinear, and filled with mistakes. That's exactly how software development works in reality.

The environment setup nightmare taught us the absolute necessity of standardization. The frontend-backend integration struggles taught us the value of clear communication and shared contracts. The Sentence-BERT crash taught us to design for production constraints from day one. The review storage confusion taught us to think carefully about data relationships. Each pivot in our recommendation system taught us that simpler solutions often win.

If we could return to Iteration 1 with all this knowledge, we would undoubtedly build the platform faster and more efficiently. But here's the crucial insight: we needed to make those mistakes to learn these lessons.

