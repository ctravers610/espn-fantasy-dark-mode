# Fantasy Dark Modes

A Chrome extension that gives `fantasy.espn.com` and `football.fantasysports.yahoo.com` a dark theme. There is no build step.

## Install

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and pick this folder.
3. Open ESPN Fantasy or Yahoo Fantasy Football. Pin the extension if you want the toggle on your toolbar: clicking the icon turns dark mode on or off on both sites, and the **ON** badge shows the current state.

After changing a file, click the reload icon on the extension's card and refresh the fantasy tab.

## How it works

Both sites hard-code colors and generate hashed class names, so a hand-written stylesheet would go stale and miss most of the page. Instead, `content.js` reads every rule the page has loaded and writes a second stylesheet with the same selectors and dark colors, chosen by `colors.js`. It watches for rules and inline styles added later, and caches the result per site so the next page load is dark straight away.

Yahoo also ships its own dark palette for its color tokens but never turns it on. On Yahoo, `content.js` sets `data-color-scheme="dark"` to use that palette, and the rewrite only handles the colors Yahoo hard-coded.

Only those two sites are themed, which includes ESPN's other fantasy sports but not Yahoo's, since each Yahoo sport has its own host. The extension reads nothing but stylesheets and sends nothing anywhere: `background.js` only downloads each site's CSS, because the CDNs' missing CORS headers stop the page from reading it.

## Known limits

- Ads and sign-in windows run in iframes or on other sites and stay as they are.
- Dark logos and images aren't recolored, so a mostly black team logo can be hard to see.

To change the palette, edit the role functions in `colors.js` and `BASE_CSS` in `content.js`.
