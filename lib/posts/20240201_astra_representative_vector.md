With vector databases, [retrieval augmented generation](https://thecodebarbarian.com/rag-vector-search-with-astra-and-mongoose.html) is the most talked about use case, but far from the only one.
Vector databases can also be helpful with a wide variety of machine learning tasks.
For example, in this blog post, I'll show how you can use Astra vector search for text classification: categorizing arbitrary text into one of a pre-selected list of categories.

Consider [this text classification dataset](https://www.kaggle.com/datasets/kashnitsky/hierarchical-text-classification/), which categorizes 40,000 Amazon reviews into 6 categories: health personal care, toys games, beauty, pet supplies, baby products, and grocery gourmet food.
A good text classifier would be able to take the following string, and output that the following string belongs to the category "toys games".

```
I think that this game is fun for yet educational because you will learn where all the different countries are while having fun with your friends!
```

One approach for text classification I've used is by inserting a set of representative vectors into a vector database, and classifying any incoming sentence by finding the closest representative vector.
There are many other, more sophisticated approaches for text classification; however, the representative vector approach works surprisingly well and is easy to tune to your needs.

Loading the Dataset into Astra
-----------------------

First, download [this text classification dataset](https://www.kaggle.com/datasets/kashnitsky/hierarchical-text-classification/) from Kaggle, and extract the `train_40k.csv` file.
Below is how you can read this CSV in Node.js.

```
npm install neat-csv@6
```

```javascript
const fs = require('fs');
const neatCSV = require('neat-csv');

run().catch(err => console.log(err));

async function run() {
  // https://www.kaggle.com/datasets/kashnitsky/hierarchical-text-classification/
  const rows = await neatCSV(fs.readFileSync('./train_40k.csv', 'utf8'));
}
```

The representative vector approach involves loading a certain number of representative vectors per category into a vector database.
In this blog post, I'll use [Astra](https://astra.datastax.com/) as the vector database, with [stargate-mongoose](https://www.npmjs.com/package/stargate-mongoose) as the Node.js client for Astra.
Below is how you can connect to Astra using Mongoose and stargate-mongoose.

```javascript
const axios = require('axios');
const fs = require('fs');
const mongoose = require('mongoose');
const neatCSV = require('neat-csv');

mongoose.set('autoCreate', false);
mongoose.set('autoIndex', false);

const { driver } = require('stargate-mongoose');
mongoose.setDriver(driver); // <-- Use stargate-mongoose driver

run().catch(err => console.log(err));

async function run() {
  await mongoose.connect(process.env.ASTRA_URI, { isAstra: true });

  // Create a review model
  const Review = mongoose.model('Review', mongoose.Schema({
    text: { type: String, required: true },
    category: { type: String, required: true },
    $vector: [Number]
  }));

  // Drop and then create the underlying reviews collection configured for vector search
  await Review.db.dropCollection('reviews');
  await Review.createCollection({
    vector: { dimension: 1536, metric: 'cosine' } 
  }); 
}
```

Classifying a new piece of text means you calculate the text's embedding, and then find the closest representative vector, and return that vector's category.
The below code inserts the first 25 vectors in each category into Astra, using [OpenAI's `embeddings` endpoint](https://platform.openai.com/docs/guides/embeddings) and `text-embedding-ada-002` model.

```javascript
// First, group all rows by the category `Cat1`
const rowsByCategory = new Map();
for (const row of rows) {
  if (!rowsByCategory.has(row['Cat1'])) {
    rowsByCategory.set(row['Cat1'], []);
  }

  rowsByCategory.get(row['Cat1']).push(row);
}

// Next, take the first 25 rows from each category and insert them into Astra
const reviewsPerCategory = 25;
for (const category of rowsByCategory.keys()) {
  const rows = rowsByCategory.get(category);
  for (let i = 0; i < reviewsPerCategory; ++i) {
    // Get the embedding and insert the embedding into Astra
    // The `$vector` property is a special property in Astra that stores the embedding for vector search
    const $vector = await createEmbedding(rows[i]['Text']);
    await Review.create({ text: rows[i]['Text'], category: rows[i]['Cat1'], $vector });
  }
}
```

Evaluating the Classifier
----------------------

Now that you've loaded the data into Astra, classifying text can be as simple as calculating the embedding for the text and finding the closest representative vector to the new text's embedding.

```javascript
const embedding = await createEmbedding(rows[i]['Text']);

const review = await Review.findOne().sort({ $vector: { $meta: embedding } });
review.category; // The category for the closest representative vector to the new text's embedding
```

While this approach is simple, it gets fairly good results.
For example, let's use the following code to evaluate how this text classifier works on the next 10 reviews in each category.

```javascript
let correct = 0;
let total = 0;
// Classify the next 10 reviews in each category, and track how well this classifier works
for (const category of rowsByCategory.keys()) {
  const rows = rowsByCategory.get(category);
  for (let i = reviewsPerCategory; i < reviewsPerCategory + 10; ++i) {
    const embedding = await createEmbedding(rows[i]['Text']);
    const review = await Review.findOne().sort({ $vector: { $meta: embedding } });
    console.log('Expected:', category, 'got:', review.category);
    ++total;
    if (category === review.category) {
      ++correct;
    }
  }
}

// 35/60 with reviewsPerCategory = 5
// 41/60 with reviewsPerCategory = 10
// 52/60 with reviewsPerCategory = 25
console.log('Correct:', correct, '/', total);
```

This classifier does better with more representative vectors: the larger `reviewsPerCategory` is, the better the classifier does.
The fact that you can easily add more vectors to improve the classifier's accuracy is a huge benefit.
Below is a chart showing the classifier's accuracy with increasing `reviewsPerCategory`, which shows the classifier's accuracy asymptotically approaching 1 as `reviewsPerCategory` grows.

![image](https://gist.github.com/assets/1620265/8545d650-2de8-4419-ba26-016a92822a7b)

Why Use Vector Search for Classifiers?
-----------------------------------

ChatGPT and other LLMs are often used for similar classification tasks.
For example, instead of importing sample data as shown in this blog post, you might just make a request to the ChatGPT API with the following prompt:

```
Task: You are a non-conversational classifier function whose sole capability is to parse user input strings to determine which of the following categories the user provided text falls into: health personal care, toys games, beauty, pet supplies, baby products, or grocery gourmet food.

User provided text: I think that this game is fun for yet educational because you will learn where all the different countries are while having fun with your friends!
```

ChatGPT can do a fairly good job at classifying input, even without sample data.
For example, ChatGPT correctly classifies the first review in the data set with no additional training data.

<img src="https://i.imgur.com/ZMcSXSg_d.webp?maxwidth=760&fidelity=grand">

So why would you use vector search rather than using ChatGPT? Here's a few reasons.

1. Cost. At the time of this writing, [gpt-3.5-turbo costs 10-100x as much per API request as OpenAI's embedding models](https://openai.com/pricing).
2. Consistent output. It is tricky to get a general purpose LLM to consistently answer in the exact right format. For example, in the previous screenshot, notice that ChatGPT prefaced the output with "Category: " and uppercased "Toys Games". While this output is good enough for end users, the inconsistent output may cause problems if you are using the classifier result elsewhere in your code.
3. Easy to improve. If you want to improve the accuracy of your LLM based classifier, your options are to tweak your prompt or fine tune a model. Tweaking a prompt requires careful testing because small changes can cause surprising results, and [fine tuning a model on OpenAI can take minutes to hours](https://platform.openai.com/docs/guides/fine-tuning/create-a-fine-tuned-model). But improving a representative vector classifier is as simple as inserting a new vector.

Moving On
---------

Vector databases are useful for much more than retrieval augmented generation.
Retrieval augmented generation uses vector search to find text related to the input text and plugging the related text into an LLM, but, in this representative classification case, the classifier doesn't look at the related text.
Rather, the representative classification code presented in this blog post uses vector search to find metadata associated with the related text, in this case the pre-labeled classification, rather than the review text.
Using this representative classification approach, you can build a data set to help classify any text into any set of categories you want.
So sign up for a [free Astra account](https://astra.datastax.com/signup) and start learning vector databases today!