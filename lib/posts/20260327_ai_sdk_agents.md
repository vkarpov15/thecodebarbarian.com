My previous post covered the [basics of the Vercel AI SDK](./getting-started-with-the-vercel-ai-sdk-in-nodejs.html): making single LLM requests to different LLM providers.
However, the AI SDK also provides a [lightweight framework to build AI agents](https://ai-sdk.dev/docs/agents/overview) via the `ToolLoopAgent` class.
In this blog post, I'll show how to build an agent that plays the [20 Questions game](https://en.wikipedia.org/wiki/Twenty_questions) using the Vercel AI SDK.

## Your First Agent

An _agent_ is a loop that makes an LLM call at each step to process input and decide the next action.
A one-step agent is equivalent to a single LLM call - for example, the following agent outputs a one sentence description of what an agent is.

```javascript
import { ToolLoopAgent } from 'ai';
import { openai } from '@ai-sdk/openai';

const prompt = 'Write one short sentence explaining what an AI agent is.';

const agent = new ToolLoopAgent({
  model: openai('gpt-4o-mini'),
  system: 'You are a concise assistant. Answer in plain text.',
  tools: {} // More on this in the next section
});

const result = await agent.generate({ prompt });

// "An AI agent is a computer program designed to autonomously perform
// tasks or make decisions based on its environment and data."
console.log(result.text);
```

At each step, the `ToolLoopAgent` class executes a separate tool or generates text, and if it generates text the agent completes.
Each agent step:

1. LLM decides: respond or call a tool
2. If tool → execute it and append result
3. Repeat until model returns text

So in order to get a true loop, we need to add tools.

## Adding Tools

A _tool_ is a function the agent can call.
Tools are just Node.js functions that have an associated `inputSchema`.
They can read files, make API calls, write to databases, etc.

They can even ask the user a question at the command line.
For example, the following "Hello, World" agent will ask the user their name before greeting them via the `askForName` tool.

```javascript
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import { ToolLoopAgent, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const prompt = 'Greet the user based on their name.';

async function promptForName() {
  const rl = createInterface({ input, output });

  try {
    const name = await rl.question('What is your name? ');
    return name.trim() || 'friend';
  } finally {
    rl.close();
  }
}

const agent = new ToolLoopAgent({
  model: openai('gpt-4o-mini'),
  instructions:
    'Greet the user based on their name and preferred language',
  tools: {
    askForName: tool({
      description: 'Ask the user for their name on the command line.',
      inputSchema: z.object({}),
      execute: async () => {
        const name = await promptForName();
        return { name };
      }
    })
  }
});

const result = await agent.generate({ prompt });

// "Hello, <name response>! How can I assist you today?"
console.log(result.text.trim());
```

The agent result also includes an array of `steps` that contains the LLM calls the agent made at each step.
For example, if you print out each step as follows:

```javascript
console.log(
  result.steps.map(step => ({
    model: step.model,
    response: step.response.body.output[0]
  }))
);
```

You'll see the following output, which shows the first step called the `askForName` tool and the second step responded with a message.
The steps output is especially useful for debugging - you can see exactly when the model chose to call a tool vs respond, and what arguments it passed.

```
[
  {
    model: { provider: 'openai.responses', modelId: 'gpt-4o-mini' },
    response: {
      id: 'fc_0f6338b02ed6ee9d0069c6de4cbe6c8193b50492ea1c53e52a',
      type: 'function_call',
      status: 'completed',
      arguments: '{}',
      call_id: 'call_UQzm9lz8C8sNgnv0zFeOwKSp',
      name: 'askForName'
    }
  },
  {
    model: { provider: 'openai.responses', modelId: 'gpt-4o-mini' },
    response: {
      id: 'msg_0f6338b02ed6ee9d0069c6de4e70b88193a1a0d0a3b7067245',
      type: 'message',
      status: 'completed',
      content: [Array],
      role: 'assistant'
    }
  }
]
```

## Bringing It All Together

Combining the prompt and instructions with a tool that can ask the user questions means you can write an agent that plays [20 Questions](https://en.wikipedia.org/wiki/Twenty_questions) with you - a basic game where the agent asks yes/no questions to determine what person, place, or thing the user is thinking of.

To play this game, all the agent needs is an `askUser` tool, instructions, and a `stepCountIs` check to enforce stopping after 20 turns.
`stepCountIs(21)` prevents runaway loops - without it, the agent could keep asking questions indefinitely.

```javascript
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import { ToolLoopAgent, stepCountIs, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const prompt = 'Play 20 Questions with the user. The user has already thought of a person, place, or thing.';

const rl = createInterface({ input, output });

async function askUser(question) {
  const answer = await rl.question(`\n${question}\n> `);
  return answer.trim() || 'I do not know.';
}

const agent = new ToolLoopAgent({
  model: openai('gpt-4o-mini'),
  instructions: [
    'You are playing 20 Questions.',
    'The user has thought of a person, place, or thing.',
    'Ask exactly one question at a time using the askQuestion tool.',
    'Prefer yes/no questions, but accept any user response.',
    'Ask at most 20 questions total.',
    'When you are ready to guess, stop calling tools and respond with a final guess in plain text.'
  ].join(' '),
  stopWhen: stepCountIs(21),
  tools: {
    askQuestion: tool({
      description: 'Ask the user one question in the terminal and return their answer.',
      inputSchema: z.object({
        question: z.string().min(1)
      }),
      execute: async ({ question }) => {
        const answer = await askUser(question);
        return { answer };
      }
    })
  }
});

console.log('Think of a person, place, or thing. The agent will now play 20 Questions.');

try {
  const result = await agent.generate({ prompt });
  console.log(`\nFinal guess: ${result.text.trim()}`);
} finally {
  rl.close();
}
```

Here's the output of a sample game:

```
Think of a person, place, or thing. The agent will now play 20 Questions.

Is it a living being?
> No

Is it something that is commonly found indoors?
> Yes

Is it an electronic device?
> Yes

Is it used for communication?
> Yes

Is it primarily a mobile device?
> Yes

Is it a smartphone?
> No

Is it a tablet?
> No

Is it a type of wearable technology?
> No

Is it a laptop?
> Yes

Is it a specific brand, like Apple or Dell?
> Yes

Is it an Apple laptop?
> Yes

Final guess: I guess the item you're thinking of is a MacBook!
```

## Moving On

This example is intentionally simple for the purposes of tinkering and understanding, but the same pattern works for real workflows.
Imagine a dev tools that can automatically query logs, or a changelog generator that reads commits and summarizes changes.
In all these cases, the pattern is the same: LLM decides, tools fetch data, repeat until done.
