# keyframes-tool

Keyframes-tool is a NodeJs command line tool which convert CSS Animations to a [keyframes object ](https://w3c.github.io/web-animations/#processing-a-keyframes-argument) suitable for [Web Animations API](https://w3c.github.io/web-animations/).

Use this tool to move your interactive animations from stylesheets to JavaScript.


## Great! So how do I use it?

- Install keyframes-tool using `npm install keyframes-tool` or adding it in your `package.json` as: `"devDependencies": { "keyframes-tool": "^1.0.0" }` and run `npm install`.
- From your project directory, enter `node keyframes-tool ./input.css ./output.json`,
where as first argument `./input.css` is the CSS source file to process and the second argument `./output.json` is the destination file with the converted result.
Paths should be relative to `keyframes-tool.js` file location.
- `keyframes-tool` will create a JSON file from your CSS where any CSS Animation declarations found will be added as a property, example:

Input file `/input.css`:
```css
@keyframes flash {
  from, 50%, to {
    opacity: 1;
  }

  25%, 75% {
    opacity: 0;
  }
}

@keyframes pulse {
  from {
    transform: scale3d(1, 1, 1);
  }

  50% {
    transform: scale3d(1.05, 1.05, 1.05);
  }

  to {
    transform: scale3d(1, 1, 1);
  }
}

```
Output file `/output.json`:

```json
{
  "flash": [
    {
      "opacity": "1",
      "offset": "0"
    },
    {
      "opacity": "0",
      "offset": "0.25"
    },
    {
      "opacity": "1",
      "offset": "0.5"
    },
    {
      "opacity": "0",
      "offset": "0.75"
    },
    {
      "opacity": "1",
      "offset": "1"
    }
  ],
  "pulse": [
    {
      "transform": "scale3d(1, 1, 1)",
      "offset": "0"
    },
    {
      "transform": "scale3d(1.05, 1.05, 1.05)",
      "offset": "0.5"
    },
    {
      "transform": "scale3d(1, 1, 1)",
      "offset": "1"
    }
  ]
}
```
- Use the result as embedded data in your JavaScript as [shown in this example](http://codepen.io/gibbok/pen/ENpqZO), alternatively you could load the JSON data using Ajax.