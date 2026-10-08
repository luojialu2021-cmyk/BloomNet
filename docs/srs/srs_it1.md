# Software Requirements Specification
## JHU Plant Care Community Platform



## Problem Statement

Relaxation and well-being are often supported by pets or plants, both of which contribute positively to mental and physical health. However, compared to pets, plants are frequently overlooked despite their significant role in improving quality of life.  

At Johns Hopkins University (JHU), students, faculty, and staff often face challenges in maintaining their plants during extended absences such as academic breaks, conferences, research trips, or personal travel. Without a reliable support system, many plants are neglected, left to die, or discourage ownership altogether. This not only impacts individual well-being but also reduces the overall quality of life within the university community.  

Meanwhile, many JHU community members would be interested in either supplementing their income or contributing to the community by providing plant care services. The lack of a dedicated, secure platform within JHU prevents these needs from meeting effectively.

---

## Potential Clients

**Primary Users:**
- JHU students (undergraduate, graduate, PhD candidates) who own plants and need temporary care services  
- JHU faculty and staff who travel frequently for academic or professional purposes  
- JHU community members interested in offering plant care services for supplementary income  
- New JHU members seeking to build connections within the university ecosystem  

**Secondary Stakeholders:**
- JHU administration (potential partnerships and support)  
- Local plant shops and nurseries (collaborative business opportunities)  
- JHU residential life departments  

---
## Proposed Solution

The **JHU Plant Care Community Platform** will act as a secure, university-exclusive marketplace that connects plant owners with reliable caretakers within the Johns Hopkins community.  

**Key solution features:**
- A marketplace for posting and browsing plant care requests with detailed filters  
- Integrated chat and communication tools for secure arrangement discussions  
- Accountability through timestamped photo updates and care notes  
- A rating and review system to build trust among community members  
- Educational resources to support caretakers in providing proper plant care  
- A sustainable revenue model supported by tiered memberships, virtual currency, and targeted advertising  

---

## Functional Requirements

### Must Have

**Authentication & User Management**
- As a user, I want to register and log in exclusively through JHU SSO so that platform security and user verification are guaranteed.  
- As an admin, I want to ensure that only users with valid JHU email addresses can access the system so that community integrity is maintained.  
- As an admin, I want to manage user accounts, handle disputes, and monitor platform activity so that community standards are upheld.  

**Core Marketplace Functionality**
- As a user (sitter), I want to create a profile that lists my available neighborhoods, service radius, price per visit, and experience so that plant owners understand when and where I can help.  
- As a user (sitter), I want to toggle my availability status so that owners only contact me when I am accepting requests.  
- As a user (owner), I want to search for sitters by ZIP code, availability dates, plant type, and pricing so that I can find the best match for my plants.  
- As a user (owner), I want to view detailed sitter profiles—including specialties, service areas, ratings, and past reviews—so that I can book with confidence.  
- As a user (owner), I want to submit a reservation request with plant information, instructions, dates, and address so that the sitter receives everything needed to care for my plants.  
- As a user (owner or sitter), I want to review reservation status changes (pending, confirmed, in progress, completed, cancelled) so that both parties stay informed.  
- As a user, I want to communicate through an integrated chat system (future release) so that arrangements can be discussed privately and securely.  

**Care Tracking & Accountability**
- As a user (owner), I want to receive timestamped photo updates and care notes so that I can monitor my plants’ well-being remotely.  
- As a user (caretaker), I want to upload care evidence (photos, notes) with automatic timestamp verification so that I can demonstrate responsible and timely care.  
- As an admin, I want to enforce upload verification and restrict pre-taken photos so that fraudulent updates are minimized.  
- As a user (caretaker), I want to complete daily/weekly care check-ins using a predefined template (e.g., upload a real-time photo, mark “Watered/Not Watered,” add notes) so that owners receive transparent, real-time updates on their plants.  

**Rating & Trust System**
- As a user completing a transaction, I want to rate and review the other party after the service is complete so that future users can make informed decisions.  
- As a user, I want to view comprehensive ratings and reviews of other members so that I can build trust before collaborating.  

**Membership & Revenue System**
- As a user (owner), I want to set the service price freely when creating a care request so that I can determine the value of my plants’ care.  
- As a user (caretaker), I want to view the set price before applying or accepting a job so that I can evaluate if the opportunity fits my needs.  
- As a user, I want all payments to be processed securely through the integrated Stripe gateway so that transactions are safe and reliable.  
- As an admin, I want to create and manage targeted advertising campaigns (e.g., university clubs, local events, businesses) displayed in banners, sidebars, or feeds so that the platform can generate additional revenue while supporting the campus community.  

