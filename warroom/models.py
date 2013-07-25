from google.appengine.ext import ndb

from warroom.library import globalKey

class User(ndb.Model):
    username = ndb.StringProperty()
    password = ndb.StringProperty()
    email = ndb.StringProperty()
    nickname = ndb.StringProperty()

    @classmethod
    def exists(cls, email):
        return cls.query(cls.email == email).get() is not None
    
class Room(ndb.Model):
    projectid = ndb.StringProperty() # unique
    description = ndb.TextProperty()
    users = ndb.KeyProperty(kind=User, repeated=True)
    admin = ndb.KeyProperty(kind=User)

    @classmethod
    def get_eligible_rooms(cls, user_key):
        q = cls.query(ancestor=globalKey())
        q.filter(Room.users == user_key)
        q.filter(Room.admin == user_key)
        return q.iter() # returning an iterable
    
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

    def is_admin(self):
        """ checks if the current user is the admin of the room
        """
        return self.room.get().admin == self.user 
    
