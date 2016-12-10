from sklearn.feature_extraction.text import TfidfVectorizer
import nltk, string

stemmer = nltk.stem.porter.PorterStemmer()
remove_punctuation_map = dict((ord(char), None) for char in string.punctuation)
    
def stem_tokens(tokens):
    return [stemmer.stem(item) for item in tokens]

'''remove punctuation, lowercase, stem'''
def normalize(text):
    return stem_tokens(nltk.word_tokenize(text.lower().translate(remove_punctuation_map)))

vectorizer = TfidfVectorizer(tokenizer=normalize)#, stop_words='english') - I didn't like 'who are you?' being the same as 'how are you?'    

def cosine_sim(text1, text2):
    tfidf = vectorizer.fit_transform([text1, text2])
    return ((tfidf * tfidf.T).A)[0,1]


# def normalize(dictionary):
#     total_weight = 0.0
    
#     for goodness in l.values():
#         total_weight += goodness
    
#     for response, goodness in l.iteritems():
#         dictionary[response] = goodness / total_weight



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
