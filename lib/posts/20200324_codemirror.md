[CodeMirror](https://codemirror.net/) is a popular text editor library for
the browser. It has some neat features that make it easy to build online
code editors, like syntax highlighting, [gutters](https://codemirror.net/demo/marker.html),
and keyboard shortcuts. Here's how you can get started with CodeMirror.

Setup
-----

The easiest way to set up CodeMirror is via `<script>` tag from a CDN.
You can also bundle the [CodeMirror npm module](https://www.npmjs.com/package/codemirror),
but for the sake of example let's just use a CDN. Just make sure you include
both the JavaScript and CSS files, otherwise your editor won't look right.

```html
<link rel="stylesheet"
  href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.52.2/codemirror.min.css">
</link>

<script type="text/javascript"
  src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.52.2/codemirror.min.js">
</script>
```

Once you import CodeMirror via `<script>` tag, you get a `CodeMirror` global
that you can use to create a new CodeMirror instance. Just point it at a `<div>`
and CodeMirror does the rest.

```javascript
CodeMirror(document.querySelector('#my-div'), {
  lineNumbers: true,
  tabSize: 2,
  value: 'console.log("Hello, World");'
});
```

Below is what the above CodeMirror looks like when you run it. It's a live
example so please tinker with it. Note that CodeMirror automatically supports
shortcuts like "undo", so if you type and then hit `Ctrl + Z`, it will undo
your changes.

<link rel="stylesheet"
  href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.52.2/codemirror.min.css">

<script type="text/javascript"
  src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.52.2/codemirror.min.js">
</script>

<div id="my-div" style="border: 1px solid #ddd;"></div>

<script type="text/javascript">
  CodeMirror(document.querySelector('#my-div'), {
    lineNumbers: true,
    tabSize: 2,
    value: 'console.log("Hello, World");'
  });
</script>

Themes and Syntax Highlighting
------------------------------

The above CodeMirror works, but it is a little ugly. Let's add JavaScript
syntax highlighting so CodeMirror doesn't render the JavaScript code as plain text.
To enable JavaScript syntax highlighting, first you need to import the
JavaScript language mode, which is a separate file:

```html
<script type="text/javascript"
  src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.52.2/mode/javascript/javascript.min.js">
</script>
```

You also need to set the `mode` option to `'JavaScript'` in your constructor.

```javascript
CodeMirror(document.querySelector('#my-js'), {
  lineNumbers: true,
  tabSize: 2,
  value: 'console.log("Hello, World");',
  mode: 'javascript'
});
```

Below is a live example of a CodeMirror instance with JavaScript syntax highlighting:

<script type="text/javascript"
  src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.52.2/mode/javascript/javascript.min.js">
</script>
<div id="my-js" style="border: 1px solid #ddd;"></div>

<script type="text/javascript">
  CodeMirror(document.querySelector('#my-js'), {
    lineNumbers: true,
    tabSize: 2,
    value: 'console.log("Hello, World");',
    mode: 'javascript'
  });
</script>

Next, let's add a CodeMirror theme. Here's a [full list of built-in themes](https://codemirror.net/demo/theme.html)
for CodeMirror. For example, using the [Monokai](https://packagecontrol.io/packages/Theme%20-%20Monokai%20Pro)
theme you can make your CodeMirror look like Sublime Text.

To include the Monokai theme, you first need to pull in the Monokai CSS file:

```html
<link rel="stylesheet"
  href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.52.2/theme/monokai.min.css">
```

Next, just set the `theme` option to the CodeMirror constructor to the
theme name.

```javascript
CodeMirror(document.querySelector('#monokai'), {
  lineNumbers: true,
  tabSize: 2,
  value: 'console.log("Hello, World");',
  mode: 'javascript',
  theme: 'monokai'
});
```

Below is a live example of a Monokai CodeMirror.

<link rel="stylesheet"
  href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.52.2/theme/monokai.min.css">
<div id="monokai" style="border: 1px solid #ddd;"></div>

<script type="text/javascript">
  CodeMirror(document.querySelector('#monokai'), {
    lineNumbers: true,
    tabSize: 2,
    value: 'console.log("Hello, World");',
    mode: 'javascript',
    theme: 'monokai'
  });
</script>

Integrating with [Vue](https://masteringjs.io/vue)
--------------------

CodeMirror by itself is great, but for building an app you'll likely
want to integrate it with a framework like [Vue](https://vuejs.org/).
Here's the basic best practices:

1. Put the `<div>` you will attach your CodeMirror to in your [Vue template](https://masteringjs.io/tutorials/vue/templates).
2. Create the CodeMirror instance in the [`mounted` lifecycle hook](https://masteringjs.io/tutorials/vue/lifecycle#mounted).
3. Use [`$refs`](https://masteringjs.io/tutorials/vue/refs) to get a reference to the `<div>` in the component's template.
4. Listen for changes to your CodeMirror instance by listening to CodeMirror's `'changes'` event.
5. If necessary, modify the CodeMirror's contents by [calling `setValue()`](https://stackoverflow.com/questions/8378971/how-to-set-a-value-of-codemirror-editor-by-javascript).

Here's an example Vue component that creates a CodeMirror and tracks changes.

```javascript
const app = new Vue({
  data: () => ({
    value: 'console.log("Hello, World");'
  }),
  mounted: function() {
    this._editor = new CodeMirror(this.$refs.codemirror, {
      lineNumbers: true,
      tabSize: 2,
      value: this.value,
      mode: 'javascript',
      theme: 'monokai'
    });

    this._editor.on('changes', () => {
      this.value = this._editor.getValue();
    });
  },
  template: `
    <div>
      <div ref="codemirror"></div>
      <div>Number of Characters: {{value.length}}</div>
    </div>
  `
});

app.$mount('#my-vue-app');
```

Here's how this Vue app looks live:

<script src="https://unpkg.com/vue/dist/vue.js"></script>
<div id="my-vue-app" style="border: 1px solid #ddd"></div>

<script type="text/javascript">
  const app = new Vue({
    data: () => ({
      value: 'console.log("Hello, World");'
    }),
    mounted: function() {
      this._editor = new CodeMirror(this.$refs.codemirror, {
        lineNumbers: true,
        tabSize: 2,
        value: this.value,
        mode: 'javascript',
        theme: 'monokai'
      });

      this._editor.on('changes', () => {
        this.value = this._editor.getValue();
      });
    },
    template: `
      <div>
        <div ref="codemirror"></div>
        <div>Number of Characters: {{value.length}}</div>
      </div>
    `
  });

  app.$mount('#my-vue-app');
</script>


Gutters and Linter Integration
------------------------------

"Gutters" are markers that appear on individual line numbers.
[Gutters are often used to display breakpoints](https://codemirror.net/demo/marker.html),
but they can also be used to display linter errors. Since ESLint
doesn't work in the browser, let's use [JSHint](https://jshint.com/install/)
to display linter errors.

First, load JSHint via `<script>` tag:

```html
<script type="text/javascript"
  src="https://cdnjs.cloudflare.com/ajax/libs/jshint/2.11.0/jshint.js">
</script>
```

Next, add some CSS to make error messages show up as red rectangles
next to the line number:

```css
.error-marker {
  color: black;
  width: 10px !important;
  background-color: #ff0000;
}

.error-marker .error-message {
  display: none;
  position: absolute;
  background-color: #ddd;
  border: 1px solid #999;
  padding: 6px;
  width: 140px;
  left: 15px;
  top: -1em;
}

.error-marker:hover .error-message {
  display: block;
}
```

Finally, here's the Vue app that runs JSHint with default settings every
time the CodeMirror input changes.

```javascript
const linter = new Vue({
  data: () => ({
    value: 'console.log("Hello, World")'
  }),
  mounted: function() {
    this._editor = new CodeMirror(this.$refs.codemirror, {
      lineNumbers: true,
      tabSize: 2,
      value: this.value,
      mode: 'javascript',
      theme: 'monokai',
      gutters: ['error']
    });

    this._editor.on('changes', () => {
      this.value = this._editor.getValue();

      JSHINT(this.value);
      const errors = Array.isArray(JSHINT.errors) ? JSHINT.errors : [];
      this._editor.clearGutter('error');
      for (const error of errors) {
        this._editor.setGutterMarker(error.line - 1, 'error', makeMarker(error.reason));
      }
    });
  },
  template: `
    <div>
      <div ref="codemirror"></div>
    </div>
  `
});

// Create an HTML element that CodeMirror is responsible for positioning
// properly.
function makeMarker(msg) {
  const marker = document.createElement('div');
  marker.classList.add('error-marker');
  marker.innerHTML = '&nbsp;';

  const error = document.createElement('div');
  error.innerHTML = msg;
  error.classList.add('error-message');
  marker.appendChild(error);

  return marker;
}

linter.$mount('#my-linter');
```

Below is a live demo of the CodeMirror instance. Note the red error
near line 1 because of the missing semicolon.

<script type="text/javascript"
  src="https://cdnjs.cloudflare.com/ajax/libs/jshint/2.11.0/jshint.js">
</script>
<div id="my-linter" style="border: 1px solid #ddd"></div>

<style>
.error-marker {
  width: 10px !important;
  background-color: #ff0000;
  color: black;
}

.error-marker .error-message {
  display: none;
  position: absolute;
  background-color: #ddd;
  border: 1px solid #999;
  padding: 6px;
  width: 140px;
  left: 15px;
  top: -1em;
}

.error-marker:hover .error-message {
  display: block;
}
</style>

<script type="text/javascript">
  const linter = new Vue({
    data: () => ({
      value: 'console.log("Hello, World")'
    }),
    mounted: function() {
      this._editor = new CodeMirror(this.$refs.codemirror, {
        lineNumbers: true,
        tabSize: 2,
        value: this.value,
        mode: 'javascript',
        theme: 'monokai',
        gutters: ['error']
      });

      JSHINT(this.value);
      const errors = Array.isArray(JSHINT.errors) ? JSHINT.errors : [];
      this._editor.clearGutter('error');
      for (const error of errors) {
        this._editor.setGutterMarker(error.line - 1, 'error', makeMarker(error.reason));
      }

      this._editor.on('changes', () => {
        this.value = this._editor.getValue();

        JSHINT(this.value);
        const errors = Array.isArray(JSHINT.errors) ? JSHINT.errors : [];
        this._editor.clearGutter('error');
        for (const error of errors) {
          this._editor.setGutterMarker(error.line - 1, 'error', makeMarker(error.reason));
        }
      });
    },
    template: `
      <div>
        <div ref="codemirror"></div>
      </div>
    `
  });

  function makeMarker(msg) {
    var marker = document.createElement('div');
    marker.classList.add('error-marker');
    marker.innerHTML = '&nbsp;';

    var error = document.createElement('div');
    error.innerHTML = msg;
    error.classList.add('error-message');
    marker.appendChild(error);

    return marker;
  }

  linter.$mount('#my-linter');
</script>

Moving On
---------

CodeMirror is an amazing tool for building minimal editors in your browser.
CodeMirror gives you a lot out of the box: themes, syntax highlighting, and
basic keyboard shortcuts like "undo". You can also build more advanced
functionality using customizable features like gutters.