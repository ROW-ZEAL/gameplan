from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AvailableSlotsView, BookingCancelView, BookingDetailView,
    BookingListCreateView, BookingPayView, EsewaInitiateView, EsewaVerifyView,
    LoginView, LogoutView,
    NearbyVenuesView, RecommendedVenuesView,
    NotificationListView, NotificationMarkAllReadView, NotificationMarkReadView,
    OpponentRequestCancelView, OpponentRequestListCreateView, PaymentDetailView,
    RegisterView, SportCategoryListView, UserProfileView, VenueDetailView,
    VenueListView, VenueRateView, VenueRatingsListView,
)

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='auth-register'),
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='auth-refresh'),
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('auth/me/', UserProfileView.as_view(), name='auth-me'),

    path('sport-categories/', SportCategoryListView.as_view(), name='sport-category-list'),

    path('venues/', VenueListView.as_view(), name='venue-list'),
    path('venues/nearby/', NearbyVenuesView.as_view(), name='venue-nearby'),
    path('venues/recommended/', RecommendedVenuesView.as_view(), name='venue-recommended'),
    path('venues/<uuid:pk>/', VenueDetailView.as_view(), name='venue-detail'),
    path('venues/<uuid:pk>/available-slots/', AvailableSlotsView.as_view(), name='venue-available-slots'),
    path('venues/<uuid:pk>/rate/', VenueRateView.as_view(), name='venue-rate'),
    path('venues/<uuid:pk>/ratings/', VenueRatingsListView.as_view(), name='venue-ratings'),

    path('bookings/', BookingListCreateView.as_view(), name='booking-list-create'),
    path('bookings/<uuid:pk>/', BookingDetailView.as_view(), name='booking-detail'),
    path('bookings/<uuid:pk>/cancel/', BookingCancelView.as_view(), name='booking-cancel'),
    path('bookings/<uuid:pk>/pay/', BookingPayView.as_view(), name='booking-pay'),
    path('bookings/<uuid:pk>/initiate-esewa/', EsewaInitiateView.as_view(), name='booking-initiate-esewa'),

    path('payments/<uuid:pk>/', PaymentDetailView.as_view(), name='payment-detail'),
    path('esewa/verify/', EsewaVerifyView.as_view(), name='esewa-verify'),

    path('opponent-requests/', OpponentRequestListCreateView.as_view(), name='opponent-request-list-create'),
    path('opponent-requests/<uuid:pk>/cancel/', OpponentRequestCancelView.as_view(), name='opponent-request-cancel'),

    path('notifications/', NotificationListView.as_view(), name='notification-list'),
    path('notifications/read-all/', NotificationMarkAllReadView.as_view(), name='notification-read-all'),
    path('notifications/<uuid:pk>/read/', NotificationMarkReadView.as_view(), name='notification-read'),
]
