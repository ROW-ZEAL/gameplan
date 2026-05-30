from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.db import migrations


def fix_timeslots_and_recalculate(apps, schema_editor):
    TimeSlot = apps.get_model('api', 'TimeSlot')
    Booking = apps.get_model('api', 'Booking')

    # Fix every time slot whose duration is less than 30 minutes —
    # these are broken test records (start == end or only seconds apart).
    # Give them a proper 1-hour window.
    for ts in TimeSlot.objects.all():
        start_dt = datetime.combine(datetime.today(), ts.start_time)
        end_dt = datetime.combine(datetime.today(), ts.end_time)
        duration_seconds = (end_dt - start_dt).seconds
        if duration_seconds < 1800:
            ts.end_time = (start_dt + timedelta(hours=1)).time()
            ts.save(update_fields=['end_time', 'updated_at'])

    # Recalculate total_amount for every booking using the corrected time slots.
    for booking in Booking.objects.select_related('venue', 'time_slot').all():
        ts = booking.time_slot
        start_dt = datetime.combine(datetime.today(), ts.start_time)
        end_dt = datetime.combine(datetime.today(), ts.end_time)
        duration_hours = Decimal(str((end_dt - start_dt).seconds / 3600))
        new_amount = (duration_hours * booking.venue.price_per_hour).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        booking.total_amount = new_amount
        booking.save(update_fields=['total_amount', 'updated_at'])


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0005_alter_payment_payment_method'),
    ]

    operations = [
        migrations.RunPython(
            fix_timeslots_and_recalculate,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
