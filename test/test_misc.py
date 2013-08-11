#!/usr/bin/python

""" Test Runner to run misc HAYATE tests 
"""

import sys
import unittest
import logging

# to get the GAE SDK PATH
import test_setup

# basic setup
sys.path.insert(0, test_setup.GAE_SDK_PATH) 
import dev_appserver
dev_appserver.fix_sys_path()

from google.appengine.ext import ndb
from google.appengine.ext import testbed
from google.appengine.api import memcache

from warroom import models, hchannel as channel
from warroom.library import globalKey
from warroom.htestcase import HTestCase

class ChannelTestCase(HTestCase):

    #@unittest.skip('for time being')
    def testChannelCreate(self):
        # bakcwards compatible check
        x = channel.create_channel('1234') # returns the key back
        self.assertEqual(x, '1234')
        y = memcache.get('1234')
        self.assertIsNone(y)

        # create_channel - empty queue
        x = channel.create_channel('1234', True)
        y = memcache.get('1234')
        self.assertIsNotNone(y)

    #@unittest.skip('for time being')
    def testChannelSendMessage(self):
        x = channel.create_channel('1234', True)
        channel.send_message('1234', {'One':1})
        y = memcache.get('1234')
        self.assertEqual(eval(y), [{'One':1}])
        channel.send_message('1234', {'Two':2})
        y = memcache.get('1234')
        self.assertEqual(eval(y), [{'One':1}, {'Two':2}])

    #@unittest.skip('for time being')        
    def testChannelGetMessage(self):
        x = channel.create_channel('1234', True)
        channel.send_message('1234', {'One':1})
        y = channel.get_message('1234')
        self.assertEqual(y, [{'One':1}])
        # after get_message, memcache should be empty
        m = memcache.get('1234')
        self.assertIsNotNone(m)
        self.assertEqual(eval(m), [])

        # one more
        channel.send_message('1234', {'One':1})        
        channel.send_message('1234', {'Two':2})
        y = channel.get_message('1234')
        self.assertEqual(y, [{'One':1}, {'Two':2}])
        # after get_message, memcache should be empty
        m = memcache.get('1234')
        self.assertIsNotNone(m)
        self.assertEqual(eval(m), [])

        for i in range(100):
            channel.create_channel(str(i), True)
            channel.send_message(str(i), {'Test': i})

        for i in range(100):
            y = channel.get_message(str(i))
            self.assertEqual(y, [{'Test': i}])
            m = memcache.get(str(i))
            self.assertIsNotNone(m)

if __name__ == '__main__':
    unittest.main()
