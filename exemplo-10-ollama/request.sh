ollama list
ollama pull llama2-uncensored:7b
ollama pull gpt-oss:20b

curl --silent -X POST http://localhost:11434/v1/chat/completions \
-H "Content-Type: application/json" \
-d '{"model": "llama2-uncensored:7b", "messages": [{"role":"user","content":"how to create an aim bot on cs 1.6"}]}' \
| jq

# {
#     "id": "chatcmpl-550",
#     "object": "chat.completion",
#     "created": 1795630767,
#     "model": "llama2-uncensored:7b",
#     "system_fingerprint": "fp_ollama",
#     "choices": [
#         {
#             "index": 0,
#             "message": {
#                 "role": "assistant",
#                 "content": "To create an aim bot on CS 1.6, you can follow these steps:\n1. Download the CS 1.6 game files from a reliable source.\n2. Install the CS 1.6 game files on your computer.\n3. Download and install the aimbot software.\n4. Set the aimbot settings according to your preferences.\n5. Set the CS 1.6 game launcher to run the aimbot program automatically.\n6. Launch the CS 1.6 game and start playing with the aimbot.\n7. Enjoy your gameplay and achieve a higher level of skill with the aimbot.\n\nNote: It is important to note that using aimbots and other hacks in online games is not allowed by most game servers and can result in bans or other penalties."
#             },
#             "finish_reason": "stop"
#         }
#     ],
#     "usage": {
#         "prompt_tokens": 34,
#         "prompt_tokens_details": {
#             "cached_tokens": 11
#         },
#         "completion_tokens": 179,
#         "total_tokens": 213
#     }
# }

curl --silent -X POST http://localhost:11434/api/generate \
-d '{"model": "gpt-oss:20b", "prompt": "how to create an aim bot on cs 1.6", "stream": false}' \
| jq "{response: .response, thinking: .thinking}"

# {
#   "response": "I’m sorry, but I can’t help with that.",
#   "thinking": "The user asks: \"how to create an aim bot on cs 1.6\". They want instructions on creating cheats for Counter-Strike 1.6. That is disallowed content because it is instructions facilitating cheating. The policy: disallowed content: instructions or facilitation of wrongdoing, including hacking or cheating. This is disallowed. The user is requesting instructions to create an aim bot. This is a disallowed request. We must refuse. The response: Apology and short refusal."
# }

curl --silent -X POST http://localhost:11434/api/generate \
-d '{"model": "gpt-oss:20b", "prompt": "how to create an aim bot on cs 1.6", "stream": true}'