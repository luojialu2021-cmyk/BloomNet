# Reservation Testing Guide

## Step 1: Sitter Starts Care Period

1. Log in as the sitter
2. Navigate to sitter dashboard (`/sitter/dashboard`)
3. Find the reservation in the list
4. Click on the reservation to view details
5. Click "Start care period" button
6. The reservation status changes to "in_progress"
7. The "Started" timestamp appears in the Status timeline section

## Step 2: Owner Completes Reservation

1. Log in as the owner
2. Navigate to reservations page (`/reservations`)
3. Find the reservation that has been started by the sitter
4. Click on the reservation to view details
5. The Status timeline shows "Created", "Started" (with timestamp), and "Completed" (shows "—")
6. Click "Mark as complete" button
   - Note: This button is only visible to the owner, not the sitter
7. The reservation status changes to "completed"
8. The "Completed" timestamp appears in the Status timeline section

## Step 3: Owner Rates and Reviews

1. After completing the reservation, scroll to the bottom of the reservation detail page
2. The "Rate this reservation" section appears
3. Select a rating (1-5 stars)
4. Optionally enter a review text
5. Click "Submit review" button
6. The rating and review are saved and displayed

## Step 4: Rate from Reservations List

1. Navigate back to the reservations list page (`/reservations`)
2. Find the completed reservation
3. Click "View details" to open the reservation detail page
4. Scroll to the bottom to find the rating section
5. Submit rating and review if not already done
6. The rating and review are displayed in the reservation details

## Important Notes

- Only the sitter can start a reservation
- Only the owner can complete a reservation
- The "Mark as complete" button is not visible to the sitter
- The rating section is only visible to the owner after the reservation is completed
- Ratings can be submitted from both the reservation detail page and the reservations list page

