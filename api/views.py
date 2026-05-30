import base64
import hashlib
import hmac
import json
from datetime import date

from django.conf import settings
from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import (
    Booking, Notification, OpponentRequest, Payment,
    SportCategory, TimeSlot, User, Venue,
)
from .serializers import (
    BookingCreateSerializer, BookingSerializer,
    CustomTokenObtainPairSerializer, NotificationSerializer,
    OpponentRequestCreateSerializer, OpponentRequestSerializer,
    PaymentCreateSerializer, PaymentSerializer,
    RegisterSerializer, SportCategorySerializer,
    TimeSlotSerializer, UserProfileSerializer,
    VenueDetailSerializer, VenueListSerializer,
)


def _esewa_signature(total_amount, transaction_uuid, product_code):
    secret = settings.ESEWA_SECRET_KEY.encode()
    message = f"total_amount={total_amount},transaction_uuid={transaction_uuid},product_code={product_code}"
    sig = hmac.new(secret, message.encode(), hashlib.sha256)
    return base64.b64encode(sig.digest()).decode()


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        access  = str(refresh.access_token)
        ref     = str(refresh)
        user.access_token  = access
        user.refresh_token = ref
        user.is_revoked    = False
        user.save(update_fields=['access_token', 'refresh_token', 'is_revoked', 'updated_at'])
        return Response({
            'user': UserProfileSerializer(user).data,
            'refresh': ref,
            'access': access,
        }, status=status.HTTP_201_CREATED)


class LoginView(TokenObtainPairView):
    permission_classes = (AllowAny,)
    serializer_class = CustomTokenObtainPairSerializer


