from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from ttio.models import Conversation
from helpers import normalize, best_response

# Create your views here.
def index(request):
    context = {     }     
    return render(request, 'ttio/index.html', context)

def about(request):
    context = {     }
    return render(request, 'ttio/about.html', context)

@csrf_exempt
def conversation_VC(request):
    #TODO: this takes in a sentence (from the user),
    #and returns a sentence (from Alan)
    
    #TODO will need some validation and stuff? otherwise can get random stuff/errors 
    #if we have the wrong stuff submitted, which would mess up the model.
    
    conversation = Conversation.objects.filter(question = str(request.body))
    
    #print request.GET['user']
    
    if conversation.exists():
        candidates = dict(conversation[0].responses) #TODO let's make this not an array?
        best = best_response(candidates)
        return JsonResponse({'response': best})  
        
    else:
        # This is a new question. Let's start a new model for it.
        default = {"I'm sorry, I don't quite understand.": 1.0}
        Conversation.objects.create(question=str(request.body), responses = default)
        
        return JsonResponse({'response':"I'm sorry, I don't quite understand."})    


@csrf_exempt
def punish(request):
    print "Punish Him!", request.body
    
    return HttpResponse(status=201)
    
@csrf_exempt
def reward(request):
    print "Reward view controller", request.body
    
    return HttpResponse(status=201)
    


#it should also maybe eavesdrop? First thing we want it to do is converse.
#the conversations it's eavesdropping on would be going through socket.io
#so going to be a bit more complex to hook into/learn from

#if eavesdropping
    #send transcript to model, don't expect anything back

#if turing testing
    #send transcript to model, get response sentence back
    #return












