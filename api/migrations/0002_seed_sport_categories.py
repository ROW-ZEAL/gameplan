import uuid

from django.db import migrations


CATEGORIES = ["Futsal", "Tennis", "Badminton", "Cricket"]


def seed_categories(apps, schema_editor):
    SportCategory = apps.get_model("api", "SportCategory")
    for name in CATEGORIES:
        SportCategory.objects.get_or_create(name=name)


def unseed_categories(apps, schema_editor):
    SportCategory = apps.get_model("api", "SportCategory")
    SportCategory.objects.filter(name__in=CATEGORIES).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_categories, reverse_code=unseed_categories),
    ]
