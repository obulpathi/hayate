from django.conf.urls import *

urlpatterns = patterns(
    'warroom.views',
    url(r'login/?$', 'login'),
    url(r'signup/?$', 'signup'),
    url(r'logout/?$', 'logout'),
    url(r'rooms/create/?$', 'create_room'),
    url(r'rooms/add_member/?$', 'add_member'),
    url(r'messages/add/?$', 'add_message'),
    url(r'messages/?$', 'messages'),
    url(r'rooms/?$', 'rooms'),
    url(r'_ah/channel/connected/$', 'channel_connect'),
    url(r'_ah/channel/disconnected/$', 'channel_disconnect'),
    url(r'users/?$', 'users'),
    url(r'^/?$', 'index'),
    )
