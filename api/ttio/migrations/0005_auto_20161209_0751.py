# -*- coding: utf-8 -*-
# Generated by Django 1.10.3 on 2016-12-09 07:51
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ttio', '0004_conversation_frequency'),
    ]

    operations = [
        migrations.AlterField(
            model_name='conversation',
            name='failures',
            field=models.IntegerField(default=0),
        ),
    ]
