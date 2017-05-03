The practice of asking brainteasers in interviews is a common punching bag
for pundits. Last summer, Hacker News blew up over the following exceptionally
insightful tweet on the topic.

<blockquote class="twitter-tweet" data-lang="en"><p lang="en" dir="ltr">Google: 90% of our engineers use the software you wrote (Homebrew), but you can’t invert a binary tree on a whiteboard so fuck off.</p>&mdash; Max Howell (@mxcl) <a href="https://twitter.com/mxcl/status/608682016205344768">June 10, 2015</a></blockquote>
<script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script>

First of all, don't get me wrong,
[I think homebrew is an awful piece of software that should never be used by anyone](https://www.youtube.com/watch?v=Dn57D8lNQWk#t=12m25s).
Homebrew is like herpes: you pay for your moment of instant
gratification with a lifetime of burning pain.

That being said, this tweet struck close to home for me because inverting a
binary tree is a small part of an interview question that I've asked hundreds
of interns, junior engineers, and even a former Goldman Sachs VP over the last
several years. I'm retiring this question from my pool of brainteasers, because
I've asked it far too many times already. However, I think it's a good example
of how asking a neat algorithms question can tell you a lot about what kind of
work somebody will produce.

How Do You Compute Whether a Binary Tree is Symmetric?
======================================================

Intuitively, it's easy to tell whether a binary tree is symmetric. Here's
a few small trees courtesy of the fine people at
[Wolfram MathWorld](http://mathworld.wolfram.com/). The trees at row 1 column 1,
row 2 column 3, row 4 column 5, row 5 column 1, and row 5 column 7 are
symmetric, the rest aren't.

<a href="http://mathworld.wolfram.com/images/eps-gif/BinaryTrees_800.gif">
  <img src="http://mathworld.wolfram.com/images/eps-gif/BinaryTrees_800.gif">
</a>

The task is to write a function, that, given a binary tree, returns true
if it is symmetric. I always leave the choice of language up to the interviewee,
because a good solution should be easy to understand in most languages.

```javascript
function isSymmetric(root) {
  // Check root.left, root.right, return true if symmetric
}
```

Here's the first reason why this question is so good: a skilled
programmer can map their intuition to code. You can tell
at a glance whether a binary tree is symmetric, but beginners will often
struggle with a question like this because they approach this
problem from a visual/intuitive angle rather than the logical angle.

The logical angle is "what does it mean for a tree to be symmetric?" In
other words, a novice programmer may attempt to map their visual process for
determining symmetry. The end result is a tangled mess of code. Most good
programmers will instead think about how to define symmetry using a simple
recurrence relationship. In other words, as Linus Torvalds once said:

"Bad programmers worry about the code. Good programmers worry about data structures and their relationships."

The definition typically involves two steps. The first step is to realize
that a tree is symmetric if its left and right subtrees are symmetric.
There's two definitions that most successful solutions end up with for what
it means for two trees to be symmetric:

* The purely recursive definition: two binary trees `t1` and `t2` are symmetric  iff `t1.left` and `t2.right`are symmetric, and `t1.right` and `t2.left` are symmetric.
* The two-step definition: two binary trees `t1` and `t2` are symmetric if
the reverse of `t2` is equal to `t1`.

The first definition leads to the most concise solution:

```javascript
function isSymmetric(root) {
  return isSymmetricHelper(root.left, root.right);
}

function isSymmetricHelper(t1, t2) {
  if (t1 === null && t2 === null) {
    return true;
  }
  if (t1 === null || t2 === null) {
    return false;
  }
  return isSymmetricHelper(t1.left, t2.right) &&
    isSymmetricHelper(t1.right, t2.left);
}
```

The second definition requires reversing a binary tree and then comparing
if two binary trees are equal. This is the solution that requires reversing
a binary tree on the whiteboard, and the one that most intern candidates end
up using to solve the problem in 20 minutes.

```javascript
function isSymmetric(root) {
  return isEqual(reverse(root.left), root.right);
}

function reverse(t) {
  if(t === null) return;
    return {
      left: reverse(t.right),
      right: reverse(t.left)
    };
  }
}

function isEqual(t1, t2) {
  if (t1 === null && t2 === null) {
    return true;
  }
  if (t1 === null || t2 === null) {
    return false;
  }
  return isEqual(t1.left, t2.left) && isEqual(t1.right, t2.right);
}
```

Why Is This Important?
======================

Trees are the single most important data structure in computer science.
Just about everything you do in your programming career will be related
to trees. For example, let's take a look at your average full stack
web developer. They store their data in a database,
[which is just a collection of B-trees](https://en.wikipedia.org/wiki/B-tree#Advantages_of_B-tree_usage_for_databases). They typically think of the data they work with as JSON objects,
Python dicts, or Ruby hashes, which are all trees. On the frontend, they
take their JSON objects and render them to the DOM, which is also a tree.
Maybe they even use React components, which are organized in a tree.

Can you be a good engineer without knowing anything about trees? An
appropriate analogy would be, can you be a good doctor without knowing
anything about what a heart is? Despite that the heart is
pivotal to how the human body works, in theory you could become a
leading knee surgeon without knowing anything about it.
In practice, I'm sure the [Dr. Peter Wehlings](http://www.mensjournal.com/magazine/the-body-that-heals-itself-20140217) of the world have forgotten more about the heart than I will ever learn
in my lifetime. After all, how do you come up with a medical procedure based
on transfusing an extract of the patient's blood into their knee to reduce
arthritis without knowing anything about the circulatory system?

Skill in software engineering, like skill in any subject, is not cultivated
by limiting yourself to a narrow set of knowledge and challenges. The kind
of engineer that I want to work with is someone who takes the initiative to
try out the unknown and take on new challenges, not someone who sits around
whining "nobody told me to!"
And just like odds are you aren't a leading knee surgeon if you don't know
what a heart is, you're probably not the kind of engineer I'd like on my team.
