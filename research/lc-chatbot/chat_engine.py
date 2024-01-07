#!/usr/bin/env python3

#from dotenv import load_dotenv
#load_dotenv()
from langchain.agents import AgentType, Tool, initialize_agent
from langchain.llms import OpenAI
from langchain.memory import ConversationBufferMemory
from langchain.utilities import SerpAPIWrapper

from langchain import hub
from langchain.agents.format_scratchpad import format_log_to_str
from langchain.agents.output_parsers import ReActSingleInputOutputParser
from langchain.tools.render import render_text_description
#from langchain.utilities import DuckDuckGoSearchAPIWrapper
from langchain_core.prompts import PromptTemplate

#search = SerpAPIWrapper()
#search = DuckDuckGoSearchAPIWrapper()
tools = [
#    Tool(
#        name="Search",
#        func=search.run,
#        description="useful for when you need to answer questions about current events. You should ask targeted questions",
#    ),
]

from langchain.callbacks.openai_info import OpenAICallbackHandler as CallbackHandler

handler = CallbackHandler()
print(handler.always_verbose)
llm = OpenAI(temperature=0, callbacks=[handler])
prompt = PromptTemplate.from_template("""
Assistant is a large language model trained by OpenAI.

Assistant is designed to be able to assist with a wide range of tasks, from answering simple questions to providing in-depth explanations and discussions on a wide range of topics. As a language model, Assistant is able to generate human-like text based on the input it receives, allowing it to engage in natural-sounding conversations and provide responses that are coherent and relevant to the topic at hand.

Assistant is constantly learning and improving, and its capabilities are constantly evolving. It is able to process and understand large amounts of text, and can use this knowledge to provide accurate and informative responses to a wide range of questions. Additionally, Assistant is able to generate its own text based on the input it receives, allowing it to engage in discussions and provide explanations and descriptions on a wide range of topics.

When you have a response to say to the Human, or if you do not need to use a tool, you MUST use the format:

```
Thought: Do I need to use a tool? No
Final Answer: [your response here]
```

Begin!

Previous conversation history:
{chat_history}

New input: {input}
{agent_scratchpad}
""")
#prompt = hub.pull("hwchase17/react-chat")

prompt = prompt.partial(
    tools=render_text_description(tools),
    tool_names=", ".join([t.name for t in tools]),
)

print(f"type:{type(prompt)}, prompt:{prompt}\n===============")

llm_with_stop = llm.bind(stop=["\nObservation"])

agent = (
    {
        "input": lambda x: x["input"],
        "agent_scratchpad": lambda x: format_log_to_str(x["intermediate_steps"]),
        "chat_history": lambda x: x["chat_history"],
    }
    | prompt
    | llm_with_stop
    | ReActSingleInputOutputParser()
)
print(f"agent type:{type(agent)}, agent:{agent}\n===============")

from langchain.agents import AgentExecutor

memory = ConversationBufferMemory(memory_key="chat_history")
agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True, memory=memory)

def invoke(input_text:str):
    result = agent_executor.invoke({"input": input_text})
    print(result)
    return result["output"]

#result1 = agent_executor.invoke({"input": "hi, i am bob"})
#print(result1)
#print(result1["output"])
#result2 = agent_executor.invoke({"input": "whats my name?"})
#print(result2)
#print(result2["output"])
#print(f"OpenAI Handler: {handler}")

from collections import namedtuple
ChatResponse = namedtuple('ChatResponse', 'response role')
def chat(prompt):
    result = agent_executor.invoke({"input": prompt})
    print(f"result: {result}")
    return ChatResponse(result['output'], 'robot')

def get_previous_messages():
    messages = []
    history = memory.load_memory_variables({})
    for message in history['chat_history'].split('\n'):
        full_message = message.split(':')
        if len(full_message) != 2:
            continue
        role = full_message[0]
        text = full_message[1]
        messages.append({
            'role': full_message[0],
            'content': full_message[1],
        })
    return messages
