# Helpers and other utils
import random

from google.appengine.ext import ndb

from django.http import HttpResponse
from django.forms.widgets import Input

class HttpTextResponse(HttpResponse):
  def __init__(self, text, status):
    super(HttpTextResponse, self).__init__(text, 'text/plain', status)

class HttpJsonResponse(HttpResponse):
  def __init__(self, text, status):
    super(HttpJsonResponse, self).__init__(text, 'application/json', status)    
    
class EmailInput(Input):
    input_type = 'email'

    def __init__(self, attrs):
        if attrs is not None:
            self.input_type = attrs.pop('type', self.input_type)
        super(EmailInput, self).__init__(attrs)

def randomString(length):
    x = ''
    for _ in range(length+1):
        x = x + str(random.randint(0, 9))
    return x

def globalKey():
    """ returns the key to be used to organize all dangling entities into a single
    entity group for strong consistency
    """
    return ndb.Key('Hayate', '1111')
