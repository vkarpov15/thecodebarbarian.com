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

Getting Started with Astra and Mongoose
--------------------------------

Importing Mastering JS' Articles
-------------------------------