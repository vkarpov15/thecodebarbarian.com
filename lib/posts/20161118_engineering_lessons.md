On a sunny Wednesday in September 2006, I showed up for my first day of an
internship with [Intronis Technologies](http://www.intronis.com/), then a 3-person
online backup company based out of Englewood, New Jersey. It's fun to look back
on the days when working at a startup meant I was writing Visual Studio plugins in
C# and hacking at Windows context menus. The software industry's been great to
me since then: I've written 2 books, traveled to exotic locales, started numerous
companies with varying degrees of success, and, most importantly, gotten to
spend the better part of my career thus far working on cool projects with good
friends. Here's some lessons I learned along the way that I try hard to embody
to this day.

1. Dress professionally
-----------------------

I showed up to my first day at Intronis in athletic shorts and a t-shirt. Not
surprising for a 17 year old varsity basketball player, but the lead engineer
pulled me aside and told me to show up in slacks next time. Since then, I wear
slacks and a shirt to the office every day. I don't have to, but in my mind
reaching for slacks and a shirt rather than sweatpants and a ratty X-Men shirt
is like [making your bed in the morning](http://lifehacker.com/why-making-your-bed-every-morning-matters-according-to-1583954961): it puts you in the right mindset to get the job done. The guy
who starts his morning by skipping shaving, eating a pop-tart, and putting on
a pair of sweats is telling himself that it's ok to cut corners for the sake
of laziness and convenience. Don't be that guy.

2. Work with people you like, because you'll be really mad at them sometimes
----------------------------------------------------------------------------

After my time at Intronis, I left for college and ended up helping start
[SCVNGR](https://en.wikipedia.org/wiki/SCVNGR) (now known as [LevelUp](https://www.thelevelup.com/)). SCVNGR was my first real startup,
my first real startup incubator, my first experience pitching VC's. Needless
to say, I was one stressed out 19 year old after [Josh Kopelman](http://firstround.com/person/josh-kopelman/#mystory) spent our meeting ranting how our business model was garbage (after showing up 15 minutes late wearing sweatpants and flip-flops, see point 1).

Starting a company was hard, there were more than a few times where I wanted to
just quit and take the first train back to New Jersey. I still remember one time
one of my coworkers and I were so mad at each other we spent the better part of the
afternoon throwing markers at each other across the office. Thankfully, SCVNGR's
early team was mostly people I was close with long before we sent our first test
SMS. It would have been a lot easier to drop everything and leave if I didn't
actually like the people I worked with. Startups where the team has a real bond
are the ones that push through hardship, startups where the team is only there
for the money or the cool factor are the ones that fold at the first sign of
trouble.

3. The best way to learn to code is to try to build something
-------------------------------------------------------------

Aspiring novelists are often told to throw out their first 1-3 novels, because
more often than not your first novel will suck. This is doubly true for
software engineers. I left SCVNGR to go back to school, but also because I was
definitely not ready to be the CTO for the next stage of the company's growth.
After leaving SCVNGR, I made it a point to write more software. From [implementing obscure data structures](http://www.cs.princeton.edu/courses/archive/spr11/cos423/Lectures/RankPairingHeaps.pdf) to building [gimmicky dating apps](http://dailyprincetonian.com/news/2011/02/goodcrush-back-for-valentines-day-with-rival/), I'd build whatever interesting project I could find.

When people
ask me what the best way to learn to code is, I always tell them to try building something. Sure it'll be difficult and confusing, and you'll sometimes be embarrassed by the mistakes you make, but that's how everybody feels when writing software. Even if there was a perfect path to take somebody from a beginner to being a junior level engineer with no struggle, it wouldn't work, because being an
engineer is about having the mental fortitude to grapple with a challenge and win.

4. Testing is like broccoli
---------------------------

You might not like writing tests, but you need to if you want your code base to
grow up big and strong. Testing is hard, you need to really wrap your mind around
what it means for your code to be correct, which is why most beginners struggle
with it. On the other hand, most beginners also struggle with squatting 300 pounds, but the struggle yields great rewards.

When I was at Google, I interned under
[AngularJS author Misko Hevery](https://twitter.com/mhevery?lang=en). The best
thing that Misko did for me was that he didn't pull any punches. He held me up
to the standard of a real Google engineer, and that meant writing tests. My
project wasn't considered done until I hit 100% test coverage. That was a
high bar, but my skills and project were better off for getting it done.

5. Don't spend 6 months working on an MVP
-----------------------------------------

In general, any project or initiative which takes more than a week to build into a usable prototype will suck. Like how [Werner Herzog says that it never takes him more than 5 days to write a screenplay](https://www.brainpickings.org/2014/08/18/werner-herzog-guide-for-the-perplexed-cronin/), if you're spending 6 months building an MVP, either you're
building too many extraneous details or you're building a product that will be too complex to have any appeal. I've been through several of these sort of projects, only to see most of them fall flat on their face. The ones that didn't made me
wish they did, because the project was so heavy and bloated that it needed a
rewrite before it even served up its first page view.

6. Overcommunicate
------------------

At my first job out of undergrad, we had weekly meetings but stopped in the name
of "efficiency." The end result was me not knowing what anybody on my 3-person
team was working on, despite the fact that I sat right next to them. I still
remember the team lead asking me what the status of a given feature was and
I responded that it had been in [Gerrit](https://en.wikipedia.org/wiki/Gerrit_(software)) awaiting his code review for the last 5 months. Talk to your coworkers, tell them what you're doing, because
it's hard enough to keep track of your own projects, let alone someone else's.

7. Take "expert" advice with a grain of salt
--------------------------------------------

After leaving the glacial development cycles of HFT behind, I found the pace
of the JavaScript community intoxicating (even back in 2012!). The Cambrian
explosion of JavaScript introduced an incredible variety of new ideas, most
of which were absolutely awful. A lot of the good ideas and some of the not
so good ideas saw community adoption. A lot of community people started calling
themselves experts and started claiming that tool X was indispensible best
practice for building anything.

I love seeing new ideas and constructive discussion, but I'm wary because
bloated "best practices" and useless hour-long compilation processes were the reason that I stopped writing Java, C++, Rails, and iOS. Nowadays writing
a simple to-do list in JavaScript takes [9 modules, a 20-line build configuration, a completely new programming language, and no less than 3 distinct libraries for dealing with "state"](https://www.sitepoint.com/how-to-build-a-todo-app-using-react-redux-and-immutable-js/). Just because React is super popular doesn't mean you need to
build everything in React, and just because some talking head says you need to
use redux and react-redux doesn't mean you should - these "best practices" are
often more about money and politics than making developers' lives easier.
So before you pull in another npm module to solve another problem, ask if that
problem is [really worth solving](https://xkcd.com/1205/).

8. Embrace disagreements
------------------------

Like many engineers I know, I became obsessed with tinkering on the computer
because I was terrible at interacting with people. I became interested in
programming because it let me get things done without having to engage in
face-to-face conflict with others. Because of this, I've often found myself
taking on projects that I had no interest in or accepting decisions I knew
to be wrong, just to avoid the
emotional strain of saying "no" to some inconsequential middle manager.
However, disagreements between rational people are a wonderful thing: one
party is right, and the other party learns something. Be willing to stand up
for your ideas and be willing to accept being proven wrong. More importantly,
run like hell from any team that ends debates with "we don't like to debate". Avoiding
[bikeshedding](https://en.wikipedia.org/wiki/Law_of_triviality) is important,
but fostering an environment where the most effective ideas win out is paramount.

9. Live by the rule of "Fuck Yes or No"
---------------------------------------

There's
no shortage of interesting work out there, your time and your willpower are
far more scarce resources. If you ever find yourself dragging your feet, it's
time to reconsider what you're working on. For example, I got
roped in to writing some [niche advanced Windows auth features for the MongoDB Go driver](https://github.com/go-mgo/mgo/pull/20). I had minimal experience with Go,
and no experience with Windows, Active Directory, or Kerberos. But naturally, nobody else was willing to step up, so I figured I'd suck it up and do it to curry favor for a future promotion (which I never got).

In the meantime, the work that I was truly passionate about, mongoose, stagnated.
I learned a valuable lesson from
that: never work on a project that you're not champing at the bit to work on.
Apply the rule of ["Fuck Yes or No"](https://markmanson.net/fuck-yes) when
it comes to your work, especially if it leads to conflict (see point 8).

10. Build a good team
---------------------

Coding is very much a team sport. There's a limit to what you can do as an
individual. Plus, daily discussions (and/or disagreements) with smart people
help keep you from getting stuck in your own confirmation bias. Building a team,
though, is about more than assembling the right people and guiding the
culture: it's about building a real bond between individuals and making
the team conducive to the individuals' personal development. In the
[legendary basketball coach Phil Jackson's terminology](https://en.wikipedia.org/wiki/Tribal_Leadership), you need to
become a stage 4 (or even stage 5) team to really get the feedback loop of
individual improvement -> team improvement -> individual improvement going.
In that kind of environment, software engineering becomes pure bliss, and
success becomes almost inevitable.
