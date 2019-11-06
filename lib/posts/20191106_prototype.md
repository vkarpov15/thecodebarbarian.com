JavaScript uses [prototype-based inheritance](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Objects/Object_prototypes), which is slightly different than inheritance in other languages. Suppose you create a new vanilla JavaScript object:

```javascript
const obj = new Object();

obj instanceof Object; // true
obj.constructor === Object; // true
```

The [`instanceof` operator](https://masteringjs.io/tutorials/fundamentals/instanceof) tells you whether a given object is an instance of a given [JavaScript class](https://masteringjs.io/tutorials/fundamentals/class). You can also use
`instanceof` with your own custom class:

```javascript
class MyClass {}

const obj = new MyClass();

obj instanceof MyClass; // true
obj instanceof Object; // true

obj.constructor === MyClass; // true
```

The `prototype` Property
------------------------

In JavaScript, every class has a [`prototype` property](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/prototype). A class' `prototype` is an _object_. For example,
`MyClass.prototype` is an object:

```javascript
MyClass.prototype; // MyClass {}
```

JavaScript has a built-in `Object.getPrototypeOf()` function that lets you get
the `prototype` of an object.

```javascript
const obj = new MyClass();

Object.getPrototypeOf(obj) === MyClass.prototype; // true
```

In JavaScript, checking if an object `obj` is an instance of a given class `C` (excluding inheritance) is equivalent to checking if `Obj.getPrototypeOf(obj) === C.prototype`.

Setting Prototype Properties
----------------------------

Prototypes are just JavaScript objects. When you access a property on an object,
like accessing `obj.foo`, JavaScript first looks to see if `obj` has a `foo`
property using [`hasOwnProperty()`](https://masteringjs.io/tutorials/fundamentals/hasownproperty). If it doesn't, JavaScript then checks the constructor's prototype
for a `foo` property. For example:

```javascript
const obj = new MyClass();

// If you set `foo` on `obj`'s constructor's prototype, that means you can
// access `obj.foo`.
MyClass.prototype.foo = 42;

obj.foo; // 42

// `foo` is an _inherited property_ as opposed to an _own property_.
obj.hasOwnProperty('foo');
```

The Prototype Chain
-------------------

So instances of `MyClass` point up to `MyClass.prototype`, and checking whether
an object is an instance of `MyClass` is defined as checking whether `Object.getPrototypeOf()` returns `MyClass.prototype`. Where does inheritance
come in?

The trick is that, since `MyClass.prototype` is an object, `Object.getPrototypeOf(MyClass)` points to the prototype of the base class `Object`.

```javascript
Object.getPrototypeOf(MyClass.prototype) === Object.protype; // true
```

If you use [the `extends` keyword for inheritance](/an-overview-of-es6-classes#inheritance), `Object.getPrototypeOf()` helps you
get the base class's prototype:

```javascript
class BaseClass {}
class SubClass extends BaseClass {}

Object.getPrototypeOf(SubClass.prototype) === BaseClass.prototype; // true
Object.getPrototypeOf(SubClass.prototype) === Object.prototype; // false

// Since `BaseClass` implicitly inherits from object:
Object.getPrototypeOf(BaseClass.prototype) === Object.prototype;
```

Surprisingly enough, a class's `prototype` has a `constructor` property that
points to the class itself. So to get the `BaseClass` constructor from `SubClass`,
you should get the prototype's `constructor`:

```javascript
Object.getPrototypeOf(SubClass.prototype).constructor === BaseClass; // true
```

Given any class, you can walk up the inheritance tree and end up at `Object.prototype`. The _prototype chain_ is the idea that you can follow
a list of prototypes to get every class in an inheritance hierarchy.

```javascript
class BaseClass {}
class SubClass extends BaseClass {}

let curPrototype = SubClass.prototype;

// Prints "SubClass", "BaseClass", "Object"
while (curPrototype != null) {
  console.log(curPrototype.constructor.name);
  curPrototype = Object.getPrototypeOf(curPrototype);
}
```

For example, you can implement your own `instanceof` operator by walking
up the prototype chain yourself. Given `v instanceof C`, The `instanceof` operator 
walks up `v`'s prototype chain to see if it can find `C.prototype`.

```javascript
function isInstanceOf(obj, Class) {
  const prototypeToFind = Class.prototype;

  let curPrototype = obj.constructor.prototype;
  while (curPrototype != null) {
    if (curPrototype === prototypeToFind) {
      return true;
    }
    curPrototype = Object.getPrototypeOf(curPrototype);
  }
  return false;
}
```

Moving On
---------

JavaScript prototypes can be confusing, but ES6 classes and
`Object.getPrototypeOf()` have done a great job in making prototype-based
inheritance more comprehensible. Iterating up the prototype chain is just
a simple `while()` loop with `Object.getPrototypeOf()`, and you can easily
access the actual class using `.constructor`.