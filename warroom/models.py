from google.appengine.ext import ndb

class User(ndb.Model):
    username = ndb.StringProperty()
    password = ndb.StringProperty()
    email = ndb.StringProperty()
    nickname = ndb.StringProperty()

class Room(ndb.Model):
    roomname = ndb.StringProperty()
    admin = ndb.KeyProperty(kind=User)

class Task(ndb.Model):
    pass

class Message(ndb.Model):
    timestamp = ndb.DateTimeProperty(auto_now_add=True)
    room = ndb.KeyProperty(kind=Room)
    message = ndb.StringProperty()

