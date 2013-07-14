# provides the salt to be used to save the passwords

class Salt(object):
    """ salt to be used to generate the digest to store the passwords
    """

    @classmethod
    def salt(cls):
        return "26238b0f340c9"