**Dynamic Availability Matching & Recommendation (Beyond CRUD)**  
- As a user, I want the system to dynamically suggest matches between plant owners and caretakers based on:  
  - **Plan:** availability windows and scheduling  
  - **Location:** geographic proximity within the JHU community  
  - **Personal Preferences:** plant types, care habits, and caretaker specialization  
  so that I can efficiently find the most relevant and reliable match.  


---

### Nice to Have

**Educational Integration**
- As a user (caretaker), I want access to plant care guides and species-specific instructions so that I can provide proper care even for unfamiliar plants.  
- As an admin, I want to maintain and update the plant care knowledge base so that all users have access to accurate, up-to-date information.  

**Advanced Matching & User Experience**
- As a user, I want the system to suggest potential matches based on location proximity, plant specialization, and historical ratings so that I can find caretakers/owners more efficiently.  
- As a user, I want to save preferred partners and create a favorites list so that repeat collaborations are streamlined.  
- As a user, I want to set my availability and care preferences so that the system can recommend the most relevant opportunities.  

**Community Features**
- As a user, I want to create and participate in forums or discussion groups so that I can share knowledge and connect with other plant enthusiasts in the JHU community.  
- As a user, I want to showcase my plant collection and past care achievements so that I can build credibility and reputation in the community.  

**Mobile Experience**
- As a user, I want to receive push notifications for new opportunities and messages so that I don’t miss time-sensitive updates.  
- As a user (caretaker), I want to upload care photos and notes directly from my mobile device so that documentation is fast and convenient.  

**Additional Smart Features**  
- As a user, I want **automatic reminders** for upcoming care tasks so that I don’t forget important responsibilities.  
- As a user, I want **calendar sync** (Google, Outlook, iCal) so that plant care tasks appear seamlessly in my personal schedule.  
- As an admin/caretaker, I want a **caretaker analytics dashboard** (e.g., care history, reliability metrics, ratings trends) so that performance and accountability can be tracked.  

---

## Non-functional Requirements

**Security**
- As a user, I want authentication to be handled through JHU SSO so that only verified members of the community can access the platform.  
- As a user, I want all my communications and personal data to be encrypted and stored securely so that my privacy and safety are protected.  
- As a user (owner), I want care photo uploads to include automatic timestamp verification so that I can be confident updates are authentic and not pre-taken.  

**Performance**
- As a user, I want the platform to support at least 500 active community members simultaneously so that the system remains usable even during peak demand periods (e.g., before academic breaks).  
- As a user (caretaker), I want my photo uploads to process quickly so that my updates are delivered without delay.  
- As a user, I want chat messages to be delivered within 2 seconds under normal conditions so that conversations feel real-time and efficient.  

**Usability**
- As a new user, I want the interface to be intuitive so that I can complete core tasks (e.g., creating a post, applying for a job) within 5 minutes of first-time use.  

**Reliability**
- As a user, I want the platform to remain stable and responsive during high-traffic periods so that I can rely on it to arrange or manage plant care without disruptions.  

---

## Software Architecture & Technology Stack

- **Application Type:** Web-based application  
- **Architecture:** Three-tier with microservices approach  
  - **Frontend:** React.js + TypeScript  
  - **Backend:** FastAPI (Python) for RESTful API  
  - **Database:** MongoDB & Redis
- **Authentication:** JHU SSO (SAML or OAuth 2.0)  
- **Real-time Communication:** socket.io-client and python-socketio for chat  
- **Payment Processing:** Stripe integration  

---

## Similar Apps

- **TaskRabbit:** General task marketplace, lacks community/education focus  
- **Rover:** Pet care marketplace with ratings/reviews, adapted here for plants with progress tracking  
- **Nextdoor:** Community-based, but lacks specialized plant care functions  
- **PlantNet / PlantIn:** Strong educational features but no marketplace/community integration  
- **Facebook Marketplace/Groups:** Generalized, less secure; lacks structured accountability and plant-specific features  

**Key Differentiators:**
- Exclusive JHU access with authentication ensuring trust and safety  
- Plant-specific features (species-based guidance, care tracking)  
- Structured accountability (timestamp-verified updates)  
- Community-building beyond transactions (forums, showcases)  

---
