/**
 * main.js
 * Copyright Balamurugan V R 2013
 *
 * trying to use module design pattern
 */

// all default DOM object additions/tweaks go here
String.prototype.chomp = function() {
  return this.replace(/[\s\n\r]+$/g, "");
};

// root namespace for the project
HAYATE = {};

// all the core components go here
HAYATE.core = {};

// all the application related components go here
HAYATE.app = {};

// all chat related components go here
HAYATE.app.chat = {};

// all chat utils go here
HAYATE.app.chat.util = {};

// all task related components go here
HAYATE.app.tasks = {};

// all user related components go here
HAYATE.app.users = {};

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
    divElement.style.boxShadow = '1px 1px 1px';

    var formElement = HAYATE.core.createElement('form', 'add_member_form');
    formElement.style.display = "inline";
    divElement.innerHTML = "Email of a Hayate Member: <input type=\"email\" name=\"email\" id=\"add_member_email\"/>" +
        "<button class=\"hButton\" " +
        "onclick=\"HAYATE.app.addMember_(this.parentNode)\">Add</button>";
    divElement.appendChild(HAYATE.util.closeButton());
    parent.appendChild(divElement);
};

/**
 * to invoke all the onload events
 */
HAYATE.app.bodyLoaded = function (event)
{
    HAYATE.app.chat.undoSelectConversation(event);
};

/**
 * handles click event in any part of the page
 */
HAYATE.app.handleClick = function (event)
{
    HAYATE.app.chat.undoSelectConversation();
    HAYATE.app.users.undoUserMenu();
};


// Implementation of chat related functionalities

HAYATE.app.chat.initialize = function()
{
    openChannel();
};

HAYATE.app.chat.onOpen = function ()
{
    setTimeout(HAYATE.app.chat.getMessages, 2000);
    setTimeout(HAYATE.app.users.getUsers, 2000);
    setTimeout(HAYATE.app.tasks.getTasks, 2000);
};

HAYATE.app.chat.getMessages = function ()
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
        else if(updates.users !== undefined)
        {
            HAYATE.app.users.populateUsersInRoom(updates.users)
        }
        else if(updates.tasks !== undefined || updates.todos !== undefined)
        {
            HAYATE.app.tasks.populateTasksInRoom(updates.tasks, updates.todos, updates.task_updates, updates.todo_updates)
        }
        else if(updates.task_updates !== undefined || updates.todo_updates)
        {
            HAYATE.app.tasks.updateOnActionItem(updates.task_updates, updates.todo_updates);
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
        var expCmpButton = HAYATE.util.plusButton(HAYATE.app.chat.expandConversation);
        expCmpButton.id = 'expcmp-'+messages[i].id;
        var aMessage = HAYATE.app.chat.util.createMessage(messages[i], 'amessage',
                                                          [expCmpButton]);
        var msgReplies = document.createElement('div');

        //console.log(aMessage.outerHTML);

        var aConversation = document.createElement('div');
        aConversation.className = 'aconversation';
        aConversation.appendChild(aMessage);
        aConversation.id = messages[i].id;
        aConversation.onclick = HAYATE.app.chat.selectConversation;

        // every conversation tracks message replies in element identified
        // by md-<conversation_id> set in the message header
        aMessage.setAttribute('replies_id', 'md-'+messages[i].id);
        aMessage.setAttribute('expcmp_id', 'expcmp-'+messages[i].id);

        msgReplies.id = 'md-'+messages[i].id;

        // compose all the replies and append to conversation
        if(replies !== undefined)
        {
            var replyMessages = replies[messages[i].id];
            if(replyMessages !== undefined)
            {
                for(var j=0; j < replyMessages.length; j++ )
                {
                    var aReply = HAYATE.app.chat.util.createMessage(replyMessages[j], 'areply');
                    msgReplies.appendChild(aReply);
                }
            }
        }
        msgReplies.style.display = 'none';
        aConversation.appendChild(msgReplies);

        // don't display the expand button when no replies in room
        if(msgReplies.children.length === 0)
            expCmpButton.style.display = 'none';

        document.getElementById('room_feed').appendChild(aConversation);
    }
};

/**
 * if children is not undefined, it will be treated as array of elements
 * and they will be added to message before any other element
 */
HAYATE.app.chat.util.createMessage = function (message, className, children)
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

    if(children !== undefined)
    {
        for(var i=0; i < children.length; i++)
        {
            aMessage.appendChild(children[i]);
        }
    }
    
    aMessage.appendChild(userCntr);
    aMessage.appendChild(dateTime);
    aMessage.appendChild(msg);

    return aMessage;
};

