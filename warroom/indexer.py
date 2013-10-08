from datetime import datetime
import logging

from google.appengine.ext import ndb
from google.appengine.api import search

def conv_index_name():
    """
    returns the name of the index used for indexing/maintaining the
    conversation documents. maintains models.Message and models.ReplyMessage
    """
    return 'HAYATE_CONV_INDEX'

class Message(object):
    MESSAGE = 'message'
    USERNAME = 'username'
    USERNICKNAME = 'user_nickname'
    USEREMAIL = 'user_email'
    DATETIME = 'datetime'
    CONV_ID = 'conv_id'
    MSG_ID = 'msg_id'
    ROOM_ID = 'room_id'

def index_msg(message, conv_id, room_id):
    """ takes an instance of models.Message, creates a documents and adds it to
    conversation index
    """

    # create a Document
    u = message.user.get()
    doc = search.Document(fields=[
        search.TextField(name=Message.MESSAGE, value=message.message),
        search.TextField(name=Message.USERNAME, value=u.username),
        search.TextField(name=Message.USERNICKNAME, value=u.nickname),
        search.TextField(name=Message.USEREMAIL, value=u.email),
        search.DateField(name=Message.DATETIME, value=datetime.now()),
        search.AtomField(name=Message.CONV_ID, value=conv_id),
        search.AtomField(name=Message.MSG_ID, value=str(message.key.id())),
        search.AtomField(name=Message.ROOM_ID, value=str(room_id))
        ])
    
    try:
        index = search.Index(name=conv_index_name())
        index.put(doc)
    except search.Error as e:
        logging.error('indexer::index_conv exception caught: ' + str(e))


def search_msg(query_string, limit, offset):
    """ takes a query, sets the limit on the results and fetches the
    results from offset
    """

    sort_opts = search.SortOptions(expressions=[])
    query_options = search.QueryOptions(
        limit=limit,
        offset=offset,
        sort_options=sort_opts)
    query = search.Query(query_string=query_string, options=query_options)

    try:

        index = search.Index(name=conv_index_name())
        results = index.search(query)
        return results
    
    except search.Error as e:
        logging.error('indexer::search_msg exception occured: ' + str(e))
