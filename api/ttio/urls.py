from django.conf.urls import url
from django.contrib import admin
from ttio.views import *


urlpatterns = [
    url(r'^about$', about, name="about"),
    url(r'^question', question, name="question"),
    url(r'^response', response, name="response"),
    url(r'^punish', punish, name="punish"),
    url(r'^reward', reward, name="reward"),
    url(r'^model', model, name="model"),
    url(r'^nlp', nlp, name="nlp"),
    url(r'^$', index, name="index"),
]