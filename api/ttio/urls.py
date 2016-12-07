from django.conf.urls import url
from django.contrib import admin
from ttio.views import *


urlpatterns = [
    url(r'^about$', about, name="about"),
    url(r'^conversation', conversation_VC, name="conversation"),
    url(r'^punish', punish, name="punish"),
    url(r'^reward', reward, name="reward"),
    url(r'^$', index, name="index"),
]