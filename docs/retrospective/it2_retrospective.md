# Iteration 2 Retrospective:

## Overview

During iteration 2, our team focused on implementing key user-facing functionalities to make the Plant Sitter platform more practical and interactive for both plant owners and plant sitters. The main themes of this iteration were authentication and onboarding, sitter management, and recommendation and discovery.    

We made significant progress toward completing the core features that allow users to manage sitter profiles, and find suitable plant sitters efficiently.

## What We Delivered

In iteration 2, the team successfully completed the following:   
**Secure JHU Authentication:** Implemented registration and login using JHU emails (@jh.edu) and verification codes sent via email. This ensures only authenticated JHU members can access the platform.    

**Sitter Profile Management:** Added functionality for sitters to create and update their profiles, including personal details, pricing, and plant care preferences.   

**Sitter Availability:** Sitters can now set their available times for booking, allowing owners to schedule based on sitter availability.   

**Sitter Dashboard:** A dashboard for sitters was implemented to view their active and past reservations, earnings, and profile statistics.    

**Messaging Interface:** A basic communication interface was added, allowing sitters and owners to exchange messages within the platform.    

**Filtering and Sorting:** Plant owners can now filter sitters by area, price range, and plant type, and view sitters sorted by distance to find the most convenient matches.    

**Recommendation System:** Implemented an initial version of a sitter recommendation system. A GAN-based clustering approach was tested but later replaced with a more practical feature-weighted similarity scoring algorithm due to data limitations.    

## In Progress: 

**Advanced Recommendation Model:** The GAN-based community detection model for recommendation was not finalized due to insufficient data and limited improvement over simpler methods.

**Enhanced Messaging Features:** The current messaging system is functional but lacks message history persistence and notification integration.

**User Interface Polish:** Some frontend components (especially for filtering and dashboard visualization) still need UI/UX refinements to improve usability.

## Challenges We Ran Into:

**Data Limitations:** The small dataset made it difficult to train and evaluate complex machine learning models like GANs for recommendation.

**Integration Complexity:** Coordinating backend and frontend integration for authentication and dashboard features required additional debugging and communication effort.

**Time Constraints:** Some features took longer than expected due to dependency between modules (e.g., authentication before profile creation).

**UI Consistency:** Ensuring a consistent design across different components (sitters’ dashboard, owners’ filters, messaging) was time-consuming.

## Approach for Next Iteration:
**Refine Recommendation Engine:** Continue improving the feature-weighted model with additional data and feedback; possibly integrate collaborative filtering once sufficient data is collected.

**Improve Messaging System:** Add message persistence, notifications, and read/unread indicators for a smoother user experience.

**UI/UX Enhancements:** Focus on refining dashboards, filters, and general design consistency.

**Testing and Documentation:** Implement more thorough unit and integration tests, and maintain up-to-date API documentation.

**Performance Optimization:** Review database queries and optimize API endpoints to reduce load times and improve scalability.