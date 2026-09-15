from django.test import TestCase
from rest_framework.test import APIClient

from .models import Booking, Payment, SportCategory, User, Venue


class AdminBookingUpdateTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            email='admin@example.com',
            password='pass123',
            full_name='Admin User',
            role=User.Role.SUPER_ADMIN,
        )
        self.user = User.objects.create_user(
            email='booker@example.com',
            password='pass123',
            full_name='Booking User',
            role=User.Role.USER,
        )
        self.sport = SportCategory.objects.create(name='Tennis Test Sport')
        self.venue = Venue.objects.create(
            sport_category=self.sport,
            owner=self.admin,
            name='Tennis Court',
            description='Test venue',
            address='Somewhere',
            city='Ktm',
            price_per_hour='1000.00',
            opening_time='08:00:00',
            closing_time='20:00:00',
            is_active=True,
        )
        self.booking = Booking.objects.create(
            user=self.user,
            venue=self.venue,
            booking_date='2026-10-01',
            total_amount='3000.00',
            status=Booking.Status.PENDING,
            payment_status=Booking.PaymentStatus.UNPAID,
        )
        self.payment = Payment.objects.create(
            booking=self.booking,
            payment_method=Payment.PaymentMethod.PAY_AT_VENUE,
            transaction_id='PAV-TEST-123',
            amount='3000.00',
            status=Payment.Status.PENDING,
        )

    def test_admin_booking_patch_updates_linked_payment_when_marked_paid(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.patch(
            f'/api/admin/bookings/{self.booking.id}/',
            {'status': 'CONFIRMED', 'payment_status': 'PAID', 'notes': 'approved'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.booking.refresh_from_db()
        self.payment.refresh_from_db()

        self.assertEqual(self.booking.status, Booking.Status.CONFIRMED)
        self.assertEqual(self.booking.payment_status, Booking.PaymentStatus.PAID)
        self.assertEqual(self.payment.status, Payment.Status.SUCCESS)
        self.assertIsNotNone(self.payment.paid_at)
