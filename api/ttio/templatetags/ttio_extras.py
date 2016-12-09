from django import template


register = template.Library()

@register.filter(takes_context=True)
def percent(value, arg):
    try:
        return (float(value) / float(arg)) * 100
    except (ValueError, ZeroDivisionError):
        return 0
        
#http://stackoverflow.com/questions/8447913/is-there-a-filter-for-divide-for-django-template