/**
 * main.js
 * Copyright Balamurugan V R 2013
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

function getXMLHttpRequest()
{
    return new XMLHttpRequest();
}

function killMyParent(element)
{
    var parent = element.parentNode;
    parent.remove();
}

function killMe(element)
{
    element.remove();
}

function getChildWithName(element, name)
{
    for(var i = 0; i < element.children.length; i++)
    {
        if(element.children[i].name === name)
            return element.children[i];
    }
    return null;
}

function addMember_(element)
{
    var httpreq = getXMLHttpRequest();
    if(!httpreq)
    {
        return;
    }

    var email = getChildWithName(element, 'email');

    // remove the error 
    var add_error = document.getElementById('add_member_error');
    if(add_error)
        add_error.remove();
    
    httpreq.open("POST", "/rooms/add_member");
    var cookie = document.cookie;
    // django CSRF
    httpreq.setRequestHeader("X-CSRFToken", cookie.substring(cookie.indexOf('csrftoken=')+'csrftoken='.length));
    httpreq.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");

    httpreq.onreadystatechange = function()
    {
        if(httpreq.readyState === 4)
        {
            var spanElement = document.createElement('span');
            spanElement.id = 'add_member_error';
            spanElement.innerHTML = httpreq.responseText;
            element.appendChild(spanElement);
        }
    };
    
    httpreq.send("email="+email.value);
}

/**
 * sets up the DOM elements and events to read the user input and add the desired
 * member to room
 * @param element - container to host the above. typically 'heading'
 */
function addMember(element)
{
    var parent = element.parentNode;
    var divElement = document.createElement("div");
    divElement.id = "fly_out_container";
    var formElement = document.createElement("form");
    formElement.id = "add_member_form";
    formElement.action = "javascript:addMember_(this)";
    //formElement.method = "post";
    formElement.style.display = "inline";
    formElement.onsubmit = addMember_;
    divElement.innerHTML = "<input type=\"email\" name=\"email\" />" +
        "<button class=\"hButton\" " +
        "onclick=\"addMember_(this.parentNode)\">Add</button>";
    //divElement.appendChild(formElement);
    divElement.innerHTML = divElement.innerHTML +
        "<button class=\"hButton\" onclick=\"killMyParent(this)\">Close</button>";
    parent.appendChild(divElement);
}
