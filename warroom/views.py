import logging
import hashlib
import json
import time

from google.appengine.ext import ndb
from google.appengine.api import channel

from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render
from django import forms
from django.views.decorators.csrf import csrf_exempt

from warroom import models
from warroom import salt
from warroom.library import HttpTextResponse, EmailInput
from warroom.library import globalKey, randomString

# --------- decorators --------
# some borrowed from rietveld/codereview/views.py - http://codereview.appspot.com for more

def login_required(func):
    def login_wrapper(request, *args, **kwds):
        s = get_session(request)
        if s is None:
            return render(request, 'login.html', {})
        else:
            return func(request, *args, **kwds)
    return login_wrapper

def post_required(func):
    def post_wrapper(request, *args, **kwds):
        if request.method != 'POST':
            return HttpTextResponse('Only POST is supported in this URL', 405)
        else:
            return func(request, *args, **kwds)
    return post_wrapper    

# utils
def get_session(request):
    """ Takes a request object and returns the session object corresponding
    to the sessionid in hsession cookie
    """
    sid = request.get_signed_cookie('hsession', None)
    if sid is None:
        return None
    else:
        # note: looks like query objects are non-mutable
        s_qry = models.HSession.query(ancestor=globalKey())
        s_qry = s_qry.filter(models.HSession.sessionid == sid)
        s = s_qry.get()
    return s

def get_message(m):
    """ takes a models.Message object and returns JSON representation
    for the same.
    """
    _msgformat = '{"user": "%s", "timestamp": "%s", "message": "%s", "id": "%s"}'
    msg = _msgformat % (m.user.get().username,
                        str(m.timestamp.strftime('%Y/%m/%d %H:%M:%S')),
                        m.message,
        m.key.id())
    msg = msg.replace("'", "\'")
    return json.loads(msg)

def encode_password(p):
    """ takes a password plain text and encodes it as per hayate's password
    handling policy
    """
    return hashlib.sha256(''.join([p, salt.Salt.salt()])).hexdigest()

def send_updates(client_key, updates):
    """ takes any python datastructure passed in and dumps that into the
    channel for the client key passed
    """
    channel.send_message(client_key, json.dumps(updates))
    
    
# --------- forms ---------   
class SignUpForm(forms.Form):
    email = forms.EmailField(label='Email:', widget=EmailInput(attrs={}))
    password = forms.CharField(label='Password:', widget=forms.PasswordInput)
    password1 = forms.CharField(label='Password confirmation:', widget=forms.PasswordInput)
    username = forms.CharField(label='Your name:')
    nickname = forms.CharField(label='Your Nick Name:')

class CreateRoomForm(forms.Form):
    projectid = forms.CharField(label='Project Code(must be unique):', max_length=4)
    description = forms.CharField(label='Enter a short description here', widget=forms.Textarea)
    
@login_required
def index(request): 
    # get the session id and check if it is active
    s = get_session(request)
    if s is None:
        return render(request, 'login.html', {})
    else:
        # XXX: change the logic to redirect as per the below policy
        # if the total number of rooms for the user is 1, redirect to that room
        # else redirect to the list of rooms
        u_key = s.user
        u = u_key.get()
        r_key = s.room

        # redirect to rooms selection if user dint choose a room yet
        if r_key is None:
            return HttpResponseRedirect('/rooms')
    
        r = r_key.get()

        # create a channel based using sessionid as the key
        token = channel.create_channel(s.sessionid)
        logging.info('created token: ' + str(token))
        return render(request, 'index.html', {'member': u.nickname,
                                          'room': r.projectid,
                                          'admin': s.is_admin(),
                                          'token': token
                                          })
    
