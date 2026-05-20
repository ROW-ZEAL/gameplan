# =============================================================================
# SPORTS VENUE BOOKING PLATFORM — Django Models
# =============================================================================
# App structure:
#   apps/common/        → BaseModel, shared validators
#   apps/accounts/      → User
#   apps/venues/        → SportCategory, Venue, VenueImage, Facility, TimeSlot
#   apps/bookings/      → Booking
#   apps/payments/      → Payment
#   apps/opponents/     → OpponentRequest, OpponentMatch
#   apps/notifications/ → Notification
# =============================================================================

import uuid
from decimal import Decimal

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, RegexValidator
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _



class BaseModel(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True



class UserManager(BaseUserManager):

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError(_("The Email field must be set."))
        email = self.normalize_email(email)
        extra_fields.setdefault("is_active", True)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.SUPER_ADMIN)
        extra_fields.setdefault("is_verified", True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin, BaseModel):

    class Role(models.TextChoices):
        USER        = "USER",        _("User")
        VENUE_ADMIN = "VENUE_ADMIN", _("Venue Admin")
        SUPER_ADMIN = "SUPER_ADMIN", _("Super Admin")

    full_name = models.CharField(max_length=255)
    email = models.EmailField(unique=True, db_index=True)
    phone_number = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        validators=[
            RegexValidator(
                regex=r"^\+?1?\d{9,15}$",
                message=_("Enter a valid phone number (e.g. +12125552368)."),
            )
        ],
    )
    profile_image = models.ImageField(
        upload_to="profiles/",
        blank=True,
        null=True,
    )
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.USER,
        db_index=True,
    )
    is_verified = models.BooleanField(default=False)
    is_active   = models.BooleanField(default=True)
    is_staff    = models.BooleanField(default=False)

    objects = UserManager()

    USERNAME_FIELD  = "email"
    REQUIRED_FIELDS = ["full_name"]

    class Meta:
        verbose_name        = _("User")
        verbose_name_plural = _("Users")
        ordering            = ["-created_at"]
        indexes = [
            models.Index(fields=["email", "role"]),
        ]

    def __str__(self):
        return f"{self.full_name} <{self.email}>"

    @property
    def is_venue_admin(self):
        return self.role == self.Role.VENUE_ADMIN

    @property
    def is_super_admin(self):
        return self.role == self.Role.SUPER_ADMIN



class SportCategory(BaseModel):
    name        = models.CharField(max_length=100, unique=True, db_index=True)
    icon        = models.ImageField(upload_to="sport_icons/", blank=True, null=True)
    description = models.TextField(blank=True)

    class Meta:
        verbose_name        = _("Sport Category")
        verbose_name_plural = _("Sport Categories")
        ordering            = ["name"]

    def __str__(self):
        return self.name


class Facility(BaseModel):
    name = models.CharField(max_length=100, unique=True)
    icon = models.ImageField(upload_to="facility_icons/", blank=True, null=True)

    class Meta:
        verbose_name        = _("Facility")
        verbose_name_plural = _("Facilities")
        ordering            = ["name"]

    def __str__(self):
        return self.name


