# ESPN Fantasy Dark Mode

A Chrome extension that gives `fantasy.espn.com` a dark theme. There is no build step.

## Install

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and pick this folder.
3. Open ESPN Fantasy. Pin the extension if you want the toggle on your toolbar: clicking the icon turns dark mode on or off, and the **ON** badge shows the current state.

After changing a file, click the reload icon on the extension's card and refresh the ESPN tab.

## How it works

ESPN hard-codes its colors and generates hashed class names, so a hand-written stylesheet would go stale and miss most of the page. Instead, `content.js` reads every rule the page has loaded and writes a second stylesheet with the same selectors and dark colors, chosen by `colors.js`. It watches for rules and inline styles added later, and caches the result so the next page load is dark straight away.

Only `fantasy.espn.com` is themed, which includes ESPN's other fantasy sports. The extension reads nothing but stylesheets and sends nothing anywhere: `background.js` only downloads ESPN's CSS, because the CDN's missing CORS headers stop the page from reading it.

## Known limits

- Ads and the Disney sign-in window run in iframes from other sites and stay as they are.
- Dark logos and images aren't recolored, so a mostly black team logo can be hard to see.

To change the palette, edit the role functions in `colors.js` and `BASE_CSS` in `content.js`.
