# -*- coding: utf-8 -*-
# Generated by Django 1.10.3 on 2016-12-09 06:34
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ttio', '0003_conversation_failures'),
    ]

    operations = [
        migrations.AddField(
            model_name='conversation',
            name='frequency',
            field=models.IntegerField(default=1),
        ),
    ]
