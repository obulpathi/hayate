from django.conf.urls import *

urlpatterns = patterns(
    'warroom.views',
    url(r'login', 'login'),
    url(r'signup', 'signup'),
    url(r'logout', 'logout'),
    url(r'^$', 'index'),
    )
