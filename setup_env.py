import os
import sys

sys.path = ['C:\\tries\\hayate',
 'C:\\google_appengine',
 'C:\\google_appengine\\lib\\protorpc',
 'C:\\google_appengine',
 'C:\\Python27\\DLLs',
 'C:\\Python27\\lib',
 'C:\\Python27',
 'C:\\google_appengine\\lib\\django-1.5',
 'C:\\google_appengine\\lib\\webapp2-2.3',
 'C:\\google_appengine\\lib\\webob-1.1.1',
 'C:\\google_appengine\\lib\\yaml-3.10']

os.chdir('C:\\tries\\hayate')
os.environ['DJANGO_SETTINGS_MODULE'] = 'settings'
os.environ['APPLICATION_ID'] = 'hayate'
os.environ['SERVER_SOFTWARE'] = 'Development'

# setup database
datastore_file = '/dev/null'
app_id = 'hayate'
from google.appengine.api import apiproxy_stub_map,datastore_file_stub
apiproxy_stub_map.apiproxy = apiproxy_stub_map.APIProxyStubMap() 
stub = datastore_file_stub.DatastoreFileStub(app_id, datastore_file, '/')
apiproxy_stub_map.apiproxy.RegisterStub('datastore_v3', stub)
