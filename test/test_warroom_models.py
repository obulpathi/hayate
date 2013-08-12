#!/usr/bin/python

""" Test Runner to run HAYATE tests 
"""

import sys
import unittest
import logging

import test_setup

# basic setup
sys.path.insert(0, test_setup.GAE_SDK_PATH) 
import dev_appserver
dev_appserver.fix_sys_path()

from google.appengine.ext import ndb
from google.appengine.ext import testbed

from warroom import models
from warroom.library import globalKey
from warroom.htestcase import HTestCase

class SimpleTestCase(HTestCase):

    def testaddition(self):
        self.assertEqual(1+1, 2)

class MessageTestCase(HTestCase):

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
