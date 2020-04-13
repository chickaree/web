<img src="public/img/logo.svg" width="30%" alt="Chickaree" />

A new social network designed to reach all your followers without an algorithm getting in the way.

# Metadata Fetching

## Lists (Feeds)
Lists of content are prioritized in the following order:
1.  ~~`application/activity+json`~~ (not yet implemented)
2. `application/ld+json` ([schema.org/ListItem](https://schema.org/ListItem))
3. `application/json` ([JSON Feed](https://jsonfeed.org/))
4. `application/atom+xml`
5. `application/rss+xml`
8. `text/html`

## Items
Individual content items are prioritized in the following order:
1.  ~~`application/activity+json`~~ (not yet implemented)
2. `application/ld+json` ([schema.org](https://schema.org/))
3. `text/html`

**NOTE: If a valid URL is not returned from a List, then the content embeded in the the list will be used. This is not ideal because permalinks will not be available**
