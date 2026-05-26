from decimal import Decimal

from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import (
    Booking, Facility, Notification, OpponentRequest,
    Payment, SportCategory, TimeSlot, User, Venue, VenueImage,
)


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'full_name', 'phone_number', 'profile_image', 'role', 'is_verified', 'created_at')
        read_only_fields = ('id', 'email', 'role', 'is_verified', 'created_at')


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ('email', 'full_name', 'phone_number', 'password', 'password2')

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({'password': "Passwords don't match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        return User.objects.create_user(**validated_data)


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserProfileSerializer(self.user).data
        self.user.access_token  = data['access']
        self.user.refresh_token = data['refresh']
        self.user.is_revoked    = False
        self.user.save(update_fields=['access_token', 'refresh_token', 'is_revoked', 'updated_at'])
        return data


class SportCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SportCategory
        fields = ('id', 'name', 'icon', 'description')


class FacilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Facility
        fields = ('id', 'name', 'icon')


class VenueImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = VenueImage
        fields = ('id', 'image')


class TimeSlotSerializer(serializers.ModelSerializer):
    start_time     = serializers.SerializerMethodField()
    end_time       = serializers.SerializerMethodField()
    duration_hours = serializers.SerializerMethodField()

    class Meta:
        model = TimeSlot
        fields = ('id', 'start_time', 'end_time', 'is_active', 'duration_hours')

    def _fmt_time(self, t):
        hour = int(t.strftime('%I'))
        return f"{hour}:{t.strftime('%M %p')}"

    def get_start_time(self, obj):
        return self._fmt_time(obj.start_time)

    def get_end_time(self, obj):
        return self._fmt_time(obj.end_time)

    def get_duration_hours(self, obj):
        h = obj.duration_hours
        n = int(h)
        if h == n:
            return f"{n} hr" if n == 1 else f"{n} hrs"
        return f"{round(h, 1)} hrs"


class VenueListSerializer(serializers.ModelSerializer):
    sport_category = SportCategorySerializer(read_only=True)
    primary_image = serializers.SerializerMethodField()

    class Meta:
        model = Venue
        fields = ('id', 'name', 'sport_category', 'city', 'address', 'price_per_hour', 'is_active', 'primary_image')

    def get_primary_image(self, obj):
        image = obj.images.first()
        if not image:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(image.image.url)
        return image.image.url


class VenueDetailSerializer(serializers.ModelSerializer):
    sport_category = SportCategorySerializer(read_only=True)
    facilities = FacilitySerializer(many=True, read_only=True)
    images = VenueImageSerializer(many=True, read_only=True)
    time_slots = serializers.SerializerMethodField()

    class Meta:
        model = Venue
        fields = (
            'id', 'name', 'sport_category', 'description', 'address', 'city',
            'latitude', 'longitude', 'price_per_hour', 'opening_time', 'closing_time',
            'is_active', 'facilities', 'images', 'time_slots',
        )

    def get_time_slots(self, obj):
        return TimeSlotSerializer(obj.time_slots.filter(is_active=True), many=True).data


class BookingSerializer(serializers.ModelSerializer):
    venue_name = serializers.CharField(source='venue.name', read_only=True)
    time_slot_start = serializers.SerializerMethodField()
    time_slot_end   = serializers.SerializerMethodField()
    is_cancellable  = serializers.BooleanField(read_only=True)

    def _fmt_time(self, t):
        hour = int(t.strftime('%I'))
        return f"{hour}:{t.strftime('%M %p')}"

    def get_time_slot_start(self, obj):
        return self._fmt_time(obj.time_slot.start_time)

    def get_time_slot_end(self, obj):
        return self._fmt_time(obj.time_slot.end_time)

    class Meta:
        model = Booking
        fields = (
            'id', 'booking_reference', 'venue', 'venue_name', 'time_slot',
            'time_slot_start', 'time_slot_end', 'booking_date', 'total_amount',
            'status', 'payment_status', 'notes', 'is_cancellable', 'created_at',
        )


class BookingCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = ('venue', 'time_slot', 'booking_date', 'notes')

    def validate(self, attrs):
        venue = attrs['venue']
        time_slot = attrs['time_slot']
        booking_date = attrs['booking_date']

        if not venue.is_active:
            raise serializers.ValidationError({'venue': 'This venue is not active.'})

        if time_slot.venue_id != venue.pk:
            raise serializers.ValidationError({'time_slot': 'Time slot does not belong to the selected venue.'})

        if not time_slot.is_active:
            raise serializers.ValidationError({'time_slot': 'This time slot is not available.'})

        if booking_date < timezone.localdate():
            raise serializers.ValidationError({'booking_date': 'Booking date cannot be in the past.'})

        conflicting = Booking.objects.filter(
            venue=venue,
            time_slot=time_slot,
            booking_date=booking_date,
        ).exclude(status=Booking.Status.CANCELLED)

        if self.instance:
            conflicting = conflicting.exclude(pk=self.instance.pk)

        if conflicting.exists():
            raise serializers.ValidationError({'time_slot': 'This slot is already booked for the selected date.'})

        return attrs

    def create(self, validated_data):
        venue = validated_data['venue']
        time_slot = validated_data['time_slot']
        total_amount = Decimal(str(time_slot.duration_hours)) * venue.price_per_hour
        return Booking.objects.create(
            user=self.context['request'].user,
            total_amount=total_amount.quantize(Decimal('0.01')),
            **validated_data,
        )


class PaymentSerializer(serializers.ModelSerializer):
    booking_reference = serializers.CharField(source='booking.booking_reference', read_only=True)

    class Meta:
        model = Payment
        fields = (
            'id', 'booking', 'booking_reference', 'payment_method', 'transaction_id',
            'amount', 'status', 'paid_at', 'created_at',
        )


class PaymentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ('payment_method', 'transaction_id')

    def validate(self, attrs):
        booking = self.context['booking']
        if booking.user != self.context['request'].user:
            raise serializers.ValidationError('You can only pay for your own bookings.')
        if booking.status == Booking.Status.CANCELLED:
            raise serializers.ValidationError('Cannot pay for a cancelled booking.')
        if booking.payment_status == Booking.PaymentStatus.PAID:
            raise serializers.ValidationError('This booking is already paid.')
        if hasattr(booking, 'payment'):
            raise serializers.ValidationError('A payment record already exists for this booking.')
        return attrs

    def create(self, validated_data):
        booking = self.context['booking']
        return Payment.objects.create(
            booking=booking,
            amount=booking.total_amount,
            status=Payment.Status.SUCCESS,
            **validated_data,
        )


class OpponentRequestSerializer(serializers.ModelSerializer):
    requested_by_name = serializers.CharField(source='requested_by.full_name', read_only=True)
    sport_category_name = serializers.CharField(source='sport_category.name', read_only=True)
    booking_reference = serializers.CharField(source='booking.booking_reference', read_only=True)

    class Meta:
        model = OpponentRequest
        fields = (
            'id', 'booking', 'booking_reference', 'requested_by', 'requested_by_name',
            'sport_category', 'sport_category_name', 'skill_level', 'message',
            'status', 'created_at',
        )


class OpponentRequestCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = OpponentRequest
        fields = ('booking', 'sport_category', 'skill_level', 'message')

    def validate_booking(self, booking):
        user = self.context['request'].user
        if booking.user != user:
            raise serializers.ValidationError('You can only create opponent requests for your own bookings.')
        if booking.status != Booking.Status.CONFIRMED:
            raise serializers.ValidationError('Opponent requests can only be created for confirmed bookings.')
        if hasattr(booking, 'opponent_request') and booking.opponent_request.status != OpponentRequest.Status.CANCELLED:
            raise serializers.ValidationError('An active opponent request already exists for this booking.')
        return booking

    def create(self, validated_data):
        return OpponentRequest.objects.create(
            requested_by=self.context['request'].user,
            **validated_data,
        )


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ('id', 'title', 'message', 'notification_type', 'is_read', 'created_at')
        read_only_fields = ('id', 'title', 'message', 'notification_type', 'is_read', 'created_at')
