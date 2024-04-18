Retrieval augmented generation, or RAG for short, is injects additional context into an LLM prompt in order to get better results.
[Many RAG tutorials focus on loading existing data sets](https://thecodebarbarian.com/rag-vector-search-with-astra-and-mongoose.html), which is a great use case for RAG.
But RAG can also be useful for user generated data.
For example, you can write a note taking application that lets the user input arbitrary text, like "my car is a 2020 Toyota Carolla with license plate 1234"; and then allow the user to ask questions like "what is my car's license plate?"
ChatGPT might not know what your car's license plate is, but, with the help of RAG, ChatGPT can answer questions like that based on your notes.

The [full source code for this note-taking application is available on GitHub](https://github.com/vkarpov15/rag-notes).
Or you can try a [rate-limited live example hosted on FL0 here](https://vkarpov15-rag-notes.1.us-1.fl0.io/).
This app uses [Astra](https://astra.datastax.com/) for vector search and ChatGPT to generate embeddings and answer questions.

Creating Notes
--------------

A `Note` is represented as a [Mongoose](https://mongoosejs.com/) model as follows.
A Note has two properties: a string `content`, which contains the raw text the user entered, and an array of numbers `$vector` that contains the embedding for vector search.
Below is the source code for the Note model, which is also [available on GitHub](https://github.com/vkarpov15/rag-notes/blob/main/backend/db/note.js).

```javascript
const mongoose = require('./mongoose');

const noteSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true
  },
  $vector: {
    type: [Number]
  }
}, { timestamps: true });

const Note = mongoose.model('Note', noteSchema);
module.exports = Note;
```

To use the Note model with vector search, you first need to create a `notes` collection in Astra that's configured to use vector search.
You can create the collection through the Astra UI, or by running the following JavaScript code.

```javascript
await Note.createCollection({
  vector: { dimension: 1536, metric: 'cosine' } 
}); 
```

The app has a [`saveNote` API endpoint](https://github.com/vkarpov15/rag-notes/blob/main/backend/api/saveNote.js) that stores a new note in the database.
The `saveNote` API endpoint takes in an arbitrary string `content`, converts it to an embedding using OpenAI's `text-embedding-ada-002` model, and stores the `content` and the 1536 length embedding in a new `Note` object.

```javascript
const Note = require('../db/note');
const axios = require('axios');

module.exports = async function saveNote(req, res) {
  const content = req.body.content;
  const $vector = await createEmbedding(content);

  const note = await Note.create({ content, $vector });

  const count = await Note.countDocuments({});

  return res.json({ note, count });
};

function createEmbedding(input) {
  return axios({
    method: 'POST',
    url: 'https://api.openai.com/v1/embeddings',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    data: {
      model: 'text-embedding-ada-002',
      input
    }
  }).then(res => res.data.data[0].embedding);
}
```


Answering Questions
-------------

The app also has a [`answerQuestion` API endpoint](https://github.com/vkarpov15/rag-notes/blob/main/backend/api/answerQuestion.js) that takes in an arbitrary `question`, finds the 3 most relevant `Note` documents to the user's question, and asks ChatGPT to answer the user's question based on the most relevant notes.

To find the 3 most relevant notes, you first need to convert the user's question into an embedding as follows.

```javascript
const embedding = await createEmbedding(req.body.question);
```

Then, you need to execute a Mongoose `find()` query with a special `sort()` based on `$vector`.
The following code tells Astra to sort `Note` documents based on their `$vector` property's cosine similarity to the given `embedding`, and return the 3 closest `Note` documents.

```javascript
const notes = await Note.find().limit(3).sort({ $vector: { $meta: embedding } });
```

Below is the complete source code of the `answerQuestion` endpoint.

```javascript
const Note = require('../db/note');
const axios = require('axios');

module.exports = async function answerQuestion(req, res) {
  const embedding = await createEmbedding(req.body.question);

  const notes = await Note.find().limit(3).sort({ $vector: { $meta: embedding } });

  const prompt = systemPrompt(notes);
  const data = await makeChatGPTRequest(prompt, req.body.question);

  return res.json(data);
};

const systemPrompt = (notes, question) => `
You are a helpful assistant that summarizes relevant notes to help answer a user's questions.
Given the following notes, answer the user's question.

${notes.map(note => 'Note: ' + note.content).join('\n\n')}
`.trim();

function makeChatGPTRequest(systemPrompt, question) {
  const options = {
    method: 'POST',
    url: 'https://api.openai.com/v1/chat/completions',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    data: {
      model: 'gpt-3.5-turbo-1106',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question }
      ]
    }
  };

  return axios(options).then(res => res.data);
}
```

What This Pattern Does Well and What It Does Poorly
---------------------------

The problem with storing facts like your car's license plate is searchability.
In conventional databases, it is hard to store this sort of information in a way that is searchable because the user needs to remember exactly how the data is stored.
With RAG, an LLM can answer unstructured text questions about unstructured text data, which makes it easier for the user to search.

For example, not only can the LLM answer "what is my car's license plate?", it can also answer "what is my auto's tag number?".
These two questions are semantically equivalent, but conventional keyword search would not be able to answer this question because the keywords in these two questions are all different.
Your user doesn't have to remember the exact phrasing they used when they entered the note.

![question](https://i.imgur.com/ewx9DQF.png)

One situation where this pattern does poorly is multiple time-based entries.
For example, say you got a new car and entered "my car is a 2021 Honda Civic with license plate 4567".
This app currently doesn't have a way to indicate that the new fact overrides the old fact.
The LLM will respond "Your car's license plate is 1234 if it's a 2020 Toyota Corolla and 4567 if it's a 2021 Honda Civic."

Moving On
---------

RAG enables an LLM to answer questions that it otherwise would not have the answer to.
And LLMs are good at inferring what the question means to ask independent of word choice: "what is my car's license plate?" and "what is my auto's tag number?" end up with equivalent answers.
That means vector search enables LLMs to effectively summarize a user's notes, where notes are just a collection of unstructured free-form text.
So check out the [RAG note taking app on GitHub](https://github.com/vkarpov15/rag-notes) and start learning vector search using [stargate-mongoose](https://www.npmjs.com/package/stargate-mongoose) today!