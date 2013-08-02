#!/usr/bin/python

""" Test Runner to run HAYATE tests 
"""

import sys
import unittest
import logging

# basic setup
sys.path.insert(0, 'C:\\google_appengine') # gae sdk path
import dev_appserver
dev_appserver.fix_sys_path()

from google.appengine.ext import ndb
from google.appengine.ext import testbed

from warroom import models
from warroom.library import globalKey

# base class for all the test case
class HTestCase(unittest.TestCase):

    def setUp(self):
        self.testbed = testbed.Testbed()
        self.testbed.activate()
        self.testbed.init_datastore_v3_stub()

    def tearDown(self):
        self.testbed.deactivate()

class SimpleTestCase(HTestCase):

    def testaddition(self):
        self.assertEqual(1+1, 2)

class MessageTest(HTestCase):

    def testMessageAdd(self):
        r_key = ndb.Key('Room', '1234', parent=globalKey())
        u_key = ndb.Key('User', '1234', parent=globalKey())
        m = models.Message(parent=r_key)
        message = 'Test Message'
        m.message = message
        m.user = u_key
        m_key = m.put()

        self.assertTrue(m_key is not None)
        m = m_key.get()
        self.assertTrue(m is not None)

        x = models.Message.get_recent(r_key, 10)
        for y in x:
            self.assertTrue(y is not None)
        

# to be run as a standalone
if __name__ == '__main__':
    unittest.main()
