from google.appengine.ext import db

class User(db.Model):
    username = db.StringProperty()
    password = db.StringProperty()
    email = db.StringProperty()
    nickname = db.StringProperty()

class Room(db.Model):
    roomname = db.StringProperty()

class Task(db.Model):
    pass

class Message(db.Model):
    pass
