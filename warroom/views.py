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

def get_message_json(m):
    """ takes a models.Message object and returns JSON representation
    for the same.
    """
    _msgformat = '{"user": "%s", "timestamp": "%s", "message": "%s", "id": "%s"}'
    msg = _msgformat % (m.user.get().username,
                        str(m.timestamp.strftime('%Y/%m/%d %H:%M:%S')),
                        m.message,
        m.key.id())
    msg = msg.replace("'", "\'")
    return json.loads(msg, strict=False)

def get_user_json(u, status="online"):
    """takes a models.User object and returns JSON representation
    for the same
    """
    _msgformat = '''{
        "id": "%s",
        "username": "%s",
        "email": "%s",
        "nickname": "%s",
        "status": "%s"}'''
    msg = _msgformat % (u.key.id(), u.username, u.email, u.nickname, status)
    msg = msg.replace("'", "\'")
    return json.loads(msg, strict=False)

def get_action_item_json(a):
    """ takes a models.ActionItem (Task/Todo in real time) and returns
    JSON representation for the same
    """
    _msgformat = '''{
    "owner": "%s",
    "timestamp": "%s",
    "subject": "%s",
    "action": "%s",
    "status": "%s",
    "priority": "%s",
    "creator": "%s",
    "id": "%s",
    "type": "%s"
    }'''

    creator = getattr(a, 'creator', None)
    owner = a.owner.get().nickname
    if creator is None: creator = owner # for todos
    else: creator = creator.get().nickname # task

    type_ = 'task'
    if isinstance(a, models.Todo):
        type_ = 'todo'

    msg = _msgformat % (owner, str(a.timestamp.strftime('%Y/%m/%d %H:%M:%S')),
                        a.subject, a.action, a.status, a.priority, creator,
                        a.key.id(), type_)
    msg = msg.replace("'", "\'")

    return json.loads(msg, strict=False)

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

def update_room(room_key, updates):
    """ takes a hayate room's key, an update and sends the update
    to all the active sessions in that room
    """
    try:
        for _s in models.HSession.get_all_sessions_for_room(room_key):
            send_updates(_s.sessionid, updates)
    except Exception as e:
        logging.info(type(e))

    
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
        #logging.info('created token: ' + str(token))
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

        # also get the user out of his current room, ofcourse after notifying others
        if s.room is not None:

            # tell others in the room that this user is out of room
            u = s.user.get()
            users = []
            users.append(get_user_json(u, 'offline'))
            updates = {"users": users}
            update_room(s.room, updates)
            
            # now get the user out
            s.room = None
            s.put()
        
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
        #logging.info('room creation request')
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
    #logging.info('logout initialized')
    request.session.flush()

    s = get_session(request)
    # if the session has been active yet, notify the room about the logout
    if s is not None:
        u = s.user.get()
        users = []
        users.append(get_user_json(u, 'offline'))
        updates = {"users": users}
        update_room(s.room, updates)

    # delete the current session
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
                    r.append(get_message_json(c))
                replies[m.key.id()] = r
                messages.append(get_message_json(m))
        except Exception as e:
            logging.info(str(e))

        update = {"messages": messages, "replies": replies}

        #logging.info(str(update))

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
        messages.append(get_message_json(m))
    except Exception as e:
        logging.info(str(e))

    # messages are replies if the conv_id is not None
    if conv_id is None:
        update = {"messages": messages}
    else:
        update = {"replies": {conv_id: messages}}

    #logging.info(str(update))
            
    try:
        for _s in models.HSession.get_all_sessions_for_room(s.room):
            send_updates(_s.sessionid, update)
    except Exception as e:
        logging.info(type(e))

    return HttpTextResponse('', 200)

