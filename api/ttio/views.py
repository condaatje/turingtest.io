from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from ttio.models import Conversation

# Create your views here.
def index(request):
    context = {     }     
    return render(request, 'ttio/index.html', context)

def about(request):
    context = {     }
    return render(request, 'ttio/about.html', context)

@csrf_exempt
def model_VC(request):
    #TODO: this takes in a sentence (from the user),
    #and returns a sentence (from Alan)
    
    #TODO will need some validation and stuff? otherwise can get random stuff/errors 
    #if we have the wrong stuff submitted, which would mess up the model.
    
    #it should also maybe eavesdrop? First thing we want it to do is converse.
    #the conversations it's eavesdropping on would be going through socket.io
    #so going to be a bit more complex to hook into/learn from
    
    #if eavesdropping
        #send transcript to model, don't expect anything back
    
    #if turing testing
        #send transcript to model, get response sentence back
        #return
    
    #print "From the Client: " + str(request.body)
    
    something = Conversation.objects.filter(question = str(request.body))
    
    if something.exists():
        #get the responses
        l = dict(something[0].responses) #TODO let's make this not an array?
        
        best = "bad best"
        best_num = -1
        for response, goodness in l.iteritems():
            if goodness > best_num:
                best = response
                best_num = goodness
        
        return JsonResponse({'response': best})  
        
    else:
        
        Conversation.objects.create(question=str(request.body),
            responses = {
                'good response': 0.9,
                'bad response': 0.1
            }
        )
        
        return JsonResponse({'response':'Hello, my name is Alan.'})    















