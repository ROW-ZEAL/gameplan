# GamePlanR - Module Pseudocode (SHORT VERSION)

## 1. AUTHENTICATION SYSTEM

**Register:**
```
CREATE user with hashed password
GENERATE access_token & refresh_token  
SAVE tokens to user record
RETURN user + tokens
CLIENT stores in localStorage
```

**Login:**
```
VERIFY email & password
IF invalid → THROW error
GENERATE new tokens
UPDATE user with tokens
RETURN user + tokens
CLIENT stores tokens & redirect to dashboard
```

**Logout:**
```
BLACKLIST refresh_token
UPDATE user: is_revoked = true, tokens = null
CLIENT remove localStorage items & redirect
```

**Refresh Token:**
```
VALIDATE token (check blacklist)
GENERATE new access_token
RETURN new_access_token
CLIENT update localStorage & axios header
```

**Get/Update Profile:**
```
VALIDATE user authenticated
FETCH/UPDATE user details
RETURN user profile
```

---

## 2. VENUE MANAGEMENT

**List Venues:**
```
QUERY active venues
APPLY filters: sport_category, city, search
FETCH images, ratings, rating_count
RETURN venues with pagination
```

**Venue Detail:**
```
FETCH venue BY id
FETCH related: sport_category, images, facilities, time_slots, ratings
CALCULATE average_rating & rating_count
RETURN full venue details
```

**Search Venues:**
```
FILTER venues BY sport_category OR city OR search_keyword
RETURN filtered list
```

**Rate Venue:**
```
VALIDATE rating 1-5
CHECK user has booking for this venue
CREATE/UPDATE VenueRating record
RECALCULATE average_rating
RETURN updated rating stats
```

---

## 3. MULTI-SLOT BOOKING SYSTEM

**Get Available Slots:**
```
VALIDATE booking_date not in past
FETCH all active time_slots for venue
FETCH booked slots (from BOTH time_slot FK & time_slots ManyToMany)
EXCLUDE booked slots
IF date == today: EXCLUDE slots where end_time <= current_time
RETURN available slots sorted by start_time
```

**Select Multiple Slots:**
```
TOGGLE slot: ADD or REMOVE from selectedTimeSlots
CALCULATE total_hours = SUM(duration for each selected slot)
total_amount = total_hours * venue.price_per_hour
UPDATE display: show count & amount
ENABLE/DISABLE confirm button based on selection
```

**Validate Multi-Slot:**
```
VALIDATE venue active
VALIDATE at least 1 slot selected
VALIDATE all slots active & belong to venue
IF date == today: CHECK slots not past
CHECK no conflicts with existing bookings
RETURN true or THROW error
```

**Calculate Total Amount:**
```
total_duration = SUM(slot.duration_hours for all selected slots)
total_amount = total_duration * venue.price_per_hour
RETURN total_amount (rounded to 2 decimals)
```

**Display Time Range:**
```
GET earliest start_time & latest end_time from all slots
FORMAT as "6:00 AM - 10:00 AM"
RETURN formatted range
```

---

## 4. BOOKING SYSTEM

**Create Booking:**
```
VALIDATE user authenticated
VALIDATE using validateMultiSlotBooking()
CALCULATE total_amount
CREATE booking: status=PENDING, payment_status=UNPAID
SET time_slot = slots[0] (for FK backward compatibility)
ADD all slots to time_slots ManyToMany
CREATE Notification: BOOKING_CREATED
RETURN booking
```

**List Bookings:**
```
FETCH all bookings WHERE user_id = user.id
SORT BY booking_date DESC
FOR EACH: fetch venue, time_slots, payment, calculate time_range
RETURN list with pagination
```

**Get Booking Detail:**
```
FETCH booking BY id WHERE user_id = user.id
FETCH related: venue, time_slots, payment, status
CALCULATE is_cancellable
RETURN full booking details
```

**Cancel Booking:**
```
VALIDATE booking is cancellable
VALIDATE booking_date >= today
UPDATE status = CANCELLED
IF paid: process refund
CREATE Notification: BOOKING_CANCELLED
RETURN updated booking
```

**Booking Status Workflow:**
```
PENDING → CONFIRMED (on payment) → COMPLETED (after booking_date)
OR at any stage → CANCELLED (user action)
```

---

## 5. PAYMENT SYSTEM

**Pay at Venue:**
```
VALIDATE booking exists & not cancelled
CREATE Payment: method=PAY_AT_VENUE, status=PENDING
GENERATE transaction_id
CREATE Notification with transaction_id
RETURN payment details
```

**eSewa Initiation:**
```
PREPARE form parameters:
  - product_code, total_amount, transaction_uuid
GENERATE signature = HMAC_SHA256(
  message="total_amount={amount},...",
  secret=ESEWA_SECRET_KEY
)
RETURN eSewa form data with signature
```

**Verify eSewa Payment:**
```
DECODE encoded_data
VERIFY signature using HMAC_SHA256
IF invalid → THROW error
IF status != COMPLETE → THROW error
EXTRACT booking_id from transaction_uuid
CREATE Payment: method=ESEWA, status=SUCCESS
UPDATE booking: payment_status=PAID, status=CONFIRMED
CREATE Notification: PAYMENT_SUCCESS
REDIRECT to /esewa/success
```

**Handle Payment Failure:**
```
LOG failure
REDIRECT to /esewa/failure
BOOKING remains PENDING (no Payment record created)
USER can retry or pay at venue
```

---

## 6. NOTIFICATION SYSTEM

**Create Notification:**
```
VALIDATE notification_type in ALLOWED_TYPES:
  - BOOKING_CREATED, BOOKING_CONFIRMED, BOOKING_CANCELLED
  - PAYMENT_SUCCESS, PAYMENT_FAILED, BOOKING_COMPLETED
  - OPPONENT_REQUEST_RECEIVED
CREATE Notification: is_read=false, timestamp=NOW()
RETURN notification
```

**List Notifications:**
```
FETCH all notifications WHERE user_id = user.id
SORT BY created_at DESC
RETURN with pagination
```

**Mark as Read:**
```
FETCH notification BY id WHERE user_id = user.id
UPDATE: is_read=true, read_at=NOW()
RETURN updated notification
```

**Mark All as Read:**
```
UPDATE all WHERE user_id=user.id AND is_read=false
SET is_read=true, read_at=NOW()
RETURN count of updated
```

**Notification Events:**
```
BOOKING_CREATED: "Booking {ref} for {venue} pending"
BOOKING_CONFIRMED: "Booking {ref} confirmed"
BOOKING_CANCELLED: "Booking {ref} cancelled"
PAYMENT_SUCCESS: "Payment received for {ref}"
PAYMENT_FAILED: "Payment failed. Retry or contact support"
BOOKING_COMPLETED: "Booking complete. Rate the venue"
OPPONENT_REQUEST_RECEIVED: "Someone wants to join booking"
```

---

## KEY VALIDATIONS

| Module | Validations |
|--------|------------|
| **Auth** | Email unique, password match, JWT valid, token not blacklisted |
| **Venue** | Venue active, rating 1-5, valid image format |
| **Multi-Slot** | Date not past, slots active & for same venue, no conflicts, not past (today) |
| **Booking** | User authenticated, status valid, date not past, slots available |
| **Payment** | Booking exists, status pending, eSewa signature valid, one payment per booking |
| **Notification** | User exists, type valid, user owns notification |