def login(request):
    if request.method == 'GET':

        # user is logged in already
        s = get_session(request)
        if s is not None:
            return HttpResponseRedirect('/')

        return render(request, 'login.html', {})
    elif request.method == 'POST':
        email = request.POST.get('email')
        password = request.POST.get('password')
        u = models.User.get_by_id(email, parent=globalKey())

        if u is None:
            return render(request, 'login.html', {'error': 'Invalid email! You might want to signup first!'})

        if u.password == encode_password(password):
            # valid user
            # create a session
            s = models.HSession(parent=globalKey())
            s.user = u.key
            s.sessionid = randomString(15)
            s.put()
            response =  HttpResponseRedirect('/rooms')
            response.set_signed_cookie('hsession', s.sessionid)
            return response
        else:
            return render(request, 'login.html', {'error': 'Invalid password for this email!',
                                                  'email': email})
    else:
        # unsupported raise 404 ?!
        pass

@login_required    
def rooms(request):
    # get the session id and check if it is active
    s = get_session(request)
    u = None
    if s is None:
        return render(request, 'login.html', {})
    else:
        u_key = s.user
        u = u_key.get()

    if request.method == 'GET':
        error = request.GET.get('e', None)
        if error == 'no_room':
            error = 'Please choose a room!'
        rooms = models.Room.get_eligible_rooms_for_user(u.key)
        room_list = []
        if rooms is not None:
            for r in rooms:
                room_list.append({'id': r.key.id(), 'projectid': r.projectid})
        return render(request, 'rooms.html', {'member': u.nickname,
                                              'rooms': room_list,
                                              'error': error})
    elif request.method == 'POST':
        r_id = request.POST.get('room', None)

        if r_id is None:
            return HttpResponseRedirect('/rooms?e=no_room')

        r_key = ndb.Key('Room', int(r_id), parent=globalKey())
        s.room = r_key
        s.put()
        return HttpResponseRedirect('/')
    
@login_required
def create_room(request):
    # get the session id and check if it is active
    u = None
    s = get_session(request)
    if s is None: # first login to create a room
        return render(request, 'login.html', {})
    else:
        u_key = s.user
        u = u_key.get()
    
    if request.method == 'GET':
        form = CreateRoomForm(auto_id='%s')
        return render(request, 'create_room.html', {'member': u.nickname,
                                                    'form': form})
    elif request.method == 'POST':
        logging.info('room creation request')
        form = CreateRoomForm(request.POST)
        if form.is_valid():
            projectid = form.cleaned_data.get('projectid').upper()

            # make sure that the user doesn't create a duplicate room
            p = models.Room.query(models.Room.projectid == projectid).get()
            if p is not None: # project code is already used
                return render(request, 'create_room.html', {'form': form,
                                                            'error': 'Project code already in use!'})
    
            r = models.Room(parent=globalKey())
            r.projectid = projectid
            r.description = form.cleaned_data.get('description')
            r.admin = u.key # current user is the admin
            r.put()
            response = HttpResponseRedirect('/rooms')
            return response
        else:
            return render(request, 'create_room.html', {'form': form})
        
def signup(request):
    if request.method == 'GET':
        form = SignUpForm(auto_id='%s')
        return render(request, 'signup.html', {'form': form})
    elif request.method == 'POST':
        form = SignUpForm(request.POST)
        if form.is_valid():

            # check if user exists already
            if models.User.get_by_id(form.cleaned_data.get('email'), parent=globalKey()) is not None:
                return render(request, 'signup.html', {'form': form,
                                                       'error': 'Email already exists!'
                                                       })
            
            u = models.User(parent=globalKey(), id=form.cleaned_data.get('email')) # email is the unique id
            u.username = form.cleaned_data.get('username')
            u.email = form.cleaned_data.get('email')
            password = form.cleaned_data.get('password')
            u.password = encode_password(password)
            u.nickname = form.cleaned_data.get('nickname')
            u.put()
            return HttpResponseRedirect('/')
        else:
            return render(request, 'signup.html', {'form': form})
    else:
        # unsupported raise 404 ?!
        pass

