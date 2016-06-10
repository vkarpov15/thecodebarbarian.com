If you haven't heard the React Native hype train yet, you will: it's probably
the only thing that's noisier than [the Caltrain at 6am](http://www.paloaltoonline.com/news/2014/10/21/downtown-palo-alto-residents-seek-relief-from-train-noise). However, in my several months of React Native dev,
I've learned the painful lesson that React Native is still at least several
years away from being useful for anything but [the most trivial of apps](https://github.com/vkarpov15/openHIIT). My next stop: progressive web
apps, and if that doesn't work out, I'm going back to Cordova. Here's why.

Numerous npm Modules Don't Work
-------------------------------

The fact that you're writing plain-old JS is what drew me to React Native in
the first place. However, what drew me to JS in the first place was easy
code sharing and a rich ecosystem of high quality modules. Unfortunately,
React Native is a distinct JS environment with its own idiosyncracies.
This leaves you to fend for yourself in getting your favorite npm modules
to behave. Here's a list of a few npm modules that I've run into issues with:

* [analytics.js](https://github.com/segmentio/analytics.js-core/issues/21)
* [babel-plugin-transform-inline-environment-variables](https://github.com/facebook/react-native/pull/7878)
* [debug](https://github.com/visionmedia/debug/pull/282)
* [keen-js](https://github.com/keen/keen-js/issues/410)
* [turf](https://github.com/Turfjs/turf-buffer/pull/31)

These issues are mostly due to React Native's lack of a global `document`
environment, which causes a great deal of headache. I can't fault React Native
for that, it's a legitimate design decision because React Native doesn't run
in a browser. However, this design decision really hinders JavaScript's
power.

You Need To Know Native, React, and React Native
------------------------------------------------

One workaround I've seen for RN's quirks is
[just wrapping native Java libraries and exposing them in JS](https://github.com/tonyxiao/react-native-analytics/blob/master/android/src/main/java/com/smore/RNSegmentIOAnalytics/RNSegmentIOAnalyticsModule.java).
Unfortunately, in order to do things like this for cross-platform apps, you
need to have experience with Java and Android dev
(and/or iOS, if you're still into that sort of thing). To include native
extension like, say, a [wrapper around the Java version of analytics.js](https://github.com/tonyxiao/react-native-analytics), you need
to `npm install` a package and then make some changes to RN's Java code.
Naturally, the Java code changes you need to make have changed rapidly over
the course of RN's development, so while `react-native-analytics` instructions
are correct,
[other projects' are often out-of-date for long stretches of time](https://github.com/zmxv/react-native-sound/commit/7216ab7b8132629ccf3ba3ce896d76f22e1b8b11).

React Native Apps Run In Least 3 Different Environments
--------------------------------------------------------

So far, I've only run React Native apps 3 different ways:

* Via `react-native run-android` on an attached device
* Via `react-native run-android` on an attached device with remote debugging enabled
* Building the actual apk and installing it on my device

Each of these ways gives you a very different app, and it's quite common for
code to work as expected when using `react-native run-android` but fail
miserably when you actually ship the apk. My personal favorite is
[this issue](https://github.com/facebook/react-native/pull/7878). In this
case our app worked great with the first 2 ways, but we couldn't build the
apk because React Native clobbers your `NODE_ENV` environment variable only
when you're actually building the apk.

Moving On
---------

Long story short, before you decide to use React Native because it's hot,
take a second to think about how much extra work you're signing up for and
whether it's actually worth it. The idyllic image of RN producting real native apps with regular old JavaScript is no more real than the Tooth Fairy. You're going to have to wrestle with npm module quirks,
raw native dev, and unpredictable build systems. I'd love to see where React
Native is after another 3 years of development, but right now I'm planning on
avoiding React Native for any future apps.
