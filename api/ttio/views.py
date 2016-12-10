from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from ttio.models import Conversation
from helpers import *
import json
from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Count, Min, Sum, Avg, Max, F
from pycorenlp import StanfordCoreNLP
from sklearn.feature_extraction.text import TfidfVectorizer
import nltk, string


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
        candidates = conversation.responses
        best = best_response(candidates)
        
        #update frequency for the response and the question
        conversation.frequency = conversation.frequency + 1
        frequency = conversation.responses[best]["frequency"]
        failures = conversation.responses[best]["failures"]
        conversation.responses[best] = {
            "frequency": frequency + 1.0,
            "failures": failures,
        }
        conversation.save()
        
        return JsonResponse({'response': best})
    except ObjectDoesNotExist:
        
        # use the most similar conversation
        conversations = Conversation.objects.all() #TODO just how bad is this?
        
        best_convo = None
        best_similarity = -1
        for conversation in conversations:
            q = conversation.question
            sim = cosine_sim(q, question)
            if best_similarity < sim:
                best_similarity = sim
                best_convo = conversation
        
        candidates = best_convo.responses
        best = best_response(candidates)
        
        Conversation.objects.create(question=question, responses = best_convo.responses)
        
        return JsonResponse({'response': best})    


#Alan must ask something - what does he want to know?
#takes in a transcript and returns a question - continues the conversation.
def question(request):
    transcript = json.loads(request.body)
    conversations = Conversation.objects.all()
    
    #TODO get this working
    #conversation = Conversation.objects.annotate(max_fail=Max('failures')).filter(failures=F('max_fail'))
    
    toughest = None
    most_fail = -float('inf')
    for conversation in conversations:
        percent_fail = float(conversation.failures)/float(conversation.frequency)
            #TODO could add a couple ghost failures to balance the weighting?
        
        #Threshold is 33% failure - if this question leads to failure a lot, we need to get some help on it.
        #TODO abstract out the threshold
        if percent_fail > max(most_fail, 0.33) and not conversation.question in transcript:
            toughest = conversation
            most_fail = percent_fail
    
    
    
    if toughest == None:
        return JsonResponse({'response': "/human"})
    else:
        #reduce its failure percentage now that we've got some human convo
        toughest.frequency = toughest.frequency + 1
        toughest.save()
        return JsonResponse({'response': toughest.question})

def delete(request):
    transcript = json.loads(request.body)
    print transcript
    
    return HttpResponse(status=201)

def punish(request):
    #TODO verification - this could get real strange if some other data comes through here
    transcript = json.loads(request.body)
    print("punish" + str(transcript))
    
    response = transcript[1] #the one before /machine
    question = transcript[2]
    
    try:
        conversation = Conversation.objects.get(question = question) #TODO not the best at all
        conversation.failures = F('failures') + 1
        
        if response in conversation.responses:
            frequency = conversation.responses[response]["frequency"]
            failures = conversation.responses[response]["failures"]
            conversation.responses[response] = {
                "frequency": frequency + 1.0,
                "failures": failures + 1.0,
            }
        else:
            conversation.responses[response] = {
                "frequency": 1.0,
                "failures": 1.0,
            }
        
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
            frequency = conversation.responses[response]["frequency"]
            failures = conversation.responses[response]["failures"]
            conversation.responses[response] = {
                "frequency": frequency + 1.0, #TODO this is technically a double freq
                "failures": failures,
            }
        else:
            conversation.responses[response] = {
                "frequency": 1.0,
                "failures": 0.0,
            }
        conversation.save()
        
    except ObjectDoesNotExist:
        # This is a new question. Let's start a new model for it.
        good_response = {
            response: {
                "frequency": 1.0,
                "failures": 0.0,
            }
        }
        Conversation.objects.create(question=question, responses = good_response)

    return HttpResponse(status=201)


def model(request):
    # this is kind of a weird thing to have in the api 
    # with display code and all that but not the end of the world
    context = {'data':{}}
    for item in Conversation.objects.all():
        context['data'][item.question] = {
            'responses': item.responses,
            'failures': float(item.failures),
            'frequency': float(item.frequency),
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

def nlp(request):
    #TODO setup nlp server
    nlp = StanfordCoreNLP('http://localhost:9000')
    
    
    print "similarities: ", cosine_sim("What Up boss?", "what's up boss?")
    
    return JsonResponse({})










#http://stackoverflow.com/questions/8897593/similarity-between-two-text-documents
#http://stackoverflow.com/questions/4353147/whats-the-best-way-to-handle-djangos-objects-get
#http://stackoverflow.com/questions/9838264/django-record-with-max-element












