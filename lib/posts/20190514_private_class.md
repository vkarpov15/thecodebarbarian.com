[Private class fields](https://github.com/tc39/proposal-class-fields#private-fields) are a [Stage 2 TC39 proposal](https://tc39.github.io/process-document/). Even though they're still experimental, you can use private class fields in Node.js 12 without flags or transpilers. In this article, I'll explain the basics of private class fields and how they interact with existing paradigms, like `Object.keys()` and [`assert.deepStrictEqual()`](https://nodejs.org/api/assert.html#assert_assert_deepstrictequal_actual_expected_message).

Your First Private Class Field
------------------------------

ES6 classes allow you to [declare fields](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes#Field_declarations) on the class. Fields are own properties on instances of the class, so [`hasOwnProperty()`](https://masteringjs.io/tutorials/fundamentals/hasownproperty) returns `true` for class fields.

```javascript
class MyClass {
  myField = 42;
}

const x = new MyClass();
x.myField; // 42
x.hasOwnProperty('myField'); // true

x.myField = 43;
x.myField; // 43
x.hasOwnProperty('myField'); // true
```

As specified as of 2019, [private fields are fields whose name starts with `#`](https://github.com/tc39/proposal-class-fields#private-fields). For example, the below class has a private field `#b`.

```javascript
class Foo {
  #b = 15;

  get() {
    return this.#b;
  }

  increment() {
    ++this.#b;
  }
}
```

Private fields are not visible outside of the class. Outside the class, `obj['#b']` is undefined and the `#b` field is not an own property.

```javascript
const obj = new Foo();

obj['#b']; // undefined
obj.hasOwnProperty('#b'); // false
```

JavaScript will throw an error if you attempt to access a private field outside of a class using `.`:

```javascript
// SyntaxError: Undefined private field #b: must be declared in an enclosing class
obj.#b;
```

Implications For Node.js
------------------------

Private class fields are invisible outside the class, and [there's no back door to access them](https://github.com/tc39/proposal-class-fields#no-backdoor-to-access-private). So functions like [`Object.keys()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys) and [`Object.getOwnPropertyDescriptors()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/getOwnPropertyDescriptors) don't see private class fields.

```javascript
const obj = new Foo();

Object.keys(obj); // []
Object.getOwnPropertyDescriptors(obj); // {}
```

Private fields are useful for encapsulating internal state. Functions like [`assert.deepStrictEqual()`](https://nodejs.org/api/assert.html#assert_assert_deepstrictequal_actual_expected_message) don't have access to private class fields, so you can now compare two objects while ignoring internal state.

```javascript
const obj1 = new Foo();
const obj2 = new Foo();

assert.deepStrictEqual(obj1, obj2);

obj1.increment();
obj1.get() === obj2.get(); // false

// Succeeds even though `#b` has a different value
assert.deepStrictEqual(obj1, obj2);
```

Moving On
---------

Private class fields are still a Stage 2 proposal, which means the spec may change and/or the spec might never be formally adopted. Don't build your entire production application on private class fields. But, now that they're included in Node.js 12 without any flags, try them out and see what you think!