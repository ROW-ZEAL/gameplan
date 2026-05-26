from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _

from .models import (
    Booking, Facility, Notification, OpponentMatch, OpponentRequest,
    Payment, SportCategory, TimeSlot, User, Venue, VenueImage,
)

admin.site.site_header = "GamePlanR Admin"
admin.site.site_title  = "GamePlanR"
admin.site.index_title = "Dashboard"


def _is_super(user):
    return user.is_superuser or user.role == User.Role.SUPER_ADMIN


def _is_venue_admin(user):
    return user.role == User.Role.VENUE_ADMIN


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering          = ["-created_at"]
    list_display      = ("email", "full_name", "role", "is_verified", "is_active", "is_staff")
    list_filter       = ("role", "is_verified", "is_active")
    search_fields     = ("email", "full_name")
    readonly_fields   = ("last_login",)

    fieldsets = (
        (None,                   {"fields": ("email", "password")}),
        (_("Personal info"),     {"fields": ("full_name", "phone_number", "profile_image")}),
        (_("Role & access"),     {"fields": ("role", "is_verified", "is_active", "is_staff", "is_superuser")}),
        (_("Permissions"),       {"fields": ("groups", "user_permissions")}),
        (_("Dates"),             {"fields": ("last_login",)}),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "full_name", "password1", "password2", "role", "is_staff"),
        }),
    )

    def has_view_permission(self, request, obj=None):   return _is_super(request.user)
    def has_add_permission(self, request):              return _is_super(request.user)
    def has_change_permission(self, request, obj=None): return _is_super(request.user)
    def has_delete_permission(self, request, obj=None): return _is_super(request.user)
    def has_module_permission(self, request):                return _is_super(request.user)


@admin.register(SportCategory)
class SportCategoryAdmin(admin.ModelAdmin):
    list_display  = ("name", "description")
    search_fields = ("name",)

    def has_view_permission(self, request, obj=None):   return True
    def has_add_permission(self, request):              return _is_super(request.user)
    def has_change_permission(self, request, obj=None): return _is_super(request.user)
    def has_delete_permission(self, request, obj=None): return _is_super(request.user)


@admin.register(Facility)
class FacilityAdmin(admin.ModelAdmin):
    list_display  = ("name",)
    search_fields = ("name",)

    def has_view_permission(self, request, obj=None):   return True
    def has_add_permission(self, request):              return _is_super(request.user)
    def has_change_permission(self, request, obj=None): return _is_super(request.user)
    def has_delete_permission(self, request, obj=None): return _is_super(request.user)


class VenueImageInline(admin.TabularInline):
    model  = VenueImage
    extra  = 1
    fields = ("image",)


class TimeSlotInline(admin.TabularInline):
    model  = TimeSlot
    extra  = 2
    fields = ("start_time", "end_time", "is_active")


@admin.register(Venue)
class VenueAdmin(admin.ModelAdmin):
    list_display      = ("name", "sport_category", "city", "price_per_hour", "is_active", "owner")
    list_filter       = ("sport_category", "city", "is_active")
    search_fields     = ("name", "city", "address")
    filter_horizontal = ("facilities",)
    inlines           = [VenueImageInline, TimeSlotInline]
    fieldsets = (
        (None,             {"fields": ("name", "sport_category", "owner", "description")}),
        (_("Location"),    {"fields": ("address", "city", "latitude", "longitude")}),
        (_("Operations"),  {"fields": ("price_per_hour", "opening_time", "closing_time", "facilities", "is_active")}),
    )

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if _is_super(request.user):
            return qs
        return qs.filter(owner=request.user)

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        if _is_venue_admin(request.user) and "owner" in form.base_fields:
            f = form.base_fields["owner"]
            f.initial   = request.user
            f.disabled  = True
            f.queryset  = User.objects.filter(pk=request.user.pk)
        return form

    def save_model(self, request, obj, form, change):
        if not change and _is_venue_admin(request.user):
            obj.owner = request.user
        super().save_model(request, obj, form, change)

    def has_view_permission(self, request, obj=None):   return True
    def has_add_permission(self, request):              return True

    def has_change_permission(self, request, obj=None):
        if obj and _is_venue_admin(request.user):
            return obj.owner_id == request.user.pk
        return True

    def has_delete_permission(self, request, obj=None):
        if obj and _is_venue_admin(request.user):
            return obj.owner_id == request.user.pk
        return True

