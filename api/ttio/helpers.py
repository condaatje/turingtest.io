


def normalize(dictionary):
    total_weight = 0.0
    
    for goodness in l.values():
        total_weight += goodness
    
    for response, goodness in l.iteritems():
        dictionary[response] = goodness / total_weight


def best_response(dictionary):
    best = "bad best"
    best_num = -float('inf')

    for response, goodness in dictionary.iteritems():
            if goodness > best_num:
                best = response
                best_num = goodness
    
    return best
