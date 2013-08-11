"""
Implementation of google's channel like functionality

- this is more customized for HAYATE
- __NO__ protocol conformance - might have to do sometime
- might become useless when google app engine comes up with
  solid implementation for channel or websockets
  
"""

import logging

from google.appengine.api import memcache

# reference: http://neopythonic.blogspot.in/2011/08/compare-and-set-in-memcache.html
def _set(key, msg):
    # helper again
    client = memcache.Client()
    if client.gets(key) is None:
        client.add(key, msg)
    else:
        while True:
            client.gets(key)
            if client.cas(key, msg):
                break

def _get(key):
    client = memcache.Client()
    return client.gets(key)
    
def _flush_cache_for_key(key):
    # helper to set the memcache value for the key to []
    _set(key, '[]')    
    
def create_channel(key, new=False):
    """
    if new is True, creates an empty queue in memcache
    else, just return empty string.

    this is to be compatible with google.appengine.api.channel
    """
    
    if not new:
        return key

    if _get(key) is None:
        _set(key, '[]')

def flush_channel(key):
    """ flushes the channel for the key. to be used when user changes room
    """
    
    _flush_cache_for_key(key)

def send_message(key, message):
    """
    finds the message for key in memcache. this is a stringified python list
    appends the message to it and sets it back in memcache

    message should be a python dictionary or JSON
    """

    try:
        m = _get(key)

        # channel should be open by now
        if m is None:
            return

        m = eval(m)
        m.append(message)
        _set(key, repr(m))        
    except Exception as e:
        logging.info(str(e))

def get_message(key):
    """
    this is not present in google.appengine.api.channel

    this function is to be used with the HTTP endpoint serving the
    polls for messages

    check if the key is present in the memcache. else XXX: NO IDEA how to handle this!!
    if returned value is a stringified empty list, just return it
    else set empty list on memcache and return
    """

    m = _get(key)

    if m is not None:
        m = eval(m)
    else:
        m = []

    if m == []:
        return m
    else:
        _flush_cache_for_key(key)
        return m