class Venue(BaseModel):
    sport_category = models.ForeignKey(
        SportCategory,
        on_delete=models.PROTECT,
        related_name="venues",
    )
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="owned_venues",
        limit_choices_to={"role__in": [User.Role.VENUE_ADMIN, User.Role.SUPER_ADMIN]},
    )
    facilities = models.ManyToManyField(
        Facility,
        blank=True,
        related_name="venues",
    )

    name        = models.CharField(max_length=255, db_index=True)
    description = models.TextField(blank=True)
    address     = models.CharField(max_length=512)
    city        = models.CharField(max_length=100, db_index=True)
    latitude    = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
    )
    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
    )
    price_per_hour = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    opening_time = models.TimeField()
    closing_time = models.TimeField()
    is_active    = models.BooleanField(default=True, db_index=True)

    class Meta:
        verbose_name        = _("Venue")
        verbose_name_plural = _("Venues")
        ordering            = ["-created_at"]
        indexes = [
            models.Index(fields=["city", "is_active"]),
            models.Index(fields=["sport_category", "is_active"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.city})"

    def clean(self):
        if self.opening_time and self.closing_time:
            if self.opening_time >= self.closing_time:
                raise ValidationError(
                    _("Opening time must be earlier than closing time.")
                )

    @property
    def is_open(self):
        now = timezone.localtime(timezone.now()).time()
        return self.opening_time <= now <= self.closing_time


class VenueImage(BaseModel):
    venue = models.ForeignKey(
        Venue,
        on_delete=models.CASCADE,
        related_name="images",
    )
    image = models.ImageField(upload_to="venue_images/")

    class Meta:
        verbose_name        = _("Venue Image")
        verbose_name_plural = _("Venue Images")
        ordering            = ["created_at"]

    def __str__(self):
        return f"Image for {self.venue.name}"


class TimeSlot(BaseModel):
    venue      = models.ForeignKey(
        Venue,
        on_delete=models.CASCADE,
        related_name="time_slots",
    )
    start_time = models.TimeField()
    end_time   = models.TimeField()
    is_active  = models.BooleanField(default=True, db_index=True)

    class Meta:
        verbose_name        = _("Time Slot")
        verbose_name_plural = _("Time Slots")
        ordering            = ["start_time"]
        unique_together = [("venue", "start_time", "end_time")]
        indexes = [
            models.Index(fields=["venue", "is_active"]),
        ]

    def __str__(self):
        return f"{self.venue.name} | {self.start_time:%H:%M}–{self.end_time:%H:%M}"

    def clean(self):
        if self.start_time and self.end_time:
            if self.start_time >= self.end_time:
                raise ValidationError(_("Start time must be before end time."))
            if hasattr(self, "venue") and self.venue_id:
                venue = self.venue
                if self.start_time < venue.opening_time or self.end_time > venue.closing_time:
                    raise ValidationError(
                        _("Time slot must be within the venue's opening and closing hours.")
                    )

    @property
    def duration_hours(self):
        """Returns the slot duration as a float for price calculation."""
        start = timezone.datetime.combine(timezone.datetime.today(), self.start_time)
        end   = timezone.datetime.combine(timezone.datetime.today(), self.end_time)
        delta = end - start
        return delta.seconds / 3600



class Booking(BaseModel):

    class Status(models.TextChoices):
        PENDING   = "PENDING",   _("Pending")
        CONFIRMED = "CONFIRMED", _("Confirmed")
        CANCELLED = "CANCELLED", _("Cancelled")
        COMPLETED = "COMPLETED", _("Completed")

    class PaymentStatus(models.TextChoices):
        UNPAID  = "UNPAID",  _("Unpaid")
        PAID    = "PAID",    _("Paid")
        REFUNDED = "REFUNDED", _("Refunded")
        FAILED  = "FAILED",  _("Failed")

    user      = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="bookings",
    )
    venue     = models.ForeignKey(
        Venue,
        on_delete=models.CASCADE,
        related_name="bookings",
    )
    time_slot = models.ForeignKey(
        TimeSlot,
        on_delete=models.PROTECT,
        related_name="bookings",
    )

    booking_date      = models.DateField(db_index=True)
    total_amount      = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    status            = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    payment_status    = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.UNPAID,
        db_index=True,
    )
    booking_reference = models.CharField(
        max_length=50,
        unique=True,
        blank=True,
        db_index=True,
    )
    notes = models.TextField(blank=True)

    class Meta:
        verbose_name        = _("Booking")
        verbose_name_plural = _("Bookings")
        ordering            = ["-booking_date", "-created_at"]
        unique_together = [("venue", "time_slot", "booking_date")]
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["venue", "booking_date", "status"]),
        ]

    def __str__(self):
        return f"[{self.booking_reference}] {self.user} @ {self.venue} on {self.booking_date}"

    def clean(self):
        if self.venue_id and self.time_slot_id:
            if self.time_slot.venue_id != self.venue_id:
                raise ValidationError(
                    _("The selected time slot does not belong to the chosen venue.")
                )

        if self.booking_date and self.booking_date < timezone.localdate():
            raise ValidationError(_("Booking date cannot be in the past."))

        if self.time_slot_id and not self.time_slot.is_active:
            raise ValidationError(_("This time slot is no longer available."))

    def save(self, *args, **kwargs):
        if not self.booking_reference:
            self.booking_reference = self._generate_reference()
        super().save(*args, **kwargs)

    @staticmethod
    def _generate_reference():
        import random, string
        suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
        return f"BK-{suffix}"

    @property
    def is_cancellable(self):
        """Allow cancellation if the booking is still pending or confirmed and in the future."""
        return (
            self.status in (self.Status.PENDING, self.Status.CONFIRMED)
            and self.booking_date >= timezone.localdate()
        )



