from django.conf.urls.defaults import *

urlpatterns = patterns(
    'warroom.views',
    url(r'login', 'login'),
    url(r'signup', 'signup'),
    url(r'', 'index'),
    )
