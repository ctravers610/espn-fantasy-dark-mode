# Chrome Web Store submission

Everything to paste into the [Developer Dashboard](https://chrome.google.com/webstore/devconsole), tab by tab.

## Before you submit

- Open your own Yahoo league, team, matchup and draft pages with the extension on. They couldn't be tested signed out.
- Confirm your contact email on the dashboard's Account page. Submission is blocked until it's verified.

## Upload

Click **Add new item** and choose `fantasy-dark-modes-1.1.0.zip` from this folder.

## Store listing tab

The name and summary come from the zip's manifest.

**Description**

```
A dark theme for fantasy football, for people who check their lineups late at night.

Fantasy Dark Modes turns these sites dark:
• ESPN Fantasy (fantasy.espn.com), including ESPN's other fantasy sports
• Yahoo Fantasy Football (football.fantasysports.yahoo.com)

Click the toolbar icon to turn dark mode on or off. The ON badge shows the current state, and the setting applies to both sites.

The theme covers the pages themselves: rosters, player tables, tabs, menus and buttons. On Yahoo it uses Yahoo's own dark color palette wherever the site provides one.

Privacy: the extension collects nothing and sends nothing anywhere. There are no accounts, analytics or tracking. It only reads each site's stylesheets to work out the dark colors.

Known limits:
• Ads and sign-in windows come from other sites and stay as they are.
• Logos and images aren't recolored, so a mostly black team logo can be hard to see.

Fantasy Dark Modes is an independent project and isn't affiliated with or endorsed by ESPN or Yahoo.
```

**Category:** Make Chrome Yours > Functionality & UI

**Language:** English

**Store icon:** `icons/icon-128.png` from the repo (`../icons/icon-128.png` from this folder)

**Screenshots** (1280x800, from `screenshots/`):

1. `1-yahoo-draft-analysis.jpg`
2. `2-yahoo-injuries.jpg`
3. `3-yahoo-mock-drafts.jpg`
4. `4-espn-projections.jpg`

**Small promo tile** (440x280): `promo-small-440x280.jpg`

## Privacy tab

**Single purpose description**

```
Gives the ESPN Fantasy and Yahoo Fantasy Football websites a dark color theme, with a toolbar button to turn it on or off.
```

**Permission justification: storage**

```
Saves whether dark mode is on or off, and caches the generated dark stylesheet for each site locally so the next page load is dark straight away.
```

**Permission justification: host permissions**

```
fantasy.espn.com and football.fantasysports.yahoo.com are the two sites the theme applies to, so the content script must run on them. espn.net, espncdn.com and yimg.com are the CDNs those sites load their stylesheets from. They don't send CORS headers, so the page can't read those stylesheets; the background service worker downloads them so the content script can generate dark versions of their colors. No other data is requested from these hosts, and nothing is sent to them beyond those stylesheet requests.
```

**Are you using remote code?** No, I am not using remote code.

(If asked for a justification: the only downloaded files are CSS stylesheets, used as data. All JavaScript ships in the package.)

**Data usage:** leave every data type unchecked, then check all three certifications.

**Privacy policy URL:** leave blank unless the dashboard requires one. If it does, use this link after the pull request is merged: `https://github.com/ctravers610/fantasy-dark-modes#how-it-works`

## Distribution tab

- **Payments:** Free
- **Visibility:** Unlisted
- **Regions:** All regions

## Test instructions tab

```
No account is needed. With the extension installed, open these pages and they appear dark:
https://football.fantasysports.yahoo.com/f1/draftanalysis
https://fantasy.espn.com/football/players/projections
Click the toolbar icon to turn dark mode off and on.
```

## Publishing an update later

1. Raise `version` in `manifest.json` and commit the change. The store rejects a zip with a version it has already seen.
2. Build the zip from the repo root. This packages committed files only:

```bash
git archive --format=zip -o store/fantasy-dark-modes-1.2.0.zip HEAD manifest.json background.js colors.js content.js early.css icons
```

3. In the dashboard, open the item, go to **Package**, upload the new zip, and submit for review.
