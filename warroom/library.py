# Helpers and other utils

def query(entity, clause):
    """ forms SELECT * FROM <entity> <clause> and returns
    """
    return 'SELECT * FROM ' + entity + ' ' + clause;
