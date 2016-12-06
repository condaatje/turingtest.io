from __future__ import unicode_literals

from django.db import models

# Create your models here.

#TODO basic 'dumb' learner: 
class Dumb_Learner(models.Model):
    question = models.CharField(max_length=140)
    answer = models.CharField(max_length=140)



