from django.conf.urls import url
from django.contrib import admin
from ttio.views import index, about, model_VC


urlpatterns = [
    url(r'^about$', about, name="about"),
    url(r'^model$', model_VC, name="model"),
    url(r'^$', index, name="index"),
]