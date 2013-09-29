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

# descendent of Message to represent the replies in a conversation    
class ReplyMessage(Message):

    @classmethod
    def get_for_parent(cls, p_key):
        q = cls.query(ancestor=p_key)
        q = q.order(cls.timestamp)
        return q.iter()

class ActionItem(ndb.Model):
    timestamp = ndb.DateTimeProperty(auto_now_add=True)
    subject = ndb.StringProperty()
    action = ndb.StringProperty()
    status = ndb.IntegerProperty(choices=[0, 1], default=0)
    owner = ndb.KeyProperty(kind=User) # who owns this currently
    priority = ndb.IntegerProperty(choices=[1, 2, 3, 4, 5], default=3)

    @classmethod
    def get_all_for_user(cls, room_key, user_key):
        q = cls.query(ancestor=room_key)
        q = q.filter(cls.owner == user_key)
        return q.iter()


# child class of Message representing an update on a task/todo
# this is a descendent of Task/Todo
class ActionItemUpdate(Message):

    @classmethod
    def get_all_for_action_item(cls, a_key):
        """ takes key of an action item and returns all the updates
        with that as the parent
        """
        q = cls.query(ancestor=a_key)
        q = q.order(cls.timestamp)
        return q.iter()

# models a task in hayate
class Task(ActionItem):
    creator = ndb.KeyProperty(kind=User) # who created this task

    
# models a Todo otherwise aka self assigned task for a user
class Todo(ActionItem):
    pass

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

    @classmethod
    def get_sessions_for_user_room(cls, user_key, room_key):
        """ returns all the session objects for the passed in user-room combination
        """
        q = cls.query(cls.user == user_key)
        q = q.filter(cls.room == room_key)
        return q.iter()
