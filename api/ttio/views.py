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
import random
from django.conf import settings


def index(request):
    
    return JsonResponse({'response': "TODO api GUI?"})
    
def about(request):
    return JsonResponse({'response': "TODO api info?"})


#Someone has asked Alan something. Return his response.
def response(request):
    # TODO will we need some validation? otherwise can get random stuff/errors 
    # if we have the wrong stuff submitted, which would mess up the model.
    # not essential for final proj.
    transcript = json.loads(request.body)
    
    #Transcript builds downwards - most recent interactions on top.
    question = transcript[0]
    
    try:
        # If we've seen this conversation before, use its best response.
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
        # If we haven't seen this question before, use the most similar one.
        conversations = Conversation.objects.all() # TODO figure out how resource-intensive this is, and whether it can be put db-side
        
        # has to at least be a little similar, otherwise go with a random prior.
        best_similarity = settings.SIMILARITY_THRESHOLD
        best_convo = random.choice(conversations)
        
        for conversation in conversations:
            q = conversation.question
            sim = cosine_sim(q, question)
            if best_similarity < sim:
                best_similarity = sim
                best_convo = conversation
        
        # Get best response from our most similar question
        candidates = best_convo.responses
        best = best_response(candidates)
        
        # Create a new object with the new question and the old one's best responses (cross-pollination)
        Conversation.objects.create(question = question, responses = best_convo.responses)
        
        return JsonResponse({'response': best})    


# Alan must ask something - what does he want to know?
# takes in a transcript and returns a question - continues the conversation.
def question(request):
    transcript = json.loads(request.body)
    conversations = Conversation.objects.all() # TODO performance/resource analysis

    toughest, most_fail = None, -float('inf')
    for conversation in conversations:
        percent_fail = float(conversation.failures)/float(conversation.frequency)
        
        # If this question leads to failure a lot, we need to get some help on it.
        if percent_fail > max(most_fail, settings.FAILURE_THRESHOLD) and not conversation.question in transcript:
            toughest = conversation
            most_fail = percent_fail
    
    if toughest == None:
        # Eventually I hope to be able to rig Alan up to chatbots 
        # to see whether he can identify them correctly as machines,
        # But for now we can just assume that the counterpart is human.
        return JsonResponse({'response': "/human"})
    else:
        # reduce our perception of p(failure) now that we have some human convo
        toughest.frequency = toughest.frequency + 1
        toughest.save()
        
        return JsonResponse({'response': toughest.question})

# TODO is this meddling?
def delete(request):
    transcript = json.loads(request.body)
    
    # NOT IMPLEMENTED - because we are off-policy, as purists we shouldn't touch the model.
    # Only the good bits of the model (as defined by how good p(success) is) will actually survive.
    
    return HttpResponse(status=201)


def clean(request):
    # Clean up the database. Responses with poor p(success) are removed.
    # This will hopefully keep us from exponential blowup in cross-pollination.
    # right now it's exposed, so keep that in mind.
    
    for conversation in Conversation.objects.all():
        responses = {}
        for response, data in conversation.responses.iteritems():
            p_fail = data["failures"] / data["frequency"]
            if p_fail < settings.FAILURE_THRESHOLD:
                responses[response] = data
        
        conversation.responses = responses
        conversation.save();
    
    
    return HttpResponse(status=201)


def punish(request):
    # TODO verification - this could get real strange if some other data comes through here
    # Not necessary for final project scope
    
    transcript = json.loads(request.body)
    
    # TODO there is a cleaner way to do this.
    response = transcript[0]
    question = transcript[1]
    
    print "bad response to \"" + question + "\" is: \"" + response + "\""
    
    # TODO can punish preceding questions & responses at a discounted rate?
    
    try:
        conversation = Conversation.objects.get(question = question)
        conversation.failures = F('failures') + (1.0 * settings.FAILURE_WEIGHT)
        
        # Update our belief of how good a response is
        if response in conversation.responses:
            frequency = conversation.responses[response]["frequency"]
            failures = conversation.responses[response]["failures"]
            conversation.responses[response] = {
                "frequency": frequency + (1.0 * settings.FAILURE_WEIGHT),
                "failures": failures + (1.0 * settings.FAILURE_WEIGHT),
            }
        else:
            # probably shouldn't happen since we've got cross-pollination
            conversation.responses[response] = {
                "frequency": 1.0,
                "failures": 1.0,
            }
        
        conversation.save()
        
    except ObjectDoesNotExist:
        print "ERROR - punish found a question that hasn't yet been added to the model: shouldn't happen."
        
    return HttpResponse(status=201)
    

# Takes in a transcript and rewards it
def reward(request):
    
    transcript = json.loads(request.body)
    
    # TODO sometimes this is out of range because the subject talks first. Not essential for final project scope. 
    # There's also definitely a better/cleaner way to do this.
    question = transcript[1]
    response = transcript[0]
    
    print "good response to \"" + transcript[1] + "\" is: \"" + transcript[0] + "\""
    
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
        
    except ObjectDoesNotExist: #(activates during eavesdropping)
        # This is a new question. 
        # Let's start a new model for it with the response we've just seen succeed.
        good_response = {
            response: {
                "frequency": 1.0,
                "failures": 0.0,
            }
        }
        Conversation.objects.create(question = question, responses = good_response)

    return HttpResponse(status=201)


def model(request):
    # Display our current beliefs.
    
    context = {'data':{}}
    for item in Conversation.objects.all():
        context['data'][item.question] = {
            'responses': item.responses,
            'failures': float(item.failures),
            'frequency': float(item.frequency),
        }

    # return JsonResponse(context) more 'API'-style, but don't need to be so strict.
    return render(request, 'ttio/model.html', context)


# Ended up not needing the NLP stuff, but may eventually want it back.
def nlp(request):
    nlp = StanfordCoreNLP('http://localhost:9000')
    
    text = (
        'Pusheen and Smitha walked along the beach. '
        'Pusheen wanted to surf, but fell off the surfboard.')
    
    output = nlp.annotate(text, properties = {
        'annotators': 'tokenize,ssplit,pos,depparse,parse',
        'outputFormat': 'json'
    })
    
    return JsonResponse(output)