@login_required
def users(request):
    # send {users: ...} update in the requesting channel
    if request.method == 'GET':

        try:
            s = get_session(request)
            r = s.room.get()
            all_users = r.users
            all_users.append(r.admin)
            active_users = [_s.user for _s in models.HSession.get_all_sessions_for_room(s.room)]
    
            users = []
            for _u in all_users:
                status = 'online' if _u in active_users else 'offline'
                u = _u.get()
                users.append(get_user_json(u, status))
        except Exception as e:
            logging.error(str(e))
            
        updates = {"users": users}
        #logging.info(str(updates))
        send_updates(s.sessionid, updates)
        return HttpTextResponse('', 200)
    else:
        return HttpTextResponse('Only GET is supported in this endpoint', 404)

@login_required
@post_required
def create_todo(request):
    try:
        s = get_session(request)
        subject = request.POST.get('subject', None)
        action = request.POST.get('action', None)

        todo = models.Todo(parent=s.room)
        todo.subject = subject
        todo.action = action
        todo.owner = s.user

        todo.put()

        # update the session
        todos = []
        todos.append(get_action_item_json(todo))
        updates = {"todos": todos}
        for _s in models.HSession.get_sessions_for_user_room(s.user, s.room):
            send_updates(_s.sessionid, updates)        

        return HttpTextResponse('', 200)
    except Exception as e:
        logging.error(str(e))

@login_required
@post_required
def create_task(request):
    try:
        s = get_session(request)
        subject = request.POST.get('subject', None)
        action = request.POST.get('action', None)
        owner = request.POST.get('for_user', None)

        # if the owner and current user are same, it is a todo
        if owner == s.user.get().email:
            return create_todo(request)

        owner = models.User.get_by_id(owner, parent=globalKey())
        
        task = models.Task(parent=s.room)
        task.subject = subject
        task.action = action
        task.creator = s.user
        task.owner = owner.key

        task.put()

        # update the session
        tasks = []
        tasks.append(get_action_item_json(task))
        updates = {"tasks": tasks}
        for _s in models.HSession.get_sessions_for_user_room(owner.key, s.room):
            send_updates(_s.sessionid, updates)        

        return HttpTextResponse('', 200)
    except Exception as e:
        logging.error(str(e))
        
@login_required
def tasks(request):
    """ serves /tasks and returns JSON of all the tasks and todos for
    the requesting user in the current room
    """
    if request.method == 'GET':
        try:
            s = get_session(request)
            tasks = []
            task_updates = {}
            for t in models.Task.get_all_for_user(s.room, s.user):
                tasks.append(get_action_item_json(t))
                replies = []
                for u in models.ActionItemUpdate.get_all_for_action_item(t.key):
                    replies.append(get_message_json(u))
                task_updates[t.key.id()] = replies

            todos = []
            todo_updates = {}
            for t in models.Todo.get_all_for_user(s.room, s.user):
                todos.append(get_action_item_json(t))
                replies = []
                for u in models.ActionItemUpdate.get_all_for_action_item(t.key):
                    replies.append(get_message_json(u))
                todo_updates[t.key.id()] = replies

            updates = {"tasks": tasks, "todos": todos, "task_updates": task_updates, "todo_updates": todo_updates}
            send_updates(s.sessionid, updates)

            # all done
            return HttpTextResponse('', 200)
        except Exception as e:
            logging.error(str(e))
            return HttpTextResponse('Internal server error', 500)
    else:
        return HttpTextResponse('Only GET is supported in this endpoint', 200)

@login_required
@post_required
def respond_task(request):
    """ takes a response from user on a task and creates a ActionItemUpdate
    entity with the task as the parent
    """
    task_id = request.POST.get('task_id', None)
    message = request.POST.get('message', None)

    if task_id is None or message is None:
        return HttpTextResponse('No inputs to process', 400)

    try:
        s = get_session(request)
        t_key = ndb.Key('Task', int(task_id), parent=s.room)

        # re-assign the task to the creator
        t = t_key.get()
        t.owner = t.creator
        t.creator = s.user
        t.put()

        m = models.ActionItemUpdate(parent=t_key)
        m.user = s.user
        m.message = message
        m.put()

        # update the user sessions
        tasks = []
        tasks.append(get_action_item_json(t))

        task_updates = []
        for u in models.ActionItemUpdate.get_all_for_action_item(t_key):
            task_updates.append(get_message_json(u))
    
        updates = {"tasks": tasks, "task_updates": {task_id: task_updates}}
        for _s in models.HSession.get_sessions_for_user_room(t.owner, s.room):
            send_updates(_s.sessionid, updates)                

        return HttpTextResponse('', 200)
    except Exception as e:
        logging.info(str(e))

