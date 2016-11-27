from django.conf.urls import url
from django.contrib import admin
from ttio.views import index, about

urlpatterns = [
    url(r'^', index, name="index"),
    url(r'^about', about, name="about"),
]