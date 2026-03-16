# [rowan.fyi](https://rowan.fyi)

This is the code for my personal web site. It's probably nasty in places, so if you see opportunities to improve then feel free to send a pull request.

## Run locally

Make sure you have `npm` installed.

On first run, install dependencies as per the lock file:

```
npm ci
```

The `build` command will build the Astro site for deploy.

```
npm run build
```

The `dev` command will start the local Vite dev server with hot reloading.

```
npm run dev
```

## Contributing

Before committing or submitting code, make sure you run the following commands to validate code quality.

Format the HTML, CSS, and JavaScript `format` command.

```
npm run format
```

You can validate code is formatted correctly with the `format:check` command.

```
npm run format:check
```

Various linting and quality checking tools can be invoked via the `check` command.

```
npm run check
```

If you add new dependencies, make sure you run a full install and commit the lock file.

```
npm run i
git add package.json package-lock.json`
```
