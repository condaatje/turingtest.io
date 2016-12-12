from sklearn.feature_extraction.text import TfidfVectorizer
import nltk, string

stemmer = nltk.stem.porter.PorterStemmer()
remove_punctuation_map = dict((ord(char), None) for char in string.punctuation)

def stem_tokens(tokens):
    return [stemmer.stem(item) for item in tokens]

#remove punctuation, lowercase, stem
def normalize(text):
    # TODO do I really want to stem?
    # TODO might not want to remove punctuation either.
    # Should converge regardless (since we're still creating a new object for each different question)
    return stem_tokens(nltk.word_tokenize(text.lower().translate(remove_punctuation_map)))

vectorizer = TfidfVectorizer(tokenizer=normalize)#, stop_words='english') - I didn't like 'who are you?' being the same as 'how are you?'    

# Cosine similarity between two sentences.
def cosine_sim(text1, text2):
    tfidf = vectorizer.fit_transform([text1, text2])
    return ((tfidf * tfidf.T).A)[0,1]


# This is the incoming structure
# {
#       "I'm sorry, I don't quite understand." : {
#             "frequency": 1.0,
#             "failures": 0.0,   
#         }
# }
def best_response(dictionary):
    # TODO stochasticity? Might violate blockheadiness, but could be good for learning.
    
    best = "Uh what?" # shouldn't go through
    best_num = float('inf')

    for response, data in dictionary.iteritems():
        percent_fail = data["failures"] / data["frequency"]
        if percent_fail < best_num:
            best = response
            best_num = percent_fail
    
    return best
