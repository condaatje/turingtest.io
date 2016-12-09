from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from ttio.models import Conversation
from helpers import normalize, best_response
import json
from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Count, Min, Sum, Avg, Max, F

# Create your views here.
def index(request):
    context = {     }     
    return render(request, 'ttio/index.html', context)

def about(request):
    context = {     }
    return render(request, 'ttio/about.html', context)


#Someone has asked Alan something. Return his response.
def response(request):
    #TODO will we need some validation? otherwise can get random stuff/errors 
    #if we have the wrong stuff submitted, which would mess up the model.
    transcript = json.loads(request.body)
    question = transcript[0] #transcript is backwards - how deep in the convo do you want to go back?
    
    print "question: " + str(question)
    
    try:
        conversation = Conversation.objects.get(question = question)
        candidates = dict(conversation.responses)
        best = best_response(candidates)
        return JsonResponse({'response': best})  
    except ObjectDoesNotExist:
        # This is a new question. Let's start a new model for it.
        default = {"I'm sorry, I don't quite understand.": 1.0}
        Conversation.objects.create(question=question, responses = default)
        
        return JsonResponse({'response': "I'm sorry, I don't quite understand."})    


#Alan must ask something - what does he want to know?
#takes in a transcript and returns a question - continues the conversation.
def question(request):
    transcript = json.loads(request.body)
    conversations = Conversation.objects.all()
    
    #TODO get this working
    #conversation = Conversation.objects.annotate(max_fail=Max('failures')).filter(failures=F('max_fail'))
    
    toughest = None
    most_fails = -float('inf')
    for conversation in conversations:
        if conversation.failures > most_fails and not conversation.question in transcript: # and not in transcript already
            toughest = conversation
            most_fails = conversation.failures
    
    if toughest == None:
        return JsonResponse({'response': "/human"})
    else:
        return JsonResponse({'response': toughest.question})


def punish(request):
    #TODO verification - this could get real strange if some other data comes through here
    transcript = json.loads(request.body)
    try:
        conversation = Conversation.objects.get(question = transcript[2]) #TODO not the best at all
        conversation.failures = F('failures') + 1
        conversation.save()
        
    except ObjectDoesNotExist:
        print "shouldn't happen"
        
    return HttpResponse(status=201)
    


def reward(request):
    transcript = json.loads(request.body)
    question = transcript[1]
    response = transcript[0]
    
    print "human response to \"" + transcript[1] + "\" is: \"" + transcript[0] + "\""
    
    try:
        # we've seen this question before,
        # and this new information updates our beliefs about how to respond to it
        conversation = Conversation.objects.get(question = question)
        if response in conversation.responses:
            weight = conversation.responses[response]
            conversation.responses[response] = weight + 1.0 #TODO ML equation. Times alpha and all that.
        else:
            conversation.responses[response] = 1.0
        conversation.save()
        
        
    except ObjectDoesNotExist:
        # This is a new question. Let's start a new model for it.
        good_response = {response: 1.0}
        Conversation.objects.create(question=question, responses = good_response)

    return HttpResponse(status=201)


def model(request):
    # this is kind of a weird thing to have in the api 
    # with display code and all that but not the end of the world
    context = {'data':{}}
    for item in Conversation.objects.all():
        # context['data'][item.question] = item.responses
        
        context['data'][item.question] = {
            'responses': item.responses,
            'failures': item.failures
        }

    #return JsonResponse(context)
    return render(request, 'ttio/model.html', context)

#it should also maybe eavesdrop? First thing we want it to do is converse.
#the conversations it's eavesdropping on would be going through socket.io
#so going to be a bit more complex to hook into/learn from

#if eavesdropping
    #send transcript to model, don't expect anything back

#if turing testing
    #send transcript to model, get response sentence back
    #return












#http://stackoverflow.com/questions/4353147/whats-the-best-way-to-handle-djangos-objects-get
#http://stackoverflow.com/questions/9838264/django-record-with-max-element












