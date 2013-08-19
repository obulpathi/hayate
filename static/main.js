/**
 * main.js
 * Copyright Balamurugan V R 2013
 *
 * trying to use module design pattern
 */

// all base object additions/tweaks go here
String.prototype.chomp = function() {
  return this.replace(/[\s\n\r]+$/g, "");
};

// root namespace for the project
HAYATE = {};

// all the core components go here
HAYATE.core = {};

// all the application related components go here
HAYATE.app = {};

// all chat related utilities go here
HAYATE.app.chat = {};

// all chat utils go here
HAYATE.app.chat.util = {};

// all the utilities go here
HAYATE.util = {};

// Implementation of core functionalities

HAYATE.core.getXMLHttpRequest = function ()
{
    var httpReq = new XMLHttpRequest();
    return httpReq;
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
    // django CSRF
    var cookie = document.cookie;
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

HAYATE.app.chat.initialize = function()
{
    openChannel();
};

HAYATE.app.chat.onOpen = function ()
{
    var httpreq = HAYATE.core.getXMLHttpRequest();
    if(!httpreq)
        return;

    httpreq.open("GET", "/messages");

    httpreq.onreadystatechange = function()
    {
        // nothing to do
    };
    
    httpreq.send();
    
};

HAYATE.app.chat.onMessage = function (update)
{
    try
    {
        var updates = JSON.parse(update.data);
        if(updates.messages !== undefined)
        {
            HAYATE.app.chat.populateMessagesInRoom(updates.messages, updates.replies);
        }
        else if(updates.replies !== undefined)
        {
            HAYATE.app.chat.populateReplyInRoom(updates.replies);
        }
            
    }
    catch(e)
    {
        console.log(e.toString());
    }
};

HAYATE.app.chat.onError = function ()
{
    // reload the page to get a new token
    window.location.reload();
};

HAYATE.app.chat.onClose = function ()
{
    // reload the page to get a new token
    window.location.reload();
};

HAYATE.app.chat.populateMessagesInRoom = function (messages, replies)
{

    for(var i=0; i < messages.length; i++)
    {
        var aMessage = HAYATE.app.chat.util.createMessage(messages[i], 'amessage');

        //console.log(aMessage.outerHTML);

        var aConversation = document.createElement('div');
        aConversation.className = 'aconversation';
        aConversation.appendChild(aMessage);
        aConversation.id = messages[i].id;
        aConversation.onclick = HAYATE.app.chat.selectConversation;

        // compose all the replies and append to conversation
        if(replies !== undefined)
        {
            var replyMessages = replies[messages[i].id];
            if(replyMessages !== undefined)
            {
                for(var j=0; j < replyMessages.length; j++ )
                {
                    var aReply = HAYATE.app.chat.util.createMessage(replyMessages[j], 'areply');
                    aConversation.appendChild(aReply);
                }
            }
        }
        document.getElementById('room_feed').appendChild(aConversation);
    }
};

HAYATE.app.chat.util.createMessage = function (message, className)
{
    var aMessage = document.createElement('div');
    aMessage.className = className;

    var userCntr = document.createElement('span');
    var user = document.createElement('h4');
    user.style.display = 'inline';
    user.innerHTML = message.user;
    user.style.paddingTop = '2px';
    userCntr.appendChild(user);

    var dateTime = document.createElement('div');
    dateTime.style.float = 'right';
    dateTime.style.fontSize = '9px';
    dateTime.innerHTML = '['+message.timestamp+']';

    var msg = document.createElement('div');
    msg.style.paddingTop = '2px';
    msg.innerHTML = message.message;

    aMessage.appendChild(userCntr);
    aMessage.appendChild(dateTime);
    aMessage.appendChild(msg);

    return aMessage;
};

HAYATE.app.chat.populateReplyInRoom = function (replies)
{
    for(var conv_id in replies)
    {
        var aConversation = document.getElementById(conv_id);
        var replyMessages = replies[conv_id];
        if(replyMessages !== undefined)
        {
            for(var j=0; j < replyMessages.length; j++ )
            {
                var aReply = HAYATE.app.chat.util.createMessage(replyMessages[j], 'areply');
                aConversation.appendChild(aReply);
            }
        }
    }

    return true;
};

HAYATE.app.chat.haveYourSay = function ()
{
    var message = document.getElementById('chatinput').value;
    message = message.chomp();
    
    // nothing to do, is message is empty
    if(message === "" || message === undefined || !message)
    {
        return true;
    }
    
    var httpreq = HAYATE.core.getXMLHttpRequest();
    if(!httpreq)
    {
        return;
    }
    httpreq.open("POST", "/messages/add");
    // django CSRF
    var cookie = document.cookie;
    httpreq.setRequestHeader("X-CSRFToken", cookie.substring(cookie.indexOf('csrftoken=')+'csrftoken='.length));    
    httpreq.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");

    httpreq.onreadystatechange = function()
    {
        // nothing to do
    };

    // get the conversation id and send it to the server
    var conv_id = document.getElementById('chatinput').getAttribute('conv_id');

    // clean up user input before posting
    document.getElementById('chatinput').value = '';
    httpreq.send("conv_id="+conv_id+"&message="+message);
};

HAYATE.app.chat.sendMessage = function ()
{
    return true;
};

HAYATE.app.chat.selectConversation = function (event)
{
    console.log(event.currentTarget.outerHTML);

    var currTarget = event.currentTarget;
    var ci = document.getElementById('chatinput');

    // pick the current conversation, if any, and reset it
    var currConv = document.getElementById(ci.getAttribute('conv_id'));
    if(currConv && currConv !== undefined)
    {
        currConv.style.backgroundColor = '#E9EAEB';
    }
    
    currTarget.style.backgroundColor = 'lightblue';
    
    // set conversation id on the chat input node
    ci.setAttribute('conv_id', currTarget.id);
    // enable the "Have your Say" button
    var haveUrSay = document.getElementById('have_your_say');
    haveUrSay.disabled = false;

    // stop the event from bubbling to html .. undoing this select
    event.stopPropagation();
};

HAYATE.app.chat.undoSelectConversation = function (event)
{
    // pick the current conversation, if any, and reset it
    var currConv = document.getElementById(
        document.getElementById('chatinput').getAttribute('conv_id'));
    if(currConv && currConv !== undefined)
    {
        currConv.style.backgroundColor = '#E9EAEB';
    }
    
    // get hold of the "Have your Say" button and disable it.
    // disable the "Have your Say" button
    var haveUrSay = document.getElementById('have_your_say');
    haveUrSay.disabled = true;
};

HAYATE.app.chat.startNewConversation = function (event)
{
    var message = document.getElementById('chatinput').value;
    // nothing to do, is message is empty
    if(message === "" || message === undefined || !message)
    {
        return true;
    }
    
    var httpreq = HAYATE.core.getXMLHttpRequest();
    if(!httpreq)
    {
        return;
    }
    
    httpreq.open("POST", "/messages/add");
    // django CSRF
    var cookie = document.cookie;
    httpreq.setRequestHeader("X-CSRFToken", cookie.substring(cookie.indexOf('csrftoken=')+'csrftoken='.length));
    
    httpreq.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");

    httpreq.onreadystatechange = function()
    {
        // nothing to do
    };

    // clean up user input before posting
    document.getElementById('chatinput').value = '';
    httpreq.send("message="+message);
};

/**
 * validates the signup data provided by user 
 */
HAYATE.app.validateSignupData = function ()
{
    var email = document.getElementById('email').value || null;
    var password = document.getElementById('password').value || null;
    var password1 = document.getElementById('password1').value || null;
    var focusSet = false, error = false;

    if(!email)
    {
        error = true;
        document.getElementById('email_error').innerHTML = 'Email should not be empty!';
        document.getElementById('email').focus();
        focusSet = true;
    }
    else
    {
        // clean up previously displayed errors
        document.getElementById('email_error').innerHTML = '';            
    }

    if(!password)
    {
        error = true;
        document.getElementById('password_error').innerHTML = 'Password should not be empty!';
        document.getElementById('password').innerHTML = '';
        if(!focusSet)
        {
            document.getElementById('password').focus();
        }
    }
    else
    {
        document.getElementById('password_error').innerHTML = '';
    }

    if(password !== password1)
    {
        error = true;
        document.getElementById('password1_error').innerHTML = 'Passwords should match!';
        document.getElementById('password').innerHTML = '';        
        document.getElementById('password1').innerHTML = '';
        if(!focusSet)
        {
            document.getElementById('password').focus();
        }        
    }
    else
    {
        document.getElementById('password1_error').innerHTML = '';
    }

    if(error)
    {
        return false;
    }

    // all is well!
    return true;
};

HAYATE.util.logoutSession = function (event)
{
    var httpreq = HAYATE.core.getXMLHttpRequest();
    if(!httpreq)
    {
        return;
    }

    httpreq.open("POST", "/logout");
    // django CSRF
    var cookie = document.cookie;
    httpreq.setRequestHeader("X-CSRFToken", cookie.substring(cookie.indexOf('csrftoken=')+'csrftoken='.length));
    
    httpreq.onreadystatechange = function()
    {
        // nothing to do
    };
    httpreq.send();    
};
