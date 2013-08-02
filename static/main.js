/**
 * main.js
 * Copyright Balamurugan V R 2013
 *
 * trying to use module design pattern
 */

// root namespace for the project
HAYATE = {};

// all the core components go here
HAYATE.core = {};

// all the application related components go here
HAYATE.app = {};

// all chat related utilities go here
HAYATE.app.chat = {};

// all the utilities go here
HAYATE.util = {};

// Implementation of core functionalities

HAYATE.core.getXMLHttpRequest = function ()
{
    return new XMLHttpRequest();
};

HAYATE.core.killMyParent = function (element)
{
    var parent = element.parentNode;
    parent.remove();
};

HAYATE.core.killMe = function (element)
{
    element.remove();
};

HAYATE.core.getChildWithName = function (element, name)
{
    for(var i = 0; i < element.children.length; i++)
    {
        if(element.children[i].name === name)
            return element.children[i];
    }
    return null;
};

HAYATE.core.getChildWithId = function (element, id)
{
    for(var i = 0; i < element.children.length; i++)
    {
        if(element.children[i].id === id)
            return element.children[i];
    }
    return null;
};

HAYATE.core.createElement = function(type, id)
{
    var element = document.createElement(type);
    element.id = id;
    return element;
};

// Implementation of application functionalities
HAYATE.app.gotoRoom = function ()
{
    var dom = document.getElementById('chatroom');
    dom.style.display = 'inline';
    dom = document.getElementById('taskstodo');
    dom.style.display = 'none';
    
    var roomlink = document.getElementById('room_link');
    roomlink.classList.add('main_menu_selected');
    var taskslink = document.getElementById('taskstodo_link');
    taskslink.classList.remove('main_menu_selected');    
};

HAYATE.app.gotoTasksView = function ()
{
    var dom = document.getElementById('taskstodo');
    dom.style.display = 'inline';
    dom = document.getElementById('chatroom');
    dom.style.display = 'none';
    
    var taskslink = document.getElementById('taskstodo_link');
    taskslink.classList.add('main_menu_selected');
    var roomlink = document.getElementById('room_link');
    roomlink.classList.remove('main_menu_selected');
};

/**
 * makes AJAX call to the server to add the user to a current room 
 */
HAYATE.app.addMember_ = function (element)
{
    // remove the error 
    var add_error = document.getElementById('add_member_error');
    if(add_error)
        HAYATE.core.killMe(add_error);    

    var httpreq = HAYATE.core.getXMLHttpRequest();
    if(!httpreq)
    {
        return;
    }

    var email = HAYATE.core.getChildWithName(element, 'email');

    if(!email)
        return;

    if(email.value === "")
    {
        add_error = HAYATE.core.createElement('span', 'add_member_error');
        add_error.innerHTML = 'Email is required field!';
        element.appendChild(add_error);
        return;
    }

    httpreq.open("POST", "/rooms/add_member");
    var cookie = document.cookie;
    // django CSRF
    httpreq.setRequestHeader("X-CSRFToken", cookie.substring(cookie.indexOf('csrftoken=')+'csrftoken='.length));
    httpreq.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");

    httpreq.onreadystatechange = function()
    {
        if(httpreq.readyState === 4)
        {
            var a = document.getElementById('add_member_email');
            if(a)
            {
                a.value = '';
            }
            add_error = HAYATE.core.createElement('span', 'add_member_error');
            add_error.innerHTML = httpreq.responseText;
            element.appendChild(add_error);
        }
    };
    
    httpreq.send("email="+email.value);
};

/**
 * sets up the DOM elements and events to read the user input and add the desired
 * member to room
 * @param element - link which triggers this to host the above. typically 'a'
 */
HAYATE.app.addMember = function (element)
{
    var parent = element.parentNode;
    var a = HAYATE.core.getChildWithId(parent, 'add_member_container');
    if(a)
    {
        return;
    }

    var divElement = HAYATE.core.createElement('div', 'add_member_container');
    var formElement = HAYATE.core.createElement('form', 'add_member_form');
    formElement.style.display = "inline";
    divElement.innerHTML = "<input type=\"email\" name=\"email\" id=\"add_member_email\"/>" +
        "<button class=\"hButton\" " +
        "onclick=\"HAYATE.app.addMember_(this.parentNode)\">Add</button>" + 
        "<button class=\"hButton\" onclick=\"HAYATE.core.killMyParent(this)\">Close</button>";
    parent.appendChild(divElement);
};

// Implementation of chat related functionalities

HAYATE.app.chat.onOpened = function ()
{
    var httpreq = HAYATE.core.getXMLHttpRequest();
    if(!httpreq)
        return;

    httpreq.open("GET", "/messages");
    var cookie = document.cookie;
    // django CSRF
    httpreq.setRequestHeader("X-CSRFToken", cookie.substring(cookie.indexOf('csrftoken=')+'csrftoken='.length));

    httpreq.onreadystatechange = function()
    {
        if(httpreq.readyState === 4)
        {
            var messages = eval(httpreq.responseText);
            for(var i=0; i < messages.length; i++)
            {
                var dt = new Date(messages[i].timestamp);
                document.getElementById('room_feed').innerHTML += '<div class="amessage"><span>' +
                    '<h4 style="display: inline;">' + messages[i].user + '</h5>' +
                    '</span>' + '<div style="float: right; font-size: 9px;">[' +
                    dt.toLocaleDateString() +
                    ' ' + dt.getHours() + ':' + dt.getMinutes() + ':' +
                    dt.getSeconds() + ']</div>' +
                    '<div style="padding-top: 2px;">' + messages[i].message + '</div></div>';
            }
        }
    };
    
    httpreq.send();
    
};

HAYATE.app.chat.onMessage = function ()
{
};

HAYATE.app.chat.onError = function ()
{
};

HAYATE.app.chat.onClose = function ()
{
};

// Unformatted and non-factored temporary code for dev/testing
function registerEventHandlers()
{
    var email = document.getElementById('email');
    var password = document.getElementById('password');
    var password1 = document.getElementById('password1');

    if(email !== undefined && email !== null)
    {
        email.onchange = V_email;
        email.onblur = V_email;
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
