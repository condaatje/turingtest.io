from __future__ import unicode_literals
from django.db import models
from django.contrib.postgres.fields import JSONField

# each question can have many seen answers. I think there should be a one to many relationship.
# or perhaps many-to-many down the line for backpropogation
# class Question(models.Model):
#     question = models.CharField(max_length=255) #TODO size
    
    
# class Response(models.Model):
#     question = models.ForeignKey(Question, related_name='question')
#     response = models.CharField(max_length=255) #TODO size

#Dumb conversation model: consists only of a question and a response. Independent.
class Conversation(models.Model):
    question = models.TextField()
    responses = JSONField()
    failures = models.IntegerField(default=1) #TODO do we like this being 1 default failure?
        # should we also consider having this be a fail rate instead of a counter?
        # so percent failure is what leads to a question getting 
        # sent to the humans to answer (means that new questions don't get left behind)