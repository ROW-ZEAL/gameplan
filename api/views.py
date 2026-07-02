import base64
import hashlib
import hmac
import json
import math
from datetime import date

from django.conf import settings
from django.db.models import Avg, Count, Q
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
    SportCategory, TimeSlot, User, Venue, VenueRating,
)
from .serializers import (
    BookingCreateSerializer, BookingSerializer,
    CustomTokenObtainPairSerializer, NearbyVenueSerializer,
    NotificationSerializer,
    OpponentRequestCreateSerializer, OpponentRequestSerializer,
    PaymentCreateSerializer, PaymentSerializer,
    RecommendedVenueSerializer,
    RegisterSerializer, SportCategorySerializer,
    TimeSlotSerializer, UserProfileSerializer,
    VenueDetailSerializer, VenueListSerializer,
    VenueRatingCreateSerializer, VenueRatingSerializer,
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
        qs = (
            Venue.objects.filter(is_active=True)
            .select_related('sport_category')
            .prefetch_related('images')
            .annotate(
                avg_rating=Avg('ratings__rating'),
                rating_count=Count('ratings', distinct=True),
            )
        )
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
        .annotate(
            avg_rating=Avg('ratings__rating'),
            rating_count=Count('ratings', distinct=True),
        )
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
            Booking.objects.filter(
                venue=venue,
                booking_date=booking_date,
                status__in=[Booking.Status.PENDING, Booking.Status.CONFIRMED]
            )
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


class RecommendedVenuesView(APIView):
    """
    Content-Based Filtering recommendation engine.

    Builds a preference profile from the authenticated user's confirmed booking
    history (sport frequency, average price, facility preferences) and scores
    every active venue against it.

    Cold-start (no bookings): falls back to venue popularity across all users.

    Query params:
      n – int, optional (default 6, max 20) — number of venues to return
    """
    permission_classes = (IsAuthenticated,)

    SPORT_WEIGHT    = 0.50
    PRICE_WEIGHT    = 0.30
    FACILITY_WEIGHT = 0.20

    # ── Entry point ──────────────────────────────────────────────────────────

    def get(self, request):
        try:
            n = int(request.query_params.get('n', 6))
            n = max(1, min(n, 20))
        except (ValueError, TypeError):
            n = 6

        confirmed_bookings = (
            Booking.objects
            .filter(user=request.user)
            .exclude(status=Booking.Status.CANCELLED)
            .select_related('venue__sport_category')
            .prefetch_related('venue__facilities')
        )

        all_venues = (
            Venue.objects.filter(is_active=True)
            .select_related('sport_category')
            .prefetch_related('images', 'facilities')
        )

        venue_list   = list(all_venues)
        booking_list = list(confirmed_bookings)

        if not venue_list:
            return Response({
                'algorithm': 'content_based_filtering',
                'mode': 'no_venues',
                'total_bookings_analyzed': 0,
                'top_sport': None,
                'avg_price_per_hour': 0,
                'recommended_venues': [],
            })

        if not booking_list:
            return self._cold_start(venue_list, n, request)

        # ── Build user preference profile ─────────────────────────────────

        sport_counts      = {}   # sport_category.id → confirmed booking count
        prices            = []   # price_per_hour floats from booked venues
        user_facility_ids = set()
        booked_venue_ids  = set()

        for booking in booking_list:
            venue = booking.venue
            if venue is None:
                continue
            booked_venue_ids.add(venue.id)
            if venue.sport_category_id:
                sport_counts[venue.sport_category_id] = (
                    sport_counts.get(venue.sport_category_id, 0) + 1
                )
            if venue.price_per_hour:
                prices.append(float(venue.price_per_hour))
            for facility in venue.facilities.all():
                user_facility_ids.add(facility.id)

        total_bookings = sum(sport_counts.values())

        # If every booking had a null venue (data integrity edge case), cold-start
        if total_bookings == 0:
            return self._cold_start(venue_list, n, request)

        avg_price = sum(prices) / len(prices) if prices else 0.0

        # ── Score every venue ─────────────────────────────────────────────

        scored = []
        for venue in venue_list:
            s_score = self._sport_score(venue, sport_counts, total_bookings)
            p_score = self._price_score(venue, avg_price)
            f_score = self._facility_score(venue, user_facility_ids)

            final = (
                self.SPORT_WEIGHT    * s_score +
                self.PRICE_WEIGHT    * p_score +
                self.FACILITY_WEIGHT * f_score
            )

            venue.rec_score            = round(final, 4)
            venue.rec_reason           = self._build_reason(
                venue, sport_counts, avg_price, user_facility_ids
            )
            venue.is_previously_booked = venue.id in booked_venue_ids
            scored.append((final, venue.name, venue))

        scored.sort(key=lambda x: (-x[0], x[1]))
        top = [v for _, _, v in scored[:n]]

        # Resolve top sport name for the response metadata
        top_sport_id   = max(sport_counts, key=sport_counts.get)
        top_sport_name = None
        for b in booking_list:
            if b.venue and b.venue.sport_category_id == top_sport_id:
                top_sport_name = b.venue.sport_category.name
                break

        serializer = RecommendedVenueSerializer(top, many=True, context={'request': request})
        return Response({
            'algorithm': 'content_based_filtering',
            'mode': 'personalized',
            'total_bookings_analyzed': len(booking_list),
            'top_sport': top_sport_name,
            'avg_price_per_hour': round(avg_price, 2),
            'recommended_venues': serializer.data,
        })

    # ── Cold-start fallback ───────────────────────────────────────────────

    def _cold_start(self, venue_list, n, request):
        from django.db.models import Count as DCount
        counts = dict(
            Booking.objects
            .filter(status=Booking.Status.CONFIRMED)
            .values('venue_id')
            .annotate(cnt=DCount('id'))
            .values_list('venue_id', 'cnt')
        )
        max_count = max(counts.values()) if counts else 1

        for venue in venue_list:
            raw = counts.get(venue.id, 0)
            venue.rec_score            = round(raw / max_count, 4)
            venue.rec_reason           = 'Popular with other users'
            venue.is_previously_booked = False

        venue_list.sort(key=lambda v: (-v.rec_score, v.name))
        top = venue_list[:n]

        serializer = RecommendedVenueSerializer(top, many=True, context={'request': request})
        return Response({
            'algorithm': 'content_based_filtering',
            'mode': 'cold_start',
            'total_bookings_analyzed': 0,
            'top_sport': None,
            'avg_price_per_hour': 0,
            'recommended_venues': serializer.data,
        })

    # ── Sub-score helpers ─────────────────────────────────────────────────

    def _sport_score(self, venue, sport_counts, total_bookings):
        if not venue.sport_category_id or total_bookings == 0:
            return 0.0
        count = sport_counts.get(venue.sport_category_id, 0)
        return count / total_bookings

    def _price_score(self, venue, avg_price):
        if not venue.price_per_hour or avg_price <= 0:
            return 0.0
        diff = abs(float(venue.price_per_hour) - avg_price) / avg_price
        if diff <= 0.20:
            return 1.0
        if diff <= 0.50:
            return 0.5
        return 0.0

    def _facility_score(self, venue, user_facility_ids):
        if not user_facility_ids:
            return 0.0
        venue_fids = {f.id for f in venue.facilities.all()}
        if not venue_fids:
            return 0.0
        return len(venue_fids & user_facility_ids) / len(user_facility_ids)

    def _build_reason(self, venue, sport_counts, avg_price, user_facility_ids):
        parts = []

        if venue.sport_category_id:
            count = sport_counts.get(venue.sport_category_id, 0)
            if count > 0:
                name = venue.sport_category.name
                parts.append(
                    f"You've booked {name} {count} time{'s' if count > 1 else ''}"
                )

        if venue.price_per_hour and avg_price > 0:
            diff = abs(float(venue.price_per_hour) - avg_price) / avg_price
            if diff <= 0.20:
                parts.append('matches your usual price range')
            elif diff <= 0.50:
                parts.append('close to your usual price range')

        if user_facility_ids:
            venue_fids = {f.id for f in venue.facilities.all()}
            matching   = venue_fids & user_facility_ids
            if matching:
                names = [f.name for f in venue.facilities.all() if f.id in matching][:2]
                if names:
                    parts.append(f"has {' & '.join(names)} you like")

        return ' · '.join(parts) if parts else 'Explore something new'


class NearbyVenuesView(APIView):
    """
    Returns the K nearest active venues to a given location using KNN (Haversine).

    Query params:
      latitude  – float, required
      longitude – float, required
      k         – int,   optional (default 5, max 20)
      radius_km – float, optional (default 2.0, max 50) — venues beyond this distance are excluded
    """
    permission_classes = (AllowAny,)

    EARTH_RADIUS_KM = 6371.0

    def get(self, request):
        lat_str = request.query_params.get('latitude')
        lng_str = request.query_params.get('longitude')

        if not lat_str or not lng_str:
            return Response(
                {'detail': 'latitude and longitude query parameters are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user_lat = float(lat_str)
            user_lng = float(lng_str)
        except ValueError:
            return Response(
                {'detail': 'latitude and longitude must be valid numbers.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not (-90 <= user_lat <= 90) or not (-180 <= user_lng <= 180):
            return Response(
                {'detail': 'latitude must be between -90 and 90; longitude between -180 and 180.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            k = int(request.query_params.get('k', 5))
            k = max(1, min(k, 20))
        except ValueError:
            k = 5

        try:
            radius_km = float(request.query_params.get('radius_km', 2.0))
            radius_km = max(0.1, min(radius_km, 50.0))
        except ValueError:
            radius_km = 2.0

        venues = (
            Venue.objects.filter(is_active=True)
            .exclude(latitude=None)
            .exclude(longitude=None)
            .select_related('sport_category')
            .prefetch_related('images')
        )

        if not venues.exists():
            return Response({
                'user_location': {'latitude': user_lat, 'longitude': user_lng},
                'nearest_venues': [],
            })

        venue_list = list(venues)

        def haversine_km(lat1, lon1, lat2, lon2):
            r = self.EARTH_RADIUS_KM
            phi1, phi2 = math.radians(lat1), math.radians(lat2)
            dphi = math.radians(lat2 - lat1)
            dlambda = math.radians(lon2 - lon1)
            a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
            return r * 2 * math.asin(math.sqrt(a))

        scored = []
        for venue in venue_list:
            dist = haversine_km(user_lat, user_lng, float(venue.latitude), float(venue.longitude))
            scored.append((dist, venue))

        scored.sort(key=lambda x: x[0])

        within_radius = [(dist, venue) for dist, venue in scored if dist <= radius_km]

        nearest = []
        for dist_km, venue in within_radius[:k]:
            venue.distance_km = round(dist_km, 2)
            nearest.append(venue)

        serializer = NearbyVenueSerializer(nearest, many=True, context={'request': request})
        return Response({
            'user_location': {'latitude': user_lat, 'longitude': user_lng},
            'radius_km': radius_km,
            'nearest_venues': serializer.data,
        })


class VenueRateView(APIView):
    """
    GET  /venues/<pk>/rate/  — return the authenticated user's existing rating (or nulls)
    POST /venues/<pk>/rate/  — submit or update a rating (requires confirmed/completed booking)
    """
    permission_classes = (IsAuthenticated,)

    def _get_venue(self, pk):
        try:
            return Venue.objects.get(pk=pk, is_active=True)
        except Venue.DoesNotExist:
            return None

    def get(self, request, pk):
        venue = self._get_venue(pk)
        if venue is None:
            return Response({'detail': 'Venue not found.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            rating = VenueRating.objects.get(user=request.user, venue=venue)
            return Response({'rating': rating.rating, 'review': rating.review})
        except VenueRating.DoesNotExist:
            return Response({'rating': None, 'review': None})

    def post(self, request, pk):
        venue = self._get_venue(pk)
        if venue is None:
            return Response({'detail': 'Venue not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = VenueRatingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        rating_obj, created = VenueRating.objects.update_or_create(
            user=request.user,
            venue=venue,
            defaults={
                'rating': serializer.validated_data['rating'],
                'review': serializer.validated_data.get('review', ''),
            },
        )

        return Response(
            VenueRatingSerializer(rating_obj).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class VenueRatingsListView(generics.ListAPIView):
    """GET /venues/<pk>/ratings/ — paginated list of all ratings for a venue."""
    serializer_class = VenueRatingSerializer
    permission_classes = (AllowAny,)

    def get_queryset(self):
        return (
            VenueRating.objects
            .filter(venue_id=self.kwargs['pk'])
            .select_related('user')
            .order_by('-created_at')
        )
