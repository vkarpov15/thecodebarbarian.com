'use strict';

const assert = require('assert');
const superagent = require('superagent');

describe('fastify', function() {
  it('basic example', async function() {
    const app = require('fastify')();

    app.get('*', async function(request, reply) {
      await new Promise(resolve => setTimeout(resolve, 100));
      reply.send('Hello, World!');
    });

    await app.listen(3000);
    // acquit:ignore:start
    const reply = await superagent.
      get('http://localhost:3000/').
      then(res => res.text);
    assert.equal(reply, 'Hello, World!');
    await app.close();
    // acquit:ignore:end
  });

  it('basic error', async function() {
    const app = require('fastify')();

    app.get('*', async function(request, reply) {
      await new Promise(resolve => setTimeout(resolve, 100));
      throw new Error('Oops!');
    });

    await app.listen(3000);
    // acquit:ignore:start
    let threw = false;
    // acquit:ignore:end
    try {
      await superagent.get('http://localhost:3000/');
    } catch (error) {
      // Fastify reports the async error. Express would hang forever.
      assert.equal(error.response.body.message, 'Oops!');
      // acquit:ignore:start
      threw = true;
      // acquit:ignore:end
    }
    // acquit:ignore:start
    assert.ok(threw);
    await app.close();
    // acquit:ignore:end
  });

  it('error after reply', async function() {
    const app = require('fastify')();

    app.get('*', async function(request, reply) {
      await new Promise(resolve => setTimeout(resolve, 100));
      reply.send('Hello, World!');
      // This error won't get reported, the HTTP response will be "Hello, World!"
      throw new Error('Oops!');
    });

    await app.listen(3000);
    // acquit:ignore:start
    const reply = await superagent.
      get('http://localhost:3000/').
      then(res => res.text);
    assert.equal(reply, 'Hello, World!');
    await app.close();
    // acquit:ignore:end
  });

  it('return', async function() {
    const app = require('fastify')();

    app.get('*', async function(request, reply) {
      await new Promise(resolve => setTimeout(resolve, 100));
      const response = { text: 'Hello, World!' };
      // Equivalent to `reply.send(JSON.stringify(response))`
      return response;
    });

    await app.listen(3000);
    // acquit:ignore:start
    const reply = await superagent.
      get('http://localhost:3000/').
      then(res => res.body);
    assert.deepEqual(reply, { text: 'Hello, World!' });
    await app.close();
    // acquit:ignore:end
  });
});