HAYATE.app.chat.populateReplyInRoom = function (replies)
{
    for(var conv_id in replies)
    {
        var msgReplies = document.getElementById('md-'+conv_id);
        var replyMessages = replies[conv_id];
        if(replyMessages !== undefined)
        {
            for(var j=0; j < replyMessages.length; j++ )
            {
                var aReply = HAYATE.app.chat.util.createMessage(replyMessages[j], 'areply');
                msgReplies.appendChild(aReply);
            }
        }

        // also show the expand button to the user
        var expCmpButton = document.getElementById('expcmp-'+conv_id);
        expCmpButton.style.display = 'inline';
    }

    return true;
};

HAYATE.app.chat.haveYourSay = function ()
{
    var message = document.getElementById('chatinput').value;
    message = message.chomp();
    message = message.replace(/\n+/g, " ")    
    
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
    message = message.chomp();
    message = message.replace(/\n+/g, " ")
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

HAYATE.app.chat.expandConversation = function (event)
{
    var aMessage = event.target.parentNode;
    var msgReplies = document.getElementById(aMessage.getAttribute('replies_id'));
    msgReplies.style.display = 'block';
    var expCmpButton = document.getElementById(aMessage.getAttribute('expcmp_id'));
    expCmpButton.src = '/static/minus.gif';
    expCmpButton.onclick = HAYATE.app.chat.collapseConversation;
    event.stopPropagation();
    return true;
};

HAYATE.app.chat.collapseConversation = function (event)
{
    var aMessage = event.target.parentNode;
    var msgReplies = document.getElementById(aMessage.getAttribute('replies_id'));
    msgReplies.style.display = 'none';
    var expCmpButton = document.getElementById(aMessage.getAttribute('expcmp_id'));
    expCmpButton.src = '/static/plus.gif';
    expCmpButton.onclick = HAYATE.app.chat.expandConversation;
    event.stopPropagation();
    return true;    
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

HAYATE.util.closeButton = function ()
{
    var closeContr = document.createElement('img');
    closeContr.src = '/static/close.gif';
    closeContr.onclick = function (event) { event.currentTarget.parentNode.remove(); event.stopPropagation(); };
    closeContr.style.float = 'right';
    closeContr.style.cursor = 'pointer';
    return closeContr;
};

/**
 * pass in the function to be called when this button is pressed
 */
HAYATE.util.plusButton = function (callback)
{
    var plusContr = document.createElement('img');
    plusContr.src = '/static/plus.gif';
    plusContr.onclick = callback;
    plusContr.style.cursor = 'pointer';
    plusContr.style.padding = '2px';
    plusContr.style.verticalAlign = 'middle';
    return plusContr;
};

/**
 * pass in the function to be called when this button is pressed
 */
HAYATE.util.minusButton = function (callback)
{
    var minusContr = document.createElement('img');
    minusContr.src = '/static/minus.gif';
    minusContr.onclick = callback;
    minusContr.style.cursor = 'pointer';
    minusContr.style.padding = '2px';
    minusContr.style.verticalAlign = 'middle';    
    return minusContr;
};

HAYATE.util.upArrow = function (callback)
{
    var upArrowContr = document.createElement('img');
    upArrowContr.src = '/static/up.gif';
    upArrowContr.onclick = callback;
    upArrowContr.style.cursor = 'pointer';
    upArrowContr.style.padding = '2px';
    upArrowContr.style.verticalAlign = 'middle';    
    return upArrowContr;
};

HAYATE.util.downArrow = function (callback)
{
    var downArrowContr = document.createElement('img');
    downArrowContr.src = '/static/down.gif';
    downArrowContr.onclick = callback;
    downArrowContr.style.cursor = 'pointer';
    downArrowContr.style.padding = '2px';
    downArrowContr.style.verticalAlign = 'middle';    
    return downArrowContr;
};

/**
 * look for element with class 'nothing' in the children of the passed in
 * element and kill it
 */
HAYATE.util.killNothingChild = function (element)
{
    var children = element.childNodes;
    for(var i=0; i < children.length; i++)
    {
        if(children[i].className === 'nothing')
            HAYATE.core.killMe(children[i]);
    }
};

HAYATE.app.users.populateUsersInRoom = function (users)
{
    var usersOnline = document.getElementById('users_online');
    var usersOffline = document.getElementById('users_offline');

    for(var i = 0; i < users.length; i++)
    {
        var u = users[i];
        var user = document.getElementById(u.id);

        if(user && user !== undefined)
        {
            // user info already populated
            // look for status change
            if(user.parentNode.id === 'users_online' && u.status === "online")
                continue;
            if(user.parentNode.id === 'users_offline' && u.status === "offline")
                continue;

            HAYATE.core.killMe(user);
        }

        // populate user info
        var aUser = document.createElement('div');
        aUser.className = 'auser amenuitem';
        aUser.id = users[i].id;
        aUser.innerHTML = users[i].nickname;
        aUser.style.cursor = 'pointer';
        aUser.title = 'Right click to see menu';
        aUser.setAttribute('nickname', users[i].nickname);
        aUser.oncontextmenu = HAYATE.app.users.handleClick;

        if(users[i].status === 'online')
        {
            usersOnline.appendChild(aUser);
        }
        else
        {
            usersOffline.appendChild(aUser);
        }
    }
    
    return true;
};

HAYATE.app.users.getUsers = function (event)
{
    var httpreq = HAYATE.core.getXMLHttpRequest();
    if(!httpreq)
        return;

    httpreq.open("GET", "/users");

    httpreq.onreadystatechange = function()
    {
        // nothing to do
    };
    
    httpreq.send();    
};

HAYATE.app.users.handleClick = function (event)
{
    if(!document.getElementById('user_menu') && event.button === 2)
    {
        var elt = event.target;
        // right click on user... display the menu
        var userMenuContr = document.createElement('div');
        userMenuContr.id = 'user_menu';
        userMenuContr.className = 'flyout';
        userMenuContr.style.width = '150px';
        userMenuContr.style.backgroundColor = 'white';

        userMenuContr.appendChild(HAYATE.util.closeButton());

        var menu1 = document.createElement('div');
        menu1.innerText = 'Assign a Task';
        menu1.style.borderBottom = '1px gray solid';
        menu1.className = 'amenuitem';
        menu1.onclick = HAYATE.app.tasks.assignTask;
        userMenuContr.appendChild(menu1);

        var menu2 = document.createElement('div');
        menu2.innerText = 'View Profile';
        menu2.className = 'amenuitem';
        userMenuContr.appendChild(menu2);
        
        elt.appendChild(userMenuContr);
    }

    // suppress the default behavior
    event.preventDefault();
};

HAYATE.app.users.undoUserMenu = function (event)
{
    var userMenu = document.getElementById('user_menu');
    if(userMenu)
        userMenu.remove();
};

/**
 * creates a overlay window to get the user input for actionitem
 * using submit_callback as onclick callback.
 * title - this is the title of the overlay window verbatim
 */
HAYATE.app.tasks.newActionItemWin = function (title_string, for_user, submit_callback)
{
    if(!document.getElementById('new_action_item_container'))
    {
        var newActionItemContr = document.createElement('div');
        newActionItemContr.id = 'new_action_item_container';
        newActionItemContr.className = 'flyout';
        newActionItemContr.style.height = '220px';
        newActionItemContr.style.width = '300px';
        newActionItemContr.style.backgroundColor = 'white';

        newActionItemContr.setAttribute('for_user', for_user);

        newActionItemContr.appendChild(HAYATE.util.closeButton());

        var title = document.createElement('h5');
        title.innerText = title_string;
        title.style.borderBottom = '1px gray solid';
        title.style.paddingBottom = '3px';

        var subjectText = document.createElement('div');
        subjectText.innerText = 'Subject: ';
        
        var subject = document.createElement('input');
        subject.name = 'subject';
        subject.type = 'text';
        subject.autofocus = true;
        subject.id = 'new_action_item_subject';

        var actionText = document.createElement('div');
        actionText.innerText = 'Action: ';

        var action = document.createElement('textarea');
        action.name = 'action';
        action.style.width = '294px';
        action.style.height = '100px';
        action.style.border = '1px gray solid';
        action.id = 'new_action_item_action';

        var submitButton = document.createElement('input')
        submitButton.type = 'button';
        submitButton.className = 'hButton';
        submitButton.setAttribute('value', 'Submit');
        submitButton.onclick = submit_callback;

        newActionItemContr.appendChild(title);
        newActionItemContr.appendChild(subjectText);
        newActionItemContr.appendChild(subject);
        newActionItemContr.appendChild(actionText);
        newActionItemContr.appendChild(action);
        newActionItemContr.appendChild(submitButton);

        document.getElementById('tasks_area').insertBefore(newActionItemContr, document.getElementById('task_todo_container'));
    }
    else
    {
        return true;
    }
};

HAYATE.app.tasks.newTodo = function()
{
    HAYATE.app.tasks.newActionItemWin('New Todo', '', HAYATE.app.tasks.createNewTodo);
    return true;
};

/**
 * take the parent of parent Node to get the user to whom we should assign a task
 */
HAYATE.app.tasks.assignTask = function (event)
{
    HAYATE.app.gotoTasksView();
    var userNode = event.currentTarget.parentNode.parentNode;
    var title = 'New task for ' + userNode.getAttribute('nickname');
    var for_user = userNode.id;
    HAYATE.app.users.undoUserMenu();
    HAYATE.app.tasks.newActionItemWin(title, for_user, HAYATE.app.tasks.createNewTask);
    event.stopPropagation();
    return true;
};

/**
 * posts a new action item to the DB
 * todo/task is designated by appropriate url
 */
HAYATE.app.tasks.createNewActionItem = function (url)
{
    var subject = document.getElementById('new_action_item_subject').value;
    var action = document.getElementById('new_action_item_action').value;
    var for_user = document.getElementById('new_action_item_container').getAttribute('for_user');

    if(subject === "")
        return true;

    var httpreq = HAYATE.core.getXMLHttpRequest();
    if(!httpreq)
    {
        return;
    }
    
    httpreq.open("POST", url);
    // django CSRF
    var cookie = document.cookie;
    httpreq.setRequestHeader("X-CSRFToken", cookie.substring(cookie.indexOf('csrftoken=')+'csrftoken='.length));
    
    httpreq.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");

    httpreq.onreadystatechange = function()
    {
        // nothing to do
    };

    // clean up user input before posting
    document.getElementById('new_action_item_subject').value = '';
    document.getElementById('new_action_item_action').value = '';
    httpreq.send("subject="+subject+'&action='+action+'&for_user='+for_user);
    return true;
};

HAYATE.app.tasks.createNewTodo = function (event)
{
    HAYATE.app.tasks.createNewActionItem('/tasks/todo/create');
    return true;
};

HAYATE.app.tasks.createNewTask = function ()
{
    HAYATE.app.tasks.createNewActionItem('/tasks/create');
    return true;
};

HAYATE.app.tasks.createTaskForDisplay = function (task)
{
    var taskElement = document.createElement('div');
    taskElement.className = 'atask';
    taskElement.id = task.id;

    var taskHeader = document.createElement('div');
    taskHeader.className = 'taskheader';
    taskHeader.verticalAlign = 'middle';

    // following ids are used later when we need to expand/compress
    // details pertaining to this task
    taskHeader.setAttribute('detail_id', 'td-'+task.id);
    taskHeader.setAttribute('expcmp_id', 'expcmp-'+task.id);

    var subjectElement = document.createElement('div');
    subjectElement.style.display = 'inline';
    subjectElement.innerHTML = task.subject;
    
    var dateTime = document.createElement('div');
    dateTime.innerHTML = '[' + task.timestamp + ']';
    dateTime.style.display = 'inline';
    dateTime.style.float = 'right';
    dateTime.style.fontSize = '9px';
    dateTime.style.fontWeight = 'normal';

    var statusElement = document.createElement('div');
    statusElement.innerHTML = '[' + task.status + ']';
    statusElement.style.display = 'inline';

    var taskCreator = document.createElement('div');
    if(task.type === 'task')
        taskCreator.innerHTML = 'by '+task.creator;
    else
        taskCreator.innerHTML = 'by You';
    taskCreator.style.fontSize = '9px';
    taskCreator.style.fontWeight = 'normal';
    taskCreator.style.display = 'inline';
    taskCreator.style.paddingLeft = '5px';

    // expand compress button i.e. plus/minus
    var expCmpButton = HAYATE.util.plusButton(HAYATE.app.tasks.expandTask);
    expCmpButton.id = 'expcmp-'+task.id;
    expCmpButton.title = 'Expand';

    // buttons to increase/decrease priority
    // var incrPriorityButton = HAYATE.util.upArrow(HAYATE.app.tasks.increasePriority);
    // incrPriorityButton.title = 'Increase priority';

    // var decrPriorityButton = HAYATE.util.downArrow(HAYATE.app.tasks.decreasePriority);
    // decrPriorityButton.title = 'Decrease priority';

    // container for showing the action item followed by
    // history of the task
    var taskDetails = document.createElement('div');
    taskDetails.id = 'td-'+task.id;
    taskDetails.className = 'taskdetail';

    var toPerform = document.createElement('div');
    //toPerform.style.display = 'inline';
    toPerform.innerHTML = task.action;
    //toPerform.style.border = 'gray 1px solid';
    toPerform.style.paddingTop = '5px';

    var taskUpdates = document.createElement('div');
    taskUpdates.style.paddingTop = '5px';
    taskUpdates.id = 'tu-'+task.id;
    taskUpdates.style.borderBottom = '1px rgb(0, 2, 34) solid';

    taskDetails.appendChild(toPerform);
    taskDetails.appendChild(taskUpdates);

    if(task.status === '0')
    {
        var respondClose = document.createElement('div');
        respondClose.style.paddingTop = '5px';

        var response = document.createElement('textarea');
        response.id = 'response-'+task.id;
        response.style.border = 'gray 1px solid';
        response.style.width = '200px';
        response.style.height = '20px';
        response.style.display = 'inline';
        
        var respondButton = document.createElement('a');
        if(task.type === 'task')
            respondButton.innerHTML = 'Respond';
        else
            respondButton.innerHTML = 'Update';
        respondButton.style.fontSize = '10px';

        if(task.type === 'task')
            respondButton.href = 'javascript:HAYATE.app.tasks.respond('+task.id+')';
        else
            respondButton.href = 'javascript:HAYATE.app.tasks.updateTodo('+task.id+')';
        
        //respondButton.style.textDecoration = 'underline';
        respondButton.style.margin = '5px';

        var closeButton = document.createElement('a');
        closeButton.innerHTML = 'Close';
        closeButton.style.fontSize = '10px';
        closeButton.href = 'javascript:HAYATE.app.tasks.closeTask('+task.id+')';
        //closeButton.style.textDecoration = 'underline';
        closeButton.style.margin = '5px';

        respondClose.appendChild(response);
        respondClose.appendChild(respondButton);
        respondClose.appendChild(closeButton);
        
        taskDetails.appendChild(respondClose);
    }
    else
    {
        var closed = document.createElement('div');
        closed.innerHTML = "Action Item Closed!";
        taskDetails.appendChild(closed);
    }

    taskHeader.appendChild(expCmpButton);
    taskHeader.appendChild(statusElement);
    taskHeader.appendChild(subjectElement);
    //taskHeader.appendChild(incrPriorityButton);
    //taskHeader.appendChild(decrPriorityButton);
    taskHeader.appendChild(taskCreator);
    taskHeader.appendChild(dateTime);
    taskElement.appendChild(taskHeader);
    taskElement.appendChild(taskDetails);

    // done
    return taskElement;
};

HAYATE.app.tasks.expandTask = function (event)
{
    // task header node is the parent of the target of this event
    // and it has the id of the detail node to be displayed
    var taskElement = event.target.parentNode;
    var taskDetails = document.getElementById(taskElement.getAttribute('detail_id'));
    taskDetails.style.display = 'block';
    var expCmpButton = document.getElementById(taskElement.getAttribute('expcmp_id'));
    expCmpButton.src = '/static/minus.gif';
    expCmpButton.onclick = HAYATE.app.tasks.compressTask;
    expCmpButton.title = 'Collapse';
    return true;
};

HAYATE.app.tasks.compressTask = function (event)
{
    // task header node is the parent of the target of this event
    // and it has the id of the detail node to be displayed
    var taskElement = event.target.parentNode;
    var taskDetails = document.getElementById(taskElement.getAttribute('detail_id'));
    taskDetails.style.display = 'none';
    var expCmpButton = document.getElementById(taskElement.getAttribute('expcmp_id'));
    expCmpButton.src = '/static/plus.gif';
    expCmpButton.onclick = HAYATE.app.tasks.expandTask;
    expCmpButton.title = 'Expand';
    return true;
};

HAYATE.app.tasks.increasePriority = function ()
{
    return true;
};

HAYATE.app.tasks.decreasePriority = function ()
{
    return true;
};

HAYATE.app.tasks.respond = function (task_id)
{
    var response = document.getElementById('response-'+task_id);

    if(response === null || response.value === "")
    {
        alert("Need update message to respond!");
        return;
    }

    var httpreq = HAYATE.core.getXMLHttpRequest();
    if(!httpreq)
    {
        return;
    }
    
    httpreq.open("POST", "/tasks/respond");
    // django CSRF
    var cookie = document.cookie;
    httpreq.setRequestHeader("X-CSRFToken", cookie.substring(cookie.indexOf('csrftoken=')+'csrftoken='.length));    
    httpreq.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");

    httpreq.onreadystatechange = function()
    {
        // nothing to do
    };

    var response = response.value;
    response = response.chomp()

    // also kill the task from current user's view as it is getting reassigned
    HAYATE.core.killMe(document.getElementById(task_id));
    
    httpreq.send('task_id='+task_id+'&message='+response);
};

HAYATE.app.tasks.updateTodo = function (task_id)
{
    var response = document.getElementById('response-'+task_id);

    if(response === null || response.value === "")
    {
        alert("Nothing to update!");
        return;
    }

    var httpreq = HAYATE.core.getXMLHttpRequest();
    if(!httpreq)
    {
        return;
    }
    
    httpreq.open("POST", "/tasks/todo/update");
    // django CSRF
    var cookie = document.cookie;
    httpreq.setRequestHeader("X-CSRFToken", cookie.substring(cookie.indexOf('csrftoken=')+'csrftoken='.length));    
    httpreq.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");

    httpreq.onreadystatechange = function()
    {
        // nothing to do
    };

    var update = response.value;
    response.value = '';
    
    httpreq.send('task_id='+task_id+'&message='+update);
};

HAYATE.app.tasks.populateTasksInRoom = function (tasks, todos, task_updates, todo_updates)
{
    if(tasks === undefined)
        tasks = [];

    if(todos === undefined)
        todos = [];
    
    tasks = tasks.concat(todos);
    for(var i = 0; i < tasks.length; i++)
    {
        var task = tasks[i];

        var updates;
        try
        {
            updates = task_updates[task.id];
            if(updates === undefined) updates = todo_updates[task.id];
        }
        catch(e)
        {}

        // kill the task element if present already
        var taskElement = document.getElementById(task.id);
        if(taskElement)
            taskElement.remove();
        
        taskElement = HAYATE.app.tasks.createTaskForDisplay(task);

        var actionItems = document.getElementById('p'+task.priority+'_actionitems');
        HAYATE.util.killNothingChild(actionItems);
        actionItems.appendChild(taskElement);
        
        // populate the updates
        if(updates !== undefined)
        {
            for(var j = 0; j < updates.length; j++)
            {
                var anUpdate = HAYATE.app.chat.util.createMessage(updates[j], 'areply');
                var updateElement = document.getElementById('tu-'+task.id);
                updateElement.appendChild(anUpdate);
            }
        }
    }
};

HAYATE.app.tasks.updateOnActionItem = function (task_updates, todo_updates)
{
    for(var task_id in task_updates)
    {
        var updateElement = document.getElementById('tu-'+task_id);
        var updates = task_updates[task_id];
        for(var j = 0; j < updates.length; j++)
        {
            var anUpdate = HAYATE.app.chat.util.createMessage(updates[j], 'areply');
            var updateElement = document.getElementById('tu-'+task_id);
            updateElement.appendChild(anUpdate);
        }
    }

    for(var task_id in todo_updates)
    {
        var updateElement = document.getElementById('tu-'+task_id);
        var updates = todo_updates[task_id];
        for(var j = 0; j < updates.length; j++)
        {
            var anUpdate = HAYATE.app.chat.util.createMessage(updates[j], 'areply');
            var updateElement = document.getElementById('tu-'+task_id);
            updateElement.appendChild(anUpdate);
        }        
    }
};

HAYATE.app.tasks.getTasks = function ()
{
    var httpreq = HAYATE.core.getXMLHttpRequest();
    if(!httpreq)
        return;

    httpreq.open("GET", "/tasks");

    httpreq.onreadystatechange = function()
    {
        // nothing to do
    };
    
    httpreq.send();
};

HAYATE.app.tasks.closeTask = function (task_id)
{
    var response = document.getElementById('response-'+task_id);

    if(response === null || response.value === "")
    {
        alert("Need update message to close the Action Item!");
        return;
    }

    var httpreq = HAYATE.core.getXMLHttpRequest();
    if(!httpreq)
    {
        return;
    }
    httpreq.open("POST", "/tasks/close");
    // django CSRF
    var cookie = document.cookie;
    httpreq.setRequestHeader("X-CSRFToken", cookie.substring(cookie.indexOf('csrftoken=')+'csrftoken='.length));    
    httpreq.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");

    httpreq.onreadystatechange = function()
    {
        // nothing to do
    };

    // kill the element.. will be redrawn as required
    document.getElementById(task_id).remove();

    httpreq.send('task_id='+task_id+'&message='+response.value);
};
