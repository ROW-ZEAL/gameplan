from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient

from .models import Booking, Payment, SportCategory, TimeSlot, User, Venue, VenueImage


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


class AdminVenueTimeSlotTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.sport = SportCategory.objects.create(name='Tennis Venue Sport')
        self.admin = User.objects.create_user(
            email='venueadmin@example.com',
            password='pass123',
            full_name='Venue Admin',
            role=User.Role.SUPER_ADMIN,
        )

    def test_admin_can_create_venue_with_time_slots(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            '/api/admin/venues/',
            {
                'name': 'Sunrise Arena',
                'sport_category': self.sport.id,
                'owner': self.admin.id,
                'description': 'Test venue',
                'address': 'Hill Street',
                'city': 'Kathmandu',
                'price_per_hour': '1200.00',
                'opening_time': '06:00:00',
                'closing_time': '22:00:00',
                'is_active': True,
                'facilities': [],
                'time_slots': [
                    {'start_time': '09:00:00', 'end_time': '10:00:00', 'is_active': True},
                    {'start_time': '10:00:00', 'end_time': '11:00:00', 'is_active': True},
                ],
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        venue = Venue.objects.get(name='Sunrise Arena')
        self.assertEqual(venue.time_slots.count(), 2)
        self.assertTrue(TimeSlot.objects.filter(venue=venue, start_time='09:00:00').exists())

    def test_admin_can_upload_venue_image(self):
        venue = Venue.objects.create(
            sport_category=self.sport,
            owner=self.admin,
            name='Photo Venue',
            address='Hill Street',
            city='Kathmandu',
            price_per_hour='1200.00',
            opening_time='06:00:00',
            closing_time='22:00:00',
        )
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            f'/api/admin/venues/{venue.id}/images/',
            {'image': SimpleUploadedFile('venue.jpg', b'fake-image-data', content_type='image/jpeg')},
            format='multipart',
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(VenueImage.objects.filter(venue=venue).exists())
