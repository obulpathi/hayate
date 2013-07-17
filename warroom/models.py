from google.appengine.ext import ndb

class Room(ndb.Model):
    roomname = ndb.StringProperty()
    projectid = ndb.StringProperty() # unique

class User(ndb.Model):
    username = ndb.StringProperty()
    password = ndb.StringProperty()
    email = ndb.StringProperty()
    nickname = ndb.StringProperty()
    rooms = ndb.KeyProperty(kind=Room, repeated=True)

# User was not available for Room declaration above
Room.admin = ndb.KeyProperty(kind=User)
    
class Task(ndb.Model):
    pass

# a message
class Message(ndb.Model):
    timestamp = ndb.DateTimeProperty(auto_now_add=True)
    room = ndb.KeyProperty(kind=Room)
    message = ndb.StringProperty()
    user = ndb.KeyProperty(kind=User)

# models a hayate session
class HSession(ndb.Model):
    whencreated = ndb.DateTimeProperty(auto_now_add=True)
    user = ndb.KeyProperty(kind=User)
    room = ndb.KeyProperty(kind=Room)
    sessionid = ndb.StringProperty()
    
