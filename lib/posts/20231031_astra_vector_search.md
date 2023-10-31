[Retrieval augmented generation](https://www.promptingguide.ai/techniques/rag), or RAG for short, is a technique that injects additional relevant context into an LLM prompt in order to get better results.
For example, if you were to ask [ChatGPT](https://chat.openai.com/) to write a tweet about a new blog post describing how to work with [vector databases in Node.js](./getting-started-with-vector-databases-in-node-js.html), you might get the following output.

```
🚀 Exciting News for Node.js Developers! 🚀

Just dropped a 🔥NEW BLOG POST🔥 on mastering Vector Databases in Node.js. 📊

Learn how to supercharge your data-driven apps with speed and efficiency. Don't miss it! 🚀

Read the full post here: [Insert Blog Post Link] #NodeJS #VectorDatabases #WebDevelopment #DataDrivenApps 💻🔍
```

This tweet is reasonable, but a bit generic.
How about if we add an example of [a relevant tweet](https://twitter.com/DataStax/status/1717654884139303026) and ask ChatGPT to copy the tone and style using the following prompt?

```
Write a tweet promoting a new blog post about working with vector databases in Node.js

Write using the style and tone of the following tweet:

Ready to venture into the world of Generative AI?
Learn the ins and outs of infrastructure and select the right LLM for your project with this how-to guide.
```

Here's the result:

```
Ready to dive into the world of vector databases in Node.js?
Discover the secrets to optimizing your data handling and supercharging your apps!
Check out our latest blog post for the ultimate how-to guide.
```

The idea of RAG is to use a [vector database](./getting-started-with-vector-databases-in-node-js.html) to find relevant examples to the user's prompt, to help guide the LLM to a better result.
In this blog post, I'll show how to use [Astra's vector search](https://docs.datastax.com/en/astra-serverless/docs/vector-search/overview.html) with [Mongoose](https://mongoosejs.com/) to build a RAG chatbot that answers JavaScript programming questions using [Mastering JS' articles](https://masteringjs.io/) for context.

You can see the [full source code for the Mastering JS chatbot here](https://github.com/mastering-js/masteringjs-backend/blob/e760d30d32eb022ad47aafd7ffcc6ee16af9ae76/chatbot.js).
You can also access a [live version of the Mastering JS chatbot here](https://deploy-preview-335--masteringjs.netlify.app/tutorials/mocha/aftereach?show-chatbot=true), just be aware that this chatbot is limited to 100 queries per hour to prevent abuse.

Getting Started with Astra and Mongoose
--------------------------------

Astra's new vector search capabilities are integrated into Astra's JSON API, which means [you can use Mongoose queries to do vector search in Astra](./introducing-private-preview-for-stargate-mongoose-astra.html).
To get started, install Mongoose and [stargate-mongoose](https://www.npmjs.com/package/stargate-mongoose).

```
npm install mongoose stargate-mongoose
```

Next, deploy a new vector database on [Astra](https://astra.datastax.com/).

<img src="https://i.imgur.com/3bkaFFt.png" style="width: 50%; border: 1px solid #ddd">

Click into your new Astra vector database, click "Connect", and find "Connect with the JSON API".
You should see the following instructions:

<img src="https://i.imgur.com/wN8GJkl.png" style="border: 1px solid #ddd">

Click "Generate Configuration" to get credentials for your Astra vector database.
You will get a `ASTRA_DB_ID`, `ASTRA_DB_REGION`, `ASTRA_DB_KEYSPACE`, and `ASTRA_DB_APPLICATION_TOKEN`.
Copy these values into my [Astra connection string generation tool](./introducing-private-preview-for-stargate-mongoose-astra.html#connecting-mongoose-to-astra) to get your Astra connection string.
It should look like the following:

```
https://3418a8ac-OMITTED-us-east-2.apps.astra.datastax.com/api/json/v1/test?applicationToken=AstraCS:OMITTED
```

With an Astra connection string, you're now ready to connect to Astra and start querying documents.
Import Mongoose and stargate-mongoose as follows:

```javascript
const mongoose = require('mongoose');

mongoose.set('autoCreate', false);
mongoose.set('autoIndex', false);

const { driver } = require('stargate-mongoose');
mongoose.setDriver(driver); // <-- Use stargate-mongoose driver
```

Then, connect to Astra using `mongoose.connect()`, and create a new collection `tests` that has vector search enabled as follows.

```javascript
await mongoose.connect(process.env.ASTRA_URI, { isAstra: true });

// Clean up any existing collection that may conflict
await mongoose.connection.dropCollection('tests');
// Create a new collection with vector search enabled
await mongoose.connection.createCollection('tests', {
  vector: {
    function: 'cosine',
    size: 2
  }
});
```

Create a new [Mongoose model](https://mongoosejs.com/docs/models.html) with a `$vector` property.
The `$vector` property is an array of numbers that Astra uses to store the document's vector for vector search.

```javascript
const schema = new mongoose.Schema({
  $vector: [Number],
  name: String
});
const TestModel = mongoose.model('Test', schema, 'tests');
await TestModel.create({ name: 'Test 1', $vector: [0, 1] });
await TestModel.create({ name: 'Test 2', $vector: [0, -1] });
```

With JSON API, vector search is represented as a [Mongoose query](https://mongoosejs.com/docs/queries.html) with a special `sort()` parameter on `$vector`.
The sort parameter to `$vector` tells Astra which vector to find documents closest to.
The following example shows how to query for which documents are closest to the vector `[0.1, -0.9]` followed by the documents closest to `[0.1, 0.9]`:

```javascript
let docs = await TestModel.find()
  .sort({ $vector: { $meta: [0.1, -0.9] } });
// "Test 2", "Test 1"
console.log(docs.map(doc => doc.name));

docs = await TestModel.find()
  .sort({ $vector: { $meta: [0.1, 0.9] } });
// "Test 1", "Test 2"
console.log(docs.map(doc => doc.name));
```

Importing Mastering JS' Articles
-------------------------------

Retrieval augmented generation generally works best when you have a large data set of content that is relevant to the sort of questions your app expects.
For example, for JavaScript programming questions, [Mastering JS](https://masteringjs.io/) has an easily scrapable collection of approximately 500 articles on common JavaScript programming tasks.
To import Mastering JS' articles, you can add Mastering JS as a `devDependency` in your `package.json`, along with a couple other utility packages:

```
"devDependencies": {
  "masteringjs.io": "https://github.com/mastering-js/masteringjs.io",
  "moment": "2.29.4",
  "nlcst-to-string": "2.x",
  "remark": "13.x"
},
```

[Mastering JS' articles are stored in an array in the masteringjs.io GitHub repo's `src/tutorials.js` file](https://github.com/mastering-js/masteringjs.io/blob/013a3eb65e97bd4cf3e19f301e1f57d77b428872/src/tutorials.js).
The idea is to pull all the tutorials, split them up into ["chunks"](https://vectara.com/grounded-generation-done-right-chunking/#h-what-is-chunking) by headers, and generate an embedding (vector) for each chunk using ChatGPT, assuming that your OpenAI key is stored in the `OPEN_AI_KEY` environment variable:

```javascript
function createEmbedding(input) {
  return axios({
    method: 'POST',
    url: 'https://api.openai.com/v1/embeddings',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPEN_AI_KEY}`
    },
    data: {
      model: 'text-embedding-ada-002',
      input
    }
  }).then(res => res.data.data[0].embedding);
}
```

Once the app has an embedding for a given chunk, it will store the chunk in the `Article` model:

```javascript
const mongoose = require('../mongoose');

const articleSchema = new mongoose.Schema({
  $vector: [Number],
  title: String,
  content: String,
  url: String
});

module.exports = mongoose.model('Article', articleSchema, 'articles');
```

[Here's the script that chunks Mastering JS' articles and imports them into Astra](https://github.com/mastering-js/masteringjs-backend/blob/main/scripts/importArticles.js).
The script first drops and recreates the `articles` collection to clear out any existing data:

```javascript
const Article = require('../src/db/article');

await mongoose.connect(process.env.ASTRA_URI, { isAstra: true });

await Article.db.dropCollection('articles');
await Article.createCollection({
  vector: { size: 1536, function: 'cosine' } 
});
```

Next, the script reads all the articles, and splits them by any header tags (`h1`, `h2`, `h3`, etc.).

```javascript
const articles = require('masteringjs.io/src/tutorials');

let i = 0;
for (const { title, raw, url, tags } of articles) {
  // Skip a few irrelevant articles
  if (tags.includes('temporal') || tags.includes('tools')) {
    continue;
  }
  console.log('Importing', title);
  // Read the raw markdown
  const content = fs.readFileSync(`${__dirname}/../node_modules/masteringjs.io${raw.replace(/^\./, '')}`, 'utf8');
  
  // Split the raw markdown by headers
  const ast = remark.parse(content);
  const sections = [{ heading: null, nodes: [] }];
  let currentSection = 0;
  ast.children.forEach(node => {
    if (node.type === 'heading') {
      ++currentSection;
      // nlcstToString converts a Markdown AST into its string representation.
      console.log(nlcstToString(node));
      sections[currentSection] = {
        heading: nlcstToString(node),
        nodes: []
      };
    } 
    sections[currentSection].nodes.push(node);
  });
}
```

Finally, the script stores each section in the database as an `Article` document:

```javascript
console.log(`Importing ${sections.length} sections`);
for (const section of sections) {
  const content = remark.stringify({
    type: 'root',
    children: section.nodes
  });

  const embedding = await createEmbedding(content);
  // Combine the article title and header text to get the section title
  const contentTitle = section.heading ? `${title}: ${section.heading}` : title;
  // Make the section URL a link to the header
  const contentUrl = section.heading ? `${url}#${toKebabCase(section.heading)}` : url;

  await Article.create({
    title: contentTitle,
    url: contentUrl,
    content,
    $vector: embedding
  });
}
```

Retrieval Augmented Generation
------------------------------

The script from the previous section imports approximately 1200 sections of content related to JavaScript programming.
Given the `Article` model, here's an Express API endpoint that uses RAG to answer the given `question` using the 3 most relevant articles as context.

```javascript
const Article = require('./src/db/article');
const { Configuration, OpenAIApi } = require('openai');
const assert = require('assert');
const axios = require('axios');

const apiKey = process.env.OPEN_AI_KEY;
assert.ok(apiKey, 'No OPEN_AI_KEY specified');

const configuration = new Configuration({
  apiKey
});
const openai = new OpenAIApi(configuration);

module.exports = async function chatbot(req, res) {
  const { question } = req.body;
  const embedding = await createEmbedding(question);

  // Find the 3 articles most relevant to the user's question
  let articles = await Article
    .find()
    .sort({ $vector: { $meta: embedding } })
    .limit(3);
  
  // Create a prompt based on the user's question and the content of the
  // 3 most relevant articles
  const prompt = `
  Answer this question with this context:
  
  Question: ${question}
  
  Context: ${articles[0].content}
  
  Context: ${articles[1].content}
  
  Context: ${articles[2].content}`;
  const response = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0,
    max_tokens: 2000
  });

  res.json({
    content: response.data.choices[0].message.content,
    link: articles[0].url,
    title: articles[0].title,
    sources: articles.map(article => ({
      link: article.url,
      title: article.title
    }))
  });
}
```

With Astra, vector search is represented as a Mongoose `find()` query with a special `sort()` parameter.
So you can use [`limit()`](https://mongoosejs.com/docs/api/query.html#Query.prototype.limit()) to limit the number of documents in the result as shown in the above example.
You also get all the benefits of Mongoose queries, including [filtering using a subset of MongoDB query operators](https://github.com/stargate/stargate-mongoose#filter-clause), [automated query casting](https://mongoosejs.com/docs/tutorials/query_casting.html), [middleware](https://mongoosejs.com/docs/middleware.html), and [`populate()`](https://mongoosejs.com/docs/populate.html).


Moving On
---------

Retrieval augmented generation (RAG) is a powerful tool for improving LLM output.
RAG means you can highlight the most relevant examples to the user's prompt, and even provide context from private sources, like internal knowledge bases or even [your app's source code](https://cursor.sh/).
The combination of Astra and Mongoose means you can leverage Mongoose's API in RAG applications, including filtering using query operators and using `populate()` to load related data.


The combination of Astra and Mongoose has a uniquely excellent developer experience for vector search.
I'm currently in the process of moving my production vector search apps over to Astra and Mongoose from Pinecone.
So whether you're just learning about vector search or already making use of vector search in production, you should try Mongoose with Astra.