Vector databases are a hot topic right now, and with good reason.
When combined with AI tools like [ChatGPT](https://openai.com/blog/chatgpt), vector databases enable _semantic similarity search_: find me things that are similar to this other thing.
This form of search is more sophisticated than basic search engines or text search, because the search algorithm is able to interpret the semantics of the text, rather than just trying to match keywords.

One neat application of semantic search is topic classification: given a piece of text, determine which category out of a predetermined list best matches the text.
For example, given the sentence "apple jumped 10% today", is this sentence about "Food" or "Stocks"?
Conventional keyword search would struggle with this distinction, because there's no way to distinguish between apple (fruit) and Apple (company) without interpreting the semantics of the text.

In this tutorial, I'll walk you through using Node.js and a vector database called [Chroma](https://www.trychroma.com/) to build a toy topic classification tool.

Getting Started with Chroma
---------------------------

To run Chroma locally, you should clone the [Chroma GitHub repo](https://github.com/chroma-core/chroma) and run their docker-compose file as follows.

```
git clone https://github.com/chroma-core/chroma.git
cd chroma
docker-compose up -d --build
```

Once you have Chroma running, you should also get an [OpenAI key](https://openai.com/product) if you don't already have one.
You can then use your OpenAI key to store an embedding for a given sentence in Chroma.
An _embedding_ is a vector that represents the features of the given text.

```javascript
const { ChromaClient, OpenAIEmbeddingFunction } = require('chromadb');

const client = new ChromaClient();
const embedder = new OpenAIEmbeddingFunction({ openai_api_key: 'sk-XYZ' });

const collection = await client.createCollection({
  name: "my_collection",
  embeddingFunction: embedder
});

const embeddings = await embedder.generate([
  'apple jumped 10% today',
  'i like apple pie'
]);
// An array of 1536 numbers: [-0.016792895, -0.015178694, 0.015230765]
console.log(embeddings[0]);
```

Topic Classification
--------------------

A simple way to handle topic classification is to insert an embedding for each topic with some sample text, and, for any given text, find the closest vector to that text.
For example, let's use "apple jumped 10% today" as a representative of the "Stocks" category, and "i like apple pie" as a representative of the "Food" category.
The following code generates embeddings for those two sentences, and inserts them into Chroma with the associated category as [metadata](https://docs.trychroma.com/usage-guide#adding-data-to-a-collection).

```javascript
const embeddings = await embedder.generate([
  'apple jumped 10% today',
  'i like apple pie'
]);

await collection.add({
  ids: ['id1', 'id2'],
  documents: ['apple jumped 10% today', 'i like apple pie'],
  embeddings: embeddings,
  metadatas: [{ category: 'Stocks' }, { category: 'Food' }]
});
```

Next, in order to classify text, you'll pass the text to [Chroma's `query()` function](https://docs.trychroma.com/usage-guide#querying-a-collection), which automatically generates the embedding for you using OpenAI.
The following code classifies 4 sentences that use the word "apple" in different contexts.

```javascript
const results = await collection.query({
  nResults: 1,
  queryTexts: [
    'is apple stock a good buy?',
    'i ate an apple flavored jolly rancher',
    'when is Apple\'s next earnings call?',
    'add 7 cups of thinly sliced apples'
  ]
});
// Correct classification: ['Stocks', 'Food', 'Stocks', 'Food']
console.log('Results', results.metadatas.map(res => res[0].category));
```

Pretty amazing: with only 2 vectors, this classifier can already correctly categorize 4 sentences that have no words in common with the original sentences other than "apple".

Moving On
---------

Vector databases are an amazing tool when combined with AI-generated embeddings.
The topic classification approach described in this blog post is simple, but surprisingly powerful.
We've been able to build a classifier that categorizes arbitrary text into the [IAB Content Taxonomy](https://www.iab.com/guidelines/content-taxonomy/) with 90%+ accuracy by iteratively putting vectors into [Pinecone](https://www.pinecone.io/), another vector database.
And text classification is just the tip of the iceberg, you can also create embeddings for [images](https://anttihavanko.medium.com/building-image-search-with-openai-clip-5a1deaa7a6e2) and [audio](https://github.com/harritaylor/torchvggish).
