from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app

# Import various parts of Django.
import django.core.handlers.wsgi
import django.core.signals
import django.db
import django.dispatch.dispatcher
import django.forms

app = django.core.handlers.wsgi.WSGIHandler()

def main():
    run_wsgi_app(app)

if __name__ == "__main__":
    main()

