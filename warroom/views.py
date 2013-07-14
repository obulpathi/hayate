import logging
import hashlib

from google.appengine.ext import db

from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render
from django import forms

from warroom import models
from warroom import salt
from warroom.library import HttpTextResponse, EmailInput

# --------- decorators --------
# factored out from rietveld/codereview/views.py - http://codereview.appspot.com for more

# XXX - this is very fragile - replace with decent logic
def login_required(func):
    def login_wrapper(request, *args, **kwds):
        if request.get_signed_cookie('_h_session', None) is None:
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

# --------- forms ---------   
class SignUpForm(forms.Form):
    email = forms.EmailField(label='Email:', widget=EmailInput(attrs={}))
    password = forms.CharField(label='Password:', widget=forms.PasswordInput)
    password1 = forms.CharField(label='Password confirmation:', widget=forms.PasswordInput)
    username = forms.CharField(label='Your name:')
    nickname = forms.CharField(label='Your Nick Name:')

@login_required
def index(request):
    return render(request, 'index.html', {'member': 'Bala',
                                          'room': 'UADA'})

def login(request):
    if request.method == 'GET':
        return render(request, 'login.html', {})
    elif request.method == 'POST':
        email = request.POST.get('email')
        password = request.POST.get('password')
        # query the DB for password and compare
        q = models.User.query(models.User.email == email )
        u = q.get()

        if u is None:
            return render(request, 'login.html', {'error': 'Invalid email! You might want to signup first!'})
        
        if u.password == hashlib.sha256(password+salt.Salt.salt()).hexdigest():
            
            response =  HttpResponseRedirect('/')
            response.set_signed_cookie('_h_session', 'test')
            return response
        else:
            return render(request, 'login.html', {'error': 'Invalid password for this email!',
                                                  'email': email})
    else:
        # unsupported raise 404 ?!
        pass
        
def signup(request):
    if request.method == 'GET':
        form = SignUpForm(auto_id='%s')
        return render(request, 'signup.html', {'form': form})
    elif request.method == 'POST':
        logging.info('signup data posted')
        form = SignUpForm(request.POST)
        if form.is_valid():
            u = models.User()
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
    response = render(request, 'login.html', {})
    response.delete_cookie('_h_session')
    return response
