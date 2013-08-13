import logging

from google.appengine.ext import ndb

from warroom.library import globalKey

class User(ndb.Model):
    username = ndb.StringProperty()
    password = ndb.StringProperty()
    email = ndb.StringProperty()
    nickname = ndb.StringProperty()
    
class Room(ndb.Model):
    projectid = ndb.StringProperty() # unique
    description = ndb.TextProperty()
    users = ndb.KeyProperty(kind=User, repeated=True)
    admin = ndb.KeyProperty(kind=User)

    @classmethod
    def get_eligible_rooms_for_user(cls, user_key):
        q = cls.query(ndb.OR(cls.admin == user_key, cls.users == user_key), ancestor=globalKey())
        return q.iter() # returning an iterable

    def is_user_present(self, user_key):
        return user_key in self.users
    
class Task(ndb.Model):
    pass

# a message
# descendent of Room
class Message(ndb.Model):
    timestamp = ndb.DateTimeProperty(auto_now_add=True)
    message = ndb.StringProperty()
    user = ndb.KeyProperty(kind=User)

    @classmethod
    def get_recent(cls, room_key, n):
        """ returns recent n messages in the room with room_key
        """
        q = cls.query(ancestor=room_key)
        q = q.order(cls.timestamp)
        return q.iter()

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

    @classmethod
    def get_all_sessions_for_room(cls, room_key):
        """ returns all the sessions in the room
        """
        q = cls.query(cls.room == room_key)
        return q.iter()

    @classmethod
    def get_session_for_session_id(cls, sid):
        """ returns the session object for the passed in session id
        """
        q = cls.query(cls.sessionid == sid)
        return q.get()
