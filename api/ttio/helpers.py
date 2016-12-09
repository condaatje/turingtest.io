


def normalize(dictionary):
    total_weight = 0.0
    
    for goodness in l.values():
        total_weight += goodness
    
    for response, goodness in l.iteritems():
        dictionary[response] = goodness / total_weight



# This is the incoming structure
# default = {
#             "I'm sorry, I don't quite understand." : {
#                 "frequency": 1.0,
#                 "failures": 0.0,   
#             }
#         }
def best_response(dictionary):
    best = "bad best"
    best_num = float('inf')

    for response, data in dictionary.iteritems():
        percent_fail = data["failures"] / data["frequency"]
        if percent_fail < best_num:
            best = response
            best_num = percent_fail
    
    return best
