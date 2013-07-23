import logging
import hashlib

from google.appengine.ext import ndb

from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render
from django import forms

from warroom import models
from warroom import salt
from warroom.library import HttpTextResponse, EmailInput
from warroom.library import globalKey, randomString

# --------- decorators --------
# factored out from rietveld/codereview/views.py - http://codereview.appspot.com for more

# XXX - this is very fragile - replace with decent logic
def login_required(func):
    def login_wrapper(request, *args, **kwds):
        if request.get_signed_cookie('hsession', None) is None:
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
        s_qry = models.HSession.query(ancestor=globalKey())
        s_qry.filter(models.HSession.sessionid == sid)
        s = s_qry.get()
    return s
    
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
        r = r_key.get()
        return render(request, 'index.html', {'member': u.nickname,
                                          'room': r.projectid})

def login(request):
    if request.method == 'GET':
        return render(request, 'login.html', {})
    elif request.method == 'POST':
        email = request.POST.get('email')
        password = request.POST.get('password')
        # query the DB for password and compare
        q = models.User.query(ancestor=globalKey())
        q.filter(models.User.email == email)
        u = q.get()

        if u is None:
            return render(request, 'login.html', {'error': 'Invalid email! You might want to signup first!'})
        
        if u.password == hashlib.sha256(password+salt.Salt.salt()).hexdigest():
            # valid user
            # create a session
            s = models.HSession(parent=globalKey()) # dummy key which acts as parent for all entities in Hayate
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
        rooms = models.Room.get_eligible_rooms(u.key)
        room_list = []
        if rooms is not None:
            for r in rooms:
                room_list.append({'id': r.key.id(), 'projectid': r.projectid})
        return render(request, 'rooms.html', {'member': u.nickname,
                                              'rooms': room_list})
    elif request.method == 'POST':
        r_id = request.POST['room']
        logging.info('room_id:'+ r_id)
        r_key = ndb.Key('Room', int(r_id), parent=globalKey())
        logging.info('r_key: ' + str(r_key))
        s.room = r_key
        s.put()
        return HttpResponseRedirect('/')

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
            r = models.Room(parent=globalKey())
            r.projectid = form.cleaned_data.get('projectid').upper()
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
        logging.info('signup data posted')
        form = SignUpForm(request.POST)
        if form.is_valid():
            u = models.User(parent=globalKey())
            u.username = form.cleaned_data.get('username')
            u.email = form.cleaned_data.get('email')
            password = form.cleaned_data.get('password')
            u.password = hashlib.sha256(password+salt.Salt.salt()).hexdigest()
            u.nickname = form.cleaned_data.get('nickname')
            u.put()
            return HttpResponseRedirect('/')
        else:
            return render(request, 'signup.html', {'form': form})
    else:
        # unsupported raise 404 ?!
        pass
    
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
