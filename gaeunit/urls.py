# -*- coding: utf-8 -*-
from django.conf.urls import *

urlpatterns = patterns('gaeunit.gaeunit',
    ('/run', 'django_json_test_runner'),
    ('.*', 'django_test_runner'),
)
