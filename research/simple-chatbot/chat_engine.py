from collections import namedtuple
ChatResponse = namedtuple('ChatResponse', 'response role')

def chat(prompt):
    return ChatResponse(f"hello, {prompt}!", "robot")
