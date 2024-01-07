from collections import namedtuple
from openai import OpenAI
client = OpenAI()

#chat_completion = client.chat.completions.create(
#    model="gpt-3.5-turbo",
#    messages=[
#        {"role": "user", "content": "Hello world"},
#    ]
#)

#print(chat_completion)
# ChatCompletion(id='chatcmpl-8eFLyLACkX68Dj5g4fl4SBiCiqckn', choices=[Choice(finish_reason='stop', index=0, logprobs=None, message=ChatCompletionMessage(content='Hello! How can I assist you today?', role='assistant', function_call=None, tool_calls=None))], created=1704602830, model='gpt-3.5-turbo-0613', object='chat.completion', system_fingerprint=None, usage=CompletionUsage(completion_tokens=9, prompt_tokens=9, total_tokens=18))
ChatResponse = namedtuple('ChatResponse', 'response role')

def chat(prompt):
    chat_completion = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "user", "content": prompt},
        ]
    )
    return ChatResponse(chat_completion.choices[0].message.content, 'robot')
