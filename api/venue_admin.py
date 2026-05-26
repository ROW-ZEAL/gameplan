from django.contrib.admin import AdminSite, ModelAdmin, TabularInline
from django.contrib.admin.forms import AdminAuthenticationForm
from django.contrib.auth.forms import AuthenticationForm
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

from .models import (
    Booking, Facility, OpponentRequest, Payment,
    SportCategory, TimeSlot, User, Venue, VenueImage,
)


# ─────────────────────────────────────────────────────────────────────────────
# Custom login form — skips is_staff check, requires VENUE_ADMIN role
# ─────────────────────────────────────────────────────────────────────────────
class VenueAdminAuthForm(AdminAuthenticationForm):
    def confirm_login_allowed(self, user):
        AuthenticationForm.confirm_login_allowed(self, user)
        if user.role != User.Role.VENUE_ADMIN:
            raise ValidationError(
                _("Only venue administrators can access this portal."),
                code="invalid_login",
            )


# ─────────────────────────────────────────────────────────────────────────────
# Custom admin site
# ─────────────────────────────────────────────────────────────────────────────
class VenueAdminSite(AdminSite):
    site_header = "GamePlanR — Venue Portal"
    site_title  = "Venue Portal"
    index_title = "My Venue Dashboard"
    login_form  = VenueAdminAuthForm

    def has_permission(self, request):
        return request.user.is_active and request.user.role == User.Role.VENUE_ADMIN


venue_admin_site = VenueAdminSite(name="venue_admin")


# ─────────────────────────────────────────────────────────────────────────────
# Base classes — grant all permissions explicitly so Django's permission checks
# (which query the DB auth_permission table) are bypassed entirely.
# Venue admins have no DB permissions; without these overrides every model and
# every inline row would be locked out.
# ─────────────────────────────────────────────────────────────────────────────
class VenueBaseAdmin(ModelAdmin):
    def has_module_permission(self, request):           return True   # Django 6 renamed from has_module_perms
    def has_view_permission(self, request, obj=None):   return True
    def has_add_permission(self, request):              return True
    def has_change_permission(self, request, obj=None): return True
    def has_delete_permission(self, request, obj=None): return True


class VenueBaseInline(TabularInline):
    """Same fix as VenueBaseAdmin but for inline classes."""
    def has_view_permission(self, request, obj=None):      return True
    def has_add_permission(self, request, obj=None):       return True
    def has_change_permission(self, request, obj=None):    return True
    def has_delete_permission(self, request, obj=None):    return True


# ─────────────────────────────────────────────────────────────────────────────
# Inlines (must inherit VenueBaseInline, NOT plain TabularInline)
# ─────────────────────────────────────────────────────────────────────────────
class VenueImageInline(VenueBaseInline):
    model       = VenueImage
    extra       = 1
    fields      = ("image",)
    verbose_name        = "Venue Image"
    verbose_name_plural = "Venue Images"


class TimeSlotInline(VenueBaseInline):
    model       = TimeSlot
    extra       = 3
    fields      = ("start_time", "end_time", "is_active")
    verbose_name        = "Time Slot"
    verbose_name_plural = "Time Slots"