@login_required
@post_required
def update_todo(request):
    """ updates a todo with the status by user
    """
    task_id = request.POST.get('task_id', None)
    message = request.POST.get('message', None)

    if task_id is None or message is None:
        return HttpTextResponse('No inputs to process', 400)

    try:
        s = get_session(request)
        t_key = ndb.Key('Todo', int(task_id), parent=s.room)

        t = t_key.get()

        m = models.ActionItemUpdate(parent=t_key)
        m.user = s.user
        m.message = message
        m.put()

        # update the user sessions
        todo_updates = []

        todo_updates.append(get_message_json(m))
        
        updates = {"todo_updates": {task_id: todo_updates}}
        for _s in models.HSession.get_sessions_for_user_room(t.owner, s.room):
            send_updates(_s.sessionid, updates)                

        return HttpTextResponse('', 200)
    except Exception as e:
        logging.info(str(e))

@login_required
@post_required
def close_task(request):
    """ closes a task with the message 
    """
    task_id = request.POST.get('task_id', None)
    message = request.POST.get('message', None)

    if task_id is None or message is None:
        return HttpTextResponse('No inputs to process', 400)

    try:
        s = get_session(request)
        t_key = ndb.Key('Task', int(task_id), parent=s.room)

        t = t_key.get()

        if t is None:
            t_key = ndb.Key('Todo', int(task_id), parent=s.room)
            t = t_key.get()
        else:
            # it is a task - reassign
            t.owner = t.creator
            t.creator = s.user

        t.status = 1
        t.put()
        
        m = models.ActionItemUpdate(parent=t_key)
        m.user = s.user
        m.message = message
        m.put()

        
        tasks = []
        task_updates = {}
        todos = []
        todo_updates = {}

        if isinstance(t, models.Task):
            tasks.append(get_action_item_json(t))
            replies = []
            for u in models.ActionItemUpdate.get_all_for_action_item(t.key):
                replies.append(get_message_json(u))
            task_updates[t.key.id()] = replies
            
        else:
            todos.append(get_action_item_json(t))
            replies = []
            for u in models.ActionItemUpdate.get_all_for_action_item(t.key):
                replies.append(get_message_json(u))
            todo_updates[t.key.id()] = replies

        updates = {"tasks": tasks, "todos": todos, "task_updates": task_updates, "todo_updates": todo_updates}
        for _s in models.HSession.get_sessions_for_user_room(t.owner, s.room):
            send_updates(_s.sessionid, updates)                
        
        return HttpTextResponse('', 200)
    except Exception as e:
        logging.info(str(e))    
        
# following requests come from google's channel JS API.
# so, they won't have any CSRF information and hence the exempt
@csrf_exempt    
def channel_connect(request):
    # XXX: add logic to update all the clients that this user has come online
    sid = request.POST.get('from')
    s = models.HSession.get_session_for_session_id(sid)
    logging.info(s.user.get().username+' connected to room '+s.room.get().projectid)

    u = s.user.get()
    users = []
    users.append(get_user_json(u))
    updates = {"users": users}
    update_room(s.room, updates)
    return HttpTextResponse('', 200)

@csrf_exempt
def channel_disconnect(request):
    # XXX: add logic to update all the clients that this user has gone offline
    sid = request.POST.get('from')
    s = models.HSession.get_session_for_session_id(sid)

    # if the session was active yet, notify the room about the logout
    if s is not None:
        u = s.user.get()
        users = []
        users.append(get_user_json(u, 'offline'))
        updates = {"users": users}
        if s.room is not None:
            update_room(s.room, updates)
        
    return HttpTextResponse('', 200)

