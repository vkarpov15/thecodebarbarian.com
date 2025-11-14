If you've built enough apps with MongoDB, you've probably wished for a GUI that actually understands your Mongoose configuration and schemas — one that can autocomplete field names, write queries that behave the same way your models do, and even help you build dashboards without leaving your codebase.

That's why we built [Mongoose Studio - a web based MongoDB GUI](https://mongoosestudio.app) designed for Mongoose developers.

It's a MongoDB UI and dashboard layer that runs alongside your Node.js app — whether that's Express, Vercel, or Netlify — using the same Mongoose connection config you already have. You log in with GitHub or Google, no connection strings to share or rotate.

Think of it as a [sidecar](https://learn.microsoft.com/en-us/azure/architecture/patterns/sidecar): give Mongoose Studio your Mongoose connection, and you get a clean UI for exploring your data, querying with schema-aware autocomplete, and generating charts using AI that already knows your data model.

## Why We Built It

**1) Authentication and Connection Strings**

Every team we've worked with has some version of this pain: a new developer joins the team, nobody wants to create a new connection string so they share the same one. Then someone leaves, and now everyone has to update their connection strings. Managing, rotating, and securely communicating connection strings per developer quickly becomes a time-consuming chore that nobody wants to own.

Mongoose Studio skips that mess entirely. With Mongoose Studio Pro, developers log in using GitHub or Google OAuth, and the app connects to your MongoDB through the Studio backend - no shared connection strings, no rotations, no leaked credentials in Slack.

The free local dev version skips authentication altogether so you can run it instantly during development, but for production or shared environments, Studio Pro handles secure access for you.

**2) Querying Without Mongoose Schema Casting Is a Pain**

Anyone who's written raw Mongo queries knows the pain of comparing dates or ObjectIds manually.
You end up writing code like:

```javascript
{ createdAt: { $gte: '2024-01-01' } }
```

…and wonder why it doesn't behave like your Mongoose queries.

Studio handles this by using your existing Mongoose schemas under the hood, so filters and projections in the Studio UI are automatically cast the same way Mongoose would in your app. You get predictable results without re-implementing casting logic.

Even better - Mongoose Studio's filter syntax supports inline JavaScript, so you can write queries like:

```javascript
{ createdAt: { $gte: Date.now() - 1000 } }
```

to find documents created in the last second. No mental gymnastics required.

**3) Schema-Aware Autocomplete**

Typing field names from memory is fine for small collections - until you're juggling dozens of models, each with 50 fields and multiple levels of nesting. That's when you start tabbing between your schema files and the database UI, double-checking field paths, and dreaming about retiring to a farm.

Mongoose Studio reads your schemas directly and provides autocomplete for fields and operators - like a lightweight IDE for your database queries. You can type partial field names, navigate nested paths instantly, and let Mongoose Studio handle the rest.

Your fingers will thank you for never having to type out `user.profile.settings.notifications.email` ever again.

**4) Built-In Dashboarding and BI (With AI Help)**

At some point every team hits the "we really should track this" moment — whether it's daily active users, API usage, or which features people actually use.
That usually means wiring up Metabase, Retool, or some third-party dashboarding SaaS just to visualize a handful of metrics; or creating an admin dashboard from scratch that contains all the charts you want in one place.

We thought that was too much overhead.

Mongoose Studio includes a simple dashboarding framework so you can build charts directly from scripts. But here's the twist — Studio uses your Mongoose schemas and codebase as context to help ChatGPT write the queries and aggregations for you.

You can literally ask it, "show me a chart of users created this week by country" and it will write a script that will display a Chart.js bar chart for you.
Or ask it to "draw the locations of users created this week on a map" and it will display your users on a Leaflet map.

![Mongoose Studio dashboard and query builder UI](https://res.cloudinary.com/drfhhq8wu/image/upload/v1758897716/campaign/687a6541bf6a8568c1807abc/images/68d6a634045bfaf40a49a1f6.png)

No separate BI tool, no schema redefinition - just smart context-aware analytics.

**5) Be Productive From Your Phone (Yes, Really)**

Most database tools are painful to use on mobile — tiny tables, modal-heavy UIs, and no keyboard shortcuts. Studio takes a different approach.

The built-in AI chat feature lets you type or even dictate scripts to analyze or update your data.
Need to flip a feature flag or inspect a user document while you're out? You can literally say:

"Find all users with betaAccess = true and disable it."

…and it'll generate and run the right query safely.

We've all had those moments where you need to fix something now - Mongoose Studio makes that possible without cracking open a laptop.

## Where It Fits

Mongoose Studio is meant for developers who already live in Node.js and want a clean, secure, and schema-aware way to explore their data and track app-specific metrics.
Mongoose Studio has become the only tool we use to work with our MongoDB data - no more Compass or Studio 3T.

You can mount it under /studio in Express, deploy it to Vercel, or even run it locally during development.
It's free for local use.

```javascript
npm install @mongoosejs/studio
```

Then mount it on your Express app:

```javascript
app.use('/studio', await studio('/studio/api', mongoose));
```

## What's Next

We're adding more integrations for production deployments (like fine-grained workspace permissions and SSO), but the local-dev experience is already solid. If you've been managing MongoDB through the CLI or Compass and wish you had something faster and more schema-aware — give it a try.

👉 [Docs](https://mongoosestudio.app/docs)

👉 [IMDb Demo](https://mongoosestudio.app/imdb)

👉 `npm install @mongoosejs/studio`

Would love to hear what you think — feedback from developers has shaped every part of this so far, and we're just getting started. Let us know what you think on [GitHub issues](https://github.com/mongoosejs/studio/issues) or [Discord](https://discord.gg/P3YCfKYxpy).