@admin.register(TimeSlot)
class TimeSlotAdmin(admin.ModelAdmin):
    list_display  = ("venue", "start_time", "end_time", "is_active")
    list_filter   = ("is_active", "venue__sport_category")
    search_fields = ("venue__name",)

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if _is_super(request.user):
            return qs
        return qs.filter(venue__owner=request.user)

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "venue" and _is_venue_admin(request.user):
            kwargs["queryset"] = Venue.objects.filter(owner=request.user)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    def has_view_permission(self, request, obj=None):   return True
    def has_add_permission(self, request):              return True

    def has_change_permission(self, request, obj=None):
        if obj and _is_venue_admin(request.user):
            return obj.venue.owner_id == request.user.pk
        return True

    def has_delete_permission(self, request, obj=None):
        if obj and _is_venue_admin(request.user):
            return obj.venue.owner_id == request.user.pk
        return True


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display    = ("booking_reference", "user", "venue", "booking_date", "status", "payment_status", "total_amount")
    list_filter     = ("status", "payment_status", "booking_date")
    search_fields   = ("booking_reference", "user__email", "venue__name")
    readonly_fields = ("booking_reference", "created_at", "updated_at")

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if _is_super(request.user):
            return qs
        return qs.filter(venue__owner=request.user)

    def get_readonly_fields(self, request, obj=None):
        if _is_venue_admin(request.user):
            return [f.name for f in Booking._meta.fields]
        return self.readonly_fields

    def has_view_permission(self, request, obj=None):   return True
    def has_add_permission(self, request):              return _is_super(request.user)
    def has_change_permission(self, request, obj=None): return True   # fields are read-only for venue admins
    def has_delete_permission(self, request, obj=None): return _is_super(request.user)


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display    = ("booking", "payment_method", "amount", "status", "paid_at")
    list_filter     = ("status", "payment_method")
    search_fields   = ("booking__booking_reference", "transaction_id")
    readonly_fields = ("paid_at", "created_at", "updated_at")

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if _is_super(request.user):
            return qs
        return qs.filter(booking__venue__owner=request.user)

    def get_readonly_fields(self, request, obj=None):
        if _is_venue_admin(request.user):
            return [f.name for f in Payment._meta.fields]
        return self.readonly_fields

    def has_view_permission(self, request, obj=None):   return True
    def has_add_permission(self, request):              return _is_super(request.user)
    def has_change_permission(self, request, obj=None): return True   # fields are read-only for venue admins
    def has_delete_permission(self, request, obj=None): return _is_super(request.user)


@admin.register(OpponentRequest)
class OpponentRequestAdmin(admin.ModelAdmin):
    list_display  = ("requested_by", "sport_category", "skill_level", "status", "created_at")
    list_filter   = ("status", "skill_level", "sport_category")
    search_fields = ("requested_by__email",)

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if _is_super(request.user):
            return qs
        return qs.filter(booking__venue__owner=request.user)

    def get_readonly_fields(self, request, obj=None):
        if _is_venue_admin(request.user):
            return [f.name for f in OpponentRequest._meta.fields]
        return ()

    def has_view_permission(self, request, obj=None):   return True
    def has_add_permission(self, request):              return _is_super(request.user)
    def has_change_permission(self, request, obj=None): return True
    def has_delete_permission(self, request, obj=None): return _is_super(request.user)


@admin.register(OpponentMatch)
class OpponentMatchAdmin(admin.ModelAdmin):
    list_display = ("opponent_request", "matched_user", "status", "matched_at")
    list_filter  = ("status",)

    def has_view_permission(self, request, obj=None):   return _is_super(request.user)
    def has_add_permission(self, request):              return _is_super(request.user)
    def has_change_permission(self, request, obj=None): return _is_super(request.user)
    def has_delete_permission(self, request, obj=None): return _is_super(request.user)
    def has_module_permission(self, request):                return _is_super(request.user)


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display  = ("user", "title", "notification_type", "is_read", "created_at")
    list_filter   = ("notification_type", "is_read")
    search_fields = ("user__email", "title")

    def has_view_permission(self, request, obj=None):   return _is_super(request.user)
    def has_add_permission(self, request):              return _is_super(request.user)
    def has_change_permission(self, request, obj=None): return _is_super(request.user)
    def has_delete_permission(self, request, obj=None): return _is_super(request.user)
    def has_module_permission(self, request):                return _is_super(request.user)