# ─────────────────────────────────────────────────────────────────────────────
# Venue — full CRUD, owner is auto-set to the logged-in venue admin
# ─────────────────────────────────────────────────────────────────────────────
class VenueAdmin(VenueBaseAdmin):
    list_display      = ("name", "sport_category", "city", "price_per_hour", "is_active")
    list_filter       = ("sport_category", "city", "is_active")
    search_fields     = ("name", "city", "address")
    filter_horizontal = ("facilities",)
    inlines           = [VenueImageInline, TimeSlotInline]
    # owner is hidden from the form — set automatically in save_model
    exclude           = ("owner",)
    fieldsets = (
        (_("Basic Info"), {
            "fields": ("name", "sport_category", "description", "is_active"),
        }),
        (_("Location"), {
            "fields": ("address", "city", "latitude", "longitude"),
        }),
        (_("Pricing & Hours"), {
            "fields": ("price_per_hour", "opening_time", "closing_time"),
        }),
        (_("Facilities"), {
            "fields": ("facilities",),
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).filter(owner=request.user)

    def save_model(self, request, obj, form, change):
        if not change:
            obj.owner = request.user
        super().save_model(request, obj, form, change)

    def has_change_permission(self, request, obj=None):
        if obj:
            return obj.owner_id == request.user.pk
        return True

    def has_delete_permission(self, request, obj=None):
        if obj:
            return obj.owner_id == request.user.pk
        return True


venue_admin_site.register(Venue, VenueAdmin)


# ─────────────────────────────────────────────────────────────────────────────
# Time Slot — standalone add/edit, venue dropdown filtered to own venues
# ─────────────────────────────────────────────────────────────────────────────
class TimeSlotAdmin(VenueBaseAdmin):
    list_display  = ("venue", "start_time", "end_time", "is_active")
    list_filter   = ("is_active", "venue")
    search_fields = ("venue__name",)

    def get_queryset(self, request):
        return super().get_queryset(request).filter(venue__owner=request.user)

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "venue":
            kwargs["queryset"] = Venue.objects.filter(owner=request.user)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    def has_change_permission(self, request, obj=None):
        if obj:
            return obj.venue.owner_id == request.user.pk
        return True

    def has_delete_permission(self, request, obj=None):
        if obj:
            return obj.venue.owner_id == request.user.pk
        return True


venue_admin_site.register(TimeSlot, TimeSlotAdmin)


# ─────────────────────────────────────────────────────────────────────────────
# Booking — view only, filtered to own venues
# ─────────────────────────────────────────────────────────────────────────────
class BookingAdmin(VenueBaseAdmin):
    list_display  = ("booking_reference", "user", "venue", "booking_date", "status", "payment_status", "total_amount")
    list_filter   = ("status", "payment_status", "booking_date")
    search_fields = ("booking_reference", "user__email")

    def get_queryset(self, request):
        return super().get_queryset(request).filter(venue__owner=request.user)

    def has_add_permission(self, request):              return False
    def has_change_permission(self, request, obj=None): return False
    def has_delete_permission(self, request, obj=None): return False


venue_admin_site.register(Booking, BookingAdmin)


# ─────────────────────────────────────────────────────────────────────────────
# Payment — view only, filtered to own venue bookings
# ─────────────────────────────────────────────────────────────────────────────
class PaymentAdmin(VenueBaseAdmin):
    list_display  = ("booking", "payment_method", "amount", "status", "paid_at")
    list_filter   = ("status", "payment_method")
    search_fields = ("booking__booking_reference",)

    def get_queryset(self, request):
        return super().get_queryset(request).filter(booking__venue__owner=request.user)

    def has_add_permission(self, request):              return False
    def has_change_permission(self, request, obj=None): return False
    def has_delete_permission(self, request, obj=None): return False


venue_admin_site.register(Payment, PaymentAdmin)


# ─────────────────────────────────────────────────────────────────────────────
# Opponent Request — view only, filtered to own venue bookings
# ─────────────────────────────────────────────────────────────────────────────
class OpponentRequestAdmin(VenueBaseAdmin):
    list_display  = ("requested_by", "sport_category", "skill_level", "status", "created_at")
    list_filter   = ("status", "skill_level", "sport_category")
    search_fields = ("requested_by__email",)

    def get_queryset(self, request):
        return super().get_queryset(request).filter(booking__venue__owner=request.user)

    def has_add_permission(self, request):              return False
    def has_change_permission(self, request, obj=None): return False
    def has_delete_permission(self, request, obj=None): return False


venue_admin_site.register(OpponentRequest, OpponentRequestAdmin)


# ─────────────────────────────────────────────────────────────────────────────
# Sport Category & Facility — view only reference
# ─────────────────────────────────────────────────────────────────────────────
class ReadOnlyAdmin(VenueBaseAdmin):
    def has_add_permission(self, request):              return False
    def has_change_permission(self, request, obj=None): return False
    def has_delete_permission(self, request, obj=None): return False


class SportCategoryAdmin(ReadOnlyAdmin):
    list_display  = ("name", "description")
    search_fields = ("name",)


class FacilityAdmin(ReadOnlyAdmin):
    list_display  = ("name",)
    search_fields = ("name",)


venue_admin_site.register(SportCategory, SportCategoryAdmin)
venue_admin_site.register(Facility, FacilityAdmin)