class LogoutView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({'detail': 'Refresh token is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError:
            return Response({'detail': 'Invalid or expired token.'}, status=status.HTTP_400_BAD_REQUEST)
        request.user.is_revoked    = True
        request.user.access_token  = None
        request.user.refresh_token = None
        request.user.save(update_fields=['is_revoked', 'access_token', 'refresh_token', 'updated_at'])
        return Response({'detail': 'Successfully logged out.'}, status=status.HTTP_200_OK)


class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = (IsAuthenticated,)

    def get_object(self):
        return self.request.user


class SportCategoryListView(generics.ListAPIView):
    queryset = SportCategory.objects.all()
    serializer_class = SportCategorySerializer
    permission_classes = (AllowAny,)


class VenueListView(generics.ListAPIView):
    serializer_class = VenueListSerializer
    permission_classes = (AllowAny,)

    def get_queryset(self):
        qs = Venue.objects.filter(is_active=True).select_related('sport_category').prefetch_related('images')
        sport_category = self.request.query_params.get('sport_category')
        city = self.request.query_params.get('city')
        search = self.request.query_params.get('search')
        if sport_category:
            qs = qs.filter(sport_category__name__iexact=sport_category)
        if city:
            qs = qs.filter(city__iexact=city)
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(city__icontains=search))
        return qs


class VenueDetailView(generics.RetrieveAPIView):
    queryset = (
        Venue.objects.filter(is_active=True)
        .select_related('sport_category')
        .prefetch_related('facilities', 'images', 'time_slots')
    )
    serializer_class = VenueDetailSerializer
    permission_classes = (AllowAny,)


class AvailableSlotsView(APIView):
    permission_classes = (AllowAny,)

    def get(self, request, pk):
        try:
            venue = Venue.objects.get(pk=pk, is_active=True)
        except Venue.DoesNotExist:
            return Response({'detail': 'Venue not found.'}, status=status.HTTP_404_NOT_FOUND)

        date_str = request.query_params.get('date')
        if not date_str:
            return Response(
                {'detail': 'date query parameter is required (YYYY-MM-DD).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            booking_date = date.fromisoformat(date_str)
        except ValueError:
            return Response({'detail': 'Invalid date format. Use YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)

        if booking_date < timezone.localdate():
            return Response({'detail': 'Cannot check availability for past dates.'}, status=status.HTTP_400_BAD_REQUEST)

        booked_slot_ids = (
            Booking.objects.filter(venue=venue, booking_date=booking_date)
            .exclude(status=Booking.Status.CANCELLED)
            .values_list('time_slot_id', flat=True)
        )

        available_slots = TimeSlot.objects.filter(venue=venue, is_active=True).exclude(id__in=booked_slot_ids)
        return Response(TimeSlotSerializer(available_slots, many=True).data)


class BookingListCreateView(generics.ListCreateAPIView):
    permission_classes = (IsAuthenticated,)

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return BookingCreateSerializer
        return BookingSerializer

    def get_queryset(self):
        return (
            Booking.objects.filter(user=self.request.user)
            .select_related('venue', 'time_slot')
            .order_by('-booking_date', '-created_at')
        )

    def create(self, request, *args, **kwargs):
        serializer = BookingCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        booking = serializer.save()
        return Response(BookingSerializer(booking).data, status=status.HTTP_201_CREATED)


class BookingDetailView(generics.RetrieveAPIView):
    serializer_class = BookingSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return Booking.objects.filter(user=self.request.user).select_related('venue', 'time_slot')


class BookingCancelView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, pk):
        try:
            booking = Booking.objects.get(pk=pk, user=request.user)
        except Booking.DoesNotExist:
            return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not booking.is_cancellable:
            return Response({'detail': 'This booking cannot be cancelled.'}, status=status.HTTP_400_BAD_REQUEST)

        booking.status = Booking.Status.CANCELLED
        booking.save(update_fields=['status', 'updated_at'])

        Notification.objects.create(
            user=request.user,
            title='Booking Cancelled',
            message=f'Your booking {booking.booking_reference} has been cancelled.',
            notification_type=Notification.NotificationType.BOOKING_CANCELLED,
        )

        return Response(BookingSerializer(booking).data)


class BookingPayView(APIView):
    """Handles Pay at Venue. For eSewa use /bookings/{id}/initiate-esewa/."""
    permission_classes = (IsAuthenticated,)

    def post(self, request, pk):
        try:
            booking = Booking.objects.get(pk=pk, user=request.user)
        except Booking.DoesNotExist:
            return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = PaymentCreateSerializer(
            data=request.data,
            context={'request': request, 'booking': booking},
        )
        serializer.is_valid(raise_exception=True)
        payment = serializer.save()

        Notification.objects.create(
            user=request.user,
            title='Booking Reserved – Pay at Venue',
            message=(
                f'Your booking {booking.booking_reference} is reserved. '
                f'Show payment ID {payment.transaction_id} at the venue.'
            ),
            notification_type=Notification.NotificationType.BOOKING_CONFIRMED,
        )

        return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)


class EsewaInitiateView(APIView):
    """Returns signed eSewa form parameters; does not create a Payment record."""
    permission_classes = (IsAuthenticated,)

    def post(self, request, pk):
        try:
            booking = Booking.objects.get(pk=pk, user=request.user)
        except Booking.DoesNotExist:
            return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        if booking.status == Booking.Status.CANCELLED:
            return Response({'detail': 'Cannot pay for a cancelled booking.'}, status=status.HTTP_400_BAD_REQUEST)
        if booking.payment_status == Booking.PaymentStatus.PAID:
            return Response({'detail': 'This booking is already paid.'}, status=status.HTTP_400_BAD_REQUEST)
        if hasattr(booking, 'payment'):
            return Response({'detail': 'A payment record already exists for this booking.'}, status=status.HTTP_400_BAD_REQUEST)

        product_code = settings.ESEWA_MERCHANT_CODE
        total_amount = str(booking.total_amount)
        transaction_uuid = f"{booking.id}_{int(timezone.now().timestamp())}"

        signature = _esewa_signature(total_amount, transaction_uuid, product_code)

        return Response({
            'payment_url': settings.ESEWA_PAYMENT_URL,
            'amount': total_amount,
            'tax_amount': '0',
            'total_amount': total_amount,
            'transaction_uuid': transaction_uuid,
            'product_code': product_code,
            'product_service_charge': '0',
            'product_delivery_charge': '0',
            'success_url': f"{settings.FRONTEND_URL}/esewa/success",
            'failure_url': f"{settings.FRONTEND_URL}/esewa/failure",
            'signed_field_names': 'total_amount,transaction_uuid,product_code',
            'signature': signature,
        })


class EsewaVerifyView(APIView):
    """Verifies eSewa callback data and creates a Payment record on success."""
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        encoded = request.data.get('data')
        if not encoded:
            return Response({'detail': 'Missing data parameter.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            decoded = json.loads(base64.b64decode(encoded).decode())
        except Exception:
            return Response({'detail': 'Invalid data encoding.'}, status=status.HTTP_400_BAD_REQUEST)

        signed_fields = decoded.get('signed_field_names', '').split(',')
        message = ','.join(f"{f}={decoded.get(f, '')}" for f in signed_fields)
        expected_sig = base64.b64encode(
            hmac.new(settings.ESEWA_SECRET_KEY.encode(), message.encode(), hashlib.sha256).digest()
        ).decode()

        if expected_sig != decoded.get('signature'):
            return Response({'detail': 'Payment verification failed: invalid signature.'}, status=status.HTTP_400_BAD_REQUEST)

        if decoded.get('status') != 'COMPLETE':
            return Response({'detail': 'Payment was not completed.'}, status=status.HTTP_400_BAD_REQUEST)

        transaction_uuid = decoded.get('transaction_uuid', '')
        try:
            booking_id = transaction_uuid.split('_')[0]
            booking = Booking.objects.get(pk=booking_id, user=request.user)
        except (Booking.DoesNotExist, Exception):
            return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        if hasattr(booking, 'payment'):
            return Response({'detail': 'Payment already recorded.'}, status=status.HTTP_400_BAD_REQUEST)

        payment = Payment.objects.create(
            booking=booking,
            payment_method=Payment.PaymentMethod.ESEWA,
            transaction_id=decoded.get('transaction_code', transaction_uuid),
            amount=booking.total_amount,
            status=Payment.Status.SUCCESS,
            payment_gateway_response=decoded,
        )

        Notification.objects.create(
            user=request.user,
            title='Payment Successful',
            message=f'eSewa payment for booking {booking.booking_reference} was successful.',
            notification_type=Notification.NotificationType.PAYMENT_SUCCESS,
        )

        return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)


class PaymentDetailView(generics.RetrieveAPIView):
    serializer_class = PaymentSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return Payment.objects.filter(booking__user=self.request.user).select_related('booking')


class OpponentRequestListCreateView(generics.ListCreateAPIView):
    permission_classes = (IsAuthenticated,)

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return OpponentRequestCreateSerializer
        return OpponentRequestSerializer

    def get_queryset(self):
        qs = OpponentRequest.objects.select_related('booking', 'requested_by', 'sport_category')
        if self.request.query_params.get('mine'):
            return qs.filter(requested_by=self.request.user)
        return qs.filter(status=OpponentRequest.Status.OPEN)

    def create(self, request, *args, **kwargs):
        serializer = OpponentRequestCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        opponent_request = serializer.save()
        return Response(OpponentRequestSerializer(opponent_request).data, status=status.HTTP_201_CREATED)


class OpponentRequestCancelView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, pk):
        try:
            opponent_request = OpponentRequest.objects.get(pk=pk, requested_by=request.user)
        except OpponentRequest.DoesNotExist:
            return Response({'detail': 'Opponent request not found.'}, status=status.HTTP_404_NOT_FOUND)

        if opponent_request.status == OpponentRequest.Status.CANCELLED:
            return Response({'detail': 'This request is already cancelled.'}, status=status.HTTP_400_BAD_REQUEST)

        opponent_request.status = OpponentRequest.Status.CANCELLED
        opponent_request.save(update_fields=['status', 'updated_at'])

        return Response(OpponentRequestSerializer(opponent_request).data)


class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        qs = Notification.objects.filter(user=self.request.user)
        if self.request.query_params.get('unread'):
            qs = qs.filter(is_read=False)
        return qs


class NotificationMarkReadView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, pk):
        try:
            notification = Notification.objects.get(pk=pk, user=request.user)
        except Notification.DoesNotExist:
            return Response({'detail': 'Notification not found.'}, status=status.HTTP_404_NOT_FOUND)
        notification.mark_as_read()
        return Response(NotificationSerializer(notification).data)


class NotificationMarkAllReadView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'detail': 'All notifications marked as read.'})