class Payment(BaseModel):

    class PaymentMethod(models.TextChoices):
        CARD         = "CARD",         _("Card")
        BANK_TRANSFER = "BANK_TRANSFER", _("Bank Transfer")
        WALLET       = "WALLET",       _("Wallet")
        CASH         = "CASH",         _("Cash")

    class Status(models.TextChoices):
        PENDING   = "PENDING",   _("Pending")
        SUCCESS   = "SUCCESS",   _("Success")
        FAILED    = "FAILED",    _("Failed")
        REFUNDED  = "REFUNDED",  _("Refunded")

    booking = models.OneToOneField(
        Booking,
        on_delete=models.CASCADE,
        related_name="payment",
    )

    payment_method           = models.CharField(max_length=20, choices=PaymentMethod.choices)
    transaction_id           = models.CharField(max_length=255, unique=True, blank=True, null=True, db_index=True)
    amount                   = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    payment_gateway_response = models.JSONField(default=dict, blank=True)
    status                   = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name        = _("Payment")
        verbose_name_plural = _("Payments")
        ordering            = ["-created_at"]

    def __str__(self):
        return f"Payment [{self.status}] for {self.booking.booking_reference}"

    def save(self, *args, **kwargs):
        if self.status == self.Status.SUCCESS:
            if not self.paid_at:
                self.paid_at = timezone.now()
            self.booking.status         = Booking.Status.CONFIRMED
            self.booking.payment_status = Booking.PaymentStatus.PAID
            self.booking.save(update_fields=["status", "payment_status", "updated_at"])
        elif self.status == self.Status.REFUNDED:
            self.booking.payment_status = Booking.PaymentStatus.REFUNDED
            self.booking.save(update_fields=["payment_status", "updated_at"])
        super().save(*args, **kwargs)



class OpponentRequest(BaseModel):

    class SkillLevel(models.TextChoices):
        BEGINNER     = "BEGINNER",     _("Beginner")
        INTERMEDIATE = "INTERMEDIATE", _("Intermediate")
        ADVANCED     = "ADVANCED",     _("Advanced")
        PROFESSIONAL = "PROFESSIONAL", _("Professional")

    class Status(models.TextChoices):
        OPEN      = "OPEN",      _("Open")
        MATCHED   = "MATCHED",   _("Matched")
        CANCELLED = "CANCELLED", _("Cancelled")

    booking        = models.OneToOneField(
        Booking,
        on_delete=models.CASCADE,
        related_name="opponent_request",
    )
    requested_by   = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="opponent_requests",
    )
    sport_category = models.ForeignKey(
        SportCategory,
        on_delete=models.PROTECT,
        related_name="opponent_requests",
    )

    skill_level = models.CharField(
        max_length=20,
        choices=SkillLevel.choices,
        default=SkillLevel.INTERMEDIATE,
        db_index=True,
    )
    message = models.TextField(blank=True)
    status  = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN,
        db_index=True,
    )

    class Meta:
        verbose_name        = _("Opponent Request")
        verbose_name_plural = _("Opponent Requests")
        ordering            = ["-created_at"]
        indexes = [
            models.Index(fields=["sport_category", "skill_level", "status"]),
        ]

    def __str__(self):
        return f"OpponentRequest [{self.status}] by {self.requested_by}"

    def clean(self):
        # Ensure the requester is the booking owner
        if self.booking_id and self.requested_by_id:
            if self.booking.user_id != self.requested_by_id:
                raise ValidationError(
                    _("Only the booking owner can create an opponent request.")
                )
        # Request only makes sense on a confirmed booking
        if self.booking_id and self.booking.status != Booking.Status.CONFIRMED:
            raise ValidationError(
                _("Opponent requests can only be created for confirmed bookings.")
            )


