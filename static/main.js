/**
 * main.js
 * Copyright Balamurugan V R 2013
 * 
 * Guidelines:
 * register event handlers handles adding the handlers for required DOM node
 * all the validation functions start with V_ eg: V_email
 * 
 */

// root namespace for the project
HAYATE = {};

// all the core components go here
HAYATE.core = {};

// all the application related components go here
HAYATE.app = {};

// all the utilities go here
HAYATE.util = {};

function registerEventHandlers()
{
    var email = document.getElementById('email');
    var password = document.getElementById('password');
    var password1 = document.getElementById('password1');

    if(email !== undefined && email !== null)
    {
        email.onchange = V_email;
        email.onblur = V_email;
        email.focus(); // start with the email entry field if we find one
    }

    if(password !== undefined && password !== null)
    {
        password.onchange = V_password;
        password.onchange = V_password;
    }

    if(password !== undefined && password1 != null)
    {
        password1.onblur = V_password1;
        password1.onblur = V_password1;
    }
}

// validates node with id 'email' has a valid email address
function V_email()
{
    var email = document.getElementById('email').value;
    if(email == null || email == "")
    {
        document.getElementById('email_error').innerHTML = 'Email is required field!';
        document.getElementById('email').focus();
    }
    else
    {
        document.getElementById('email_error').innerHTML = '';
    }
}

// validates node with id 'password' has a valid password
function V_password()
{
    var password = document.getElementById('password').value;
    if(password == null || password == "")
    {
        document.getElementById('password_error').innerHTML = 'Password is required field!';
        document.getElementById('password').focus();
    }
    else
    {
        document.getElementById('password_error').innerHTML = '';
    }
}

// validates node with id 'password1' has a valid password and matched the one with id 'password'
function V_password1()
{
    var password = document.getElementById('password').value;    
    var password1 = document.getElementById('password1').value;
    if(password1 == null || password1 == "" || password != password1)
    {
        document.getElementById('password1_error').innerHTML = 'Passwords should match!';
    }
    else
    {
        document.getElementById('password1_error').innerHTML = '';
    }
}

function dummyChat()
{
    var messages = [
        {
            'user': 'Bala',
            'timestamp': new Date(),
            'message': 'Hi there'
        },
        {
            'user': 'Hari',
            'timestamp': new Date(),
            'message': 'Hi there'            
        },
        {
            'user': 'Puru',
            'timestamp': new Date(),
            'message': 'Hi there'            
        },
        {
            'user': 'Bala',
            'timestamp': new Date(),
            'message': 'W up?'            
        },
        {
            'user': 'Puru',
            'timestamp': new Date(),
            'message': 'Sky'            
        },
        {
            'user': 'Hari',
            'timestamp': new Date(),
            'message': 'Nothin much!'            
        }
    ];

    for(var i=0; i < messages.length; i++)
    {
        document.getElementById('room_feed').innerHTML += '<div class="amessage"><span>' +
            '<h4 style="display: inline;">' + messages[i].user + '</h5>' +
            '</span>' + '<div style="float: right; font-size: 9px;">[' +
            messages[i].timestamp.toLocaleDateString() +
            ' ' + messages[i].timestamp.getHours() + ':' + messages[i].timestamp.getMinutes() + ':' +
            messages[i].timestamp.getSeconds() + ']</div>' +
            '<div style="padding-top: 2px;">' + messages[i].message + '</div></div>';
    }
}

function gotoRoom()
{
    var dom = document.getElementById('chatroom');
    dom.style.display = 'inline';
    dom = document.getElementById('taskstodo');
    dom.style.display = 'none';
    
    var roomlink = document.getElementById('room_link');
    roomlink.classList.add('main_menu_selected');
    var taskslink = document.getElementById('taskstodo_link');
    taskslink.classList.remove('main_menu_selected');    
}

function gotoTasksView()
{
    var dom = document.getElementById('taskstodo');
    dom.style.display = 'inline';
    dom = document.getElementById('chatroom');
    dom.style.display = 'none';
    
    var taskslink = document.getElementById('taskstodo_link');
    taskslink.classList.add('main_menu_selected');
    var roomlink = document.getElementById('room_link');
    roomlink.classList.remove('main_menu_selected');
}
