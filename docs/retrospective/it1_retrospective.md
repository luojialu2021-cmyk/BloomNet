# Iteration 1 Retrospective:

## What We Delivered

For Iteration 1, we focused on implementing the core functionalities. Our primary accomplishnent was making sure the search for plant sitters worked end-to-end, both on the frontend and backend. Specifically, users can:

    - Search sitters by ZIP code and availability dates (duration)

    - View sitter profiles with relevant info (e.g. service area, ratings, pricing, etc.)

Backend-wise, we got most of the API routes done early—including CRUD for listings and sample data endpoints—which helped us test quickly. We also programed Book sitters through a reservation flow with backend API integration and the ability to view booking status (pending, confirmed, completed) per user role. Finally, we got Stripe and JHU SSO set up on the backend, even though they’re not integrated in the UI yet. 

## In Progress: 

Some of the UI components for plant care listings and advanced filtering haven't been implemented yet. While the backend is ready for care listing CRUD, the frontend pages for posting and managing listings still need work. Similarly, the advanced filter options (like price range, plant type, and campus area) are wired on the backend but not yet visible in the UI.

## Challenges We Ran Into:

Python & Pydantic version issues - Our frontend team hit errors trying to run the backend, since the version of Python we had locally was too high and didn’t match the expected Pydantic behavior. We eventually solved it by creating a virtual environment with a lower Python version, but it caused some delay and confusion.

MongoDB setup confusion - The backend assumed MongoDB was already running, but some frontend members hadn’t installed it yet. We’ll probably want to clarify install/setup steps better in our docs for the next iteration.

Auto-generated IDs & duplicates - There were issues with MongoDB creating IDs we didn’t expect, and we noticed duplicated data (e.g. sitter listings repeating). We fixed this by adjusting how sample data was seeded and managed, but it was tricky at first since it behaved differently on different people’s machines.

Inconsistent behavior across machines - Sometimes code worked perfectly for one person and not at all for someone else. Usually it came down to mismatched dependencies, missing local setup (e.g. MongoDB not running), or environment variables.

ID mismatches between frontend/backend - There was some confusion around variable names and structure, which caused errors when frontend sent data to the backend or vice versa. We ended up fixing it, but it’s something we’ll need to keep an eye on as our models get more complex.

## Approach for Next Iteration:

Clearer setup instructions - We want to make sure everyone has the same local environment and that setup is beginner-proof. That includes calling out version dependencies, MongoDB installation, and how to seed/test data cleanly.

Frontend-backend coordination - We'll spend more time upfront aligning the data structure and expected response formats. Maybe even draft some shared interface definitions or test JSONs to keep things clean.

Better feature ownership - We’ll assign specific features to individuals or pairs so we can work in parallel without stepping on each other’s toes or duplicating work.

More consistent testing across devices - Now that we’ve seen how different machines can behave, we’ll add better debug logs or shared Postman test cases so everyone’s looking at the same expected behavior.