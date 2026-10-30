import { getRequestHost } from 'h3'
import { isTiersHost } from '~~/shared/tiers-site'

const TITLE = 'Helldivers 2 Tier List Maker · Griffdive'
const DESCRIPTION = 'Rank every Helldivers 2 weapon, stratagem, booster and armor passive. Drag, drop, share it with a link — then play it in Griffdive.'

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

// Crawlers never run the SPA, so a link to the standalone Tier Maker would
// preview as the game. On a `tiers.` host the shell's title and card text
// are swapped for the maker's before the HTML leaves the server.
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', (html, { event }) => {
    const host = getRequestHost(event, { xForwardedHost: true })
    if (!isTiersHost(host)) {
      return
    }
    const origin = `https://${host}/`
    html.head = html.head.map(chunk => chunk
      .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(TITLE)}</title>`)
      .replace(/(<meta (?:name|property)="(?:og:title|twitter:title)" content=")[^"]*"/g, `$1${escapeHtml(TITLE)}"`)
      .replace(/(<meta (?:name|property)="(?:description|og:description|twitter:description)" content=")[^"]*"/g, `$1${escapeHtml(DESCRIPTION)}"`)
      .replace(/(<meta property="og:url" content=")[^"]*"/, `$1${escapeHtml(origin)}"`))
  })
})