class OpponentMatch(BaseModel):

    class Status(models.TextChoices):
        PENDING   = "PENDING",   _("Pending")
        ACCEPTED  = "ACCEPTED",  _("Accepted")
        DECLINED  = "DECLINED",  _("Declined")
        CANCELLED = "CANCELLED", _("Cancelled")

    opponent_request = models.OneToOneField(
        OpponentRequest,
        on_delete=models.CASCADE,
        related_name="match",
    )
    matched_user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="opponent_matches",
    )
    matched_at = models.DateTimeField(default=timezone.now)
    status     = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )

    class Meta:
        verbose_name        = _("Opponent Match")
        verbose_name_plural = _("Opponent Matches")
        ordering            = ["-matched_at"]

    def __str__(self):
        return (
            f"Match [{self.status}]: "
            f"{self.opponent_request.requested_by} vs {self.matched_user}"
        )

    def save(self, *args, **kwargs):
        # Close the open request when a match is accepted
        if self.status == self.Status.ACCEPTED:
            req = self.opponent_request
            if req.status != OpponentRequest.Status.MATCHED:
                req.status = OpponentRequest.Status.MATCHED
                req.save(update_fields=["status", "updated_at"])
        super().save(*args, **kwargs)


class Notification(BaseModel):
    """
    In-app notification record. Pair with a WebSocket channel (Django Channels)
    or push notification service for real-time delivery.
    """

    class NotificationType(models.TextChoices):
        BOOKING_CONFIRMED  = "BOOKING_CONFIRMED",  _("Booking Confirmed")
        BOOKING_CANCELLED  = "BOOKING_CANCELLED",  _("Booking Cancelled")
        PAYMENT_SUCCESS    = "PAYMENT_SUCCESS",    _("Payment Success")
        PAYMENT_FAILED     = "PAYMENT_FAILED",     _("Payment Failed")
        OPPONENT_REQUEST   = "OPPONENT_REQUEST",   _("Opponent Request")
        OPPONENT_MATCHED   = "OPPONENT_MATCHED",   _("Opponent Matched")
        GENERAL            = "GENERAL",            _("General")

    user              = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    title             = models.CharField(max_length=255)
    message           = models.TextField()
    notification_type = models.CharField(
        max_length=50,
        choices=NotificationType.choices,
        default=NotificationType.GENERAL,
        db_index=True,
    )
    is_read = models.BooleanField(default=False, db_index=True)

    class Meta:
        verbose_name        = _("Notification")
        verbose_name_plural = _("Notifications")
        ordering            = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "is_read"]),
            models.Index(fields=["user", "notification_type"]),
        ]

    def __str__(self):
        read_flag = "✓" if self.is_read else "●"
        return f"{read_flag} [{self.notification_type}] → {self.user}: {self.title}"

    def mark_as_read(self):
        if not self.is_read:
            self.is_read = True
            self.save(update_fields=["is_read", "updated_at"])