@login_required    
@post_required
def logout(request):
    logging.info('logout initialized')
    request.session.flush()

    # delete the current session
    s = get_session(request)
    if s is None: # no active session
        return render(request, 'login.html', {})
    else: # delete it
        s.key.delete()

    response = render(request, 'login.html', {})
    response.delete_cookie('hsession')
    return response

@login_required    
@post_required
def add_member(request):
    s = get_session(request)
    # XXX: assuming active session always, at this point
    email = request.POST.get('email')

    # check if the user has an account already in Hayate
    # if yes, just add him
    # else, send an invite TODO
    u = s.user.get()
    if u.email == email:
        return HttpTextResponse('You are already in the room!', 200)
    else:
        u = models.User.get_by_id(email, parent=globalKey())
        if u:
            r = s.room.get()
            if r.is_user_present(u.key):
                return HttpTextResponse('User already present in room!', 200)
            else:
                r.users.append(u.key)
                r.put()
                return HttpTextResponse('Successfully added!', 200)
        else:
            # TODO: add the logic to send an invite email to passed in email
            # and inform the same to user i.e. Invite sent!
            return HttpTextResponse('User not present in Hayate!', 200)

@login_required
def messages(request):
    if request.method == 'GET':
        s = get_session(request)
        messages = []
        replies = {}

        try:
            for m in models.Message.get_recent(s.room, 10):
                r = []
                for c in models.ReplyMessage.get_for_parent(m.key):
                    r.append(get_message(c))
                replies[m.key.id()] = r
                messages.append(get_message(m))
        except Exception as e:
            logging.info(str(e))

        update = {"messages": messages, "replies": replies}

        try:
            send_updates(s.sessionid, update)
        except Exception as e:
            logging.info(str(e))

        return HttpTextResponse('', 200)
    else:
        return HttpTextResponse('Only GET is allowed in this endpoint', 404)

@login_required
@post_required
def add_message(request):

    message = request.POST.get('message', None)
    conv_id = request.POST.get('conv_id', None)

    if message is None:
        logging.error('add_message: empty message from client')
        return HttpTextResponse('', 200)

    # XXX: think of a clean fix!
    message = message.replace('"', "'")
    s = get_session(request)
    r = s.room.get()

    # all the messages have corresponding room as the ancestor by default
    anc = r.key

    # check if the message belongs to a conversation, if yes
    # add it to appropriate conversation
    if conv_id is not None:
        anc = ndb.Key('Message', int(conv_id), parent=r.key)
        m = models.ReplyMessage(parent=anc)
    else:
        m = models.Message(parent=anc)
        
    m.user = s.user
    m.message = message
    m.put()

    messages = []
    try:
        messages.append(get_message(m))
    except Exception as e:
        logging.info(str(e))

    # messages are replies if the conv_id is not None
    if conv_id is None:
        update = {"messages": messages}
    else:
        update = {"replies": {conv_id: messages}}

    logging.info(str(update))
            
    try:
        for _s in models.HSession.get_all_sessions_for_room(s.room):
            send_updates(s.sessionid, update)
    except Exception as e:
        logging.info(type(e))

    return HttpTextResponse('', 200)

# following requests come from google's channel JS API.
# so, they won't have any CSRF information and hence the exempt
@csrf_exempt    
def channel_connect(request):
    # XXX: add logic to update all the clients that this user has come online
    sid = request.POST.get('from')
    s = models.HSession.get_session_for_session_id(sid)
    logging.info(s.user.get().username+' connected to room '+s.room.get().projectid)
    return HttpTextResponse('', 200)

@csrf_exempt
def channel_disconnect(request):
    # XXX: add logic to update all the clients that this user has gone offline
    sid = request.POST.get('from')
    s = models.HSession.get_session_for_session_id(sid)
    logging.info(s.user.get().username+' disconnected and was in room '+s.room.get().projectid)
    return HttpTextResponse('', 200)
