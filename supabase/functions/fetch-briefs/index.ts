import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const REDDIT_SOURCES = [
  'https://www.reddit.com/r/syncmusic/new.json?limit=25',
  'https://www.reddit.com/r/WeAreTheMusicMakers/search.json?q=sync+brief+OR+music+supervisor+OR+sync+licensing&sort=new&limit=25',
  'https://www.reddit.com/r/edmproduction/search.json?q=sync+brief+OR+placement+opportunity&sort=new&limit=25',
]

const RSS_SOURCES = [
  'https://www.filmmusicmag.com/feed',
  'https://www.musicbusinessworldwide.com/feed',
]

const SYNC_KEYWORDS = ['sync brief', 'music supervisor', 'looking for music', 'placement opportunity', 'sync licensing', 'brief open', 'music brief', 'song placement']

function isSyncRelevant(text: string): boolean {
  const lower = text.toLowerCase()
  return SYNC_KEYWORDS.some(kw => lower.includes(kw))
}

async function fetchReddit() {
  const briefs = []
  for (const url of REDDIT_SOURCES) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'FSMBriefFeed/1.0 by /u/SodaFried' }
      })
      console.log(`Reddit ${url} status: ${res.status}`)
      const text = await res.text()
      console.log(`Reddit response preview: ${text.slice(0, 200)}`)
      const json = JSON.parse(text)
      const posts = json?.data?.children || []
      console.log(`Posts found: ${posts.length}`)
      const isSyncSubreddit = url.includes('r/syncmusic')
      for (const post of posts) {
        const d = post.data
        const postText = `${d.title} ${d.selftext || ''}`
        if (!isSyncSubreddit && !isSyncRelevant(postText)) continue
        briefs.push({
          source: 'Reddit',
          title: d.title,
          content: d.selftext?.slice(0, 500) || null,
          url: `https://reddit.com${d.permalink}`,
          author: d.author,
          posted_at: new Date(d.created_utc * 1000).toISOString(),
        })
      }
    } catch (e) {
      console.error('Reddit fetch error:', e.message)
    }
  }
  return briefs
}

async function fetchRSS() {
  const briefs = []
  for (const url of RSS_SOURCES) {
    try {
      const res = await fetch(url)
      const text = await res.text()
      const items = text.match(/<item>([\s\S]*?)<\/item>/g) || []
      for (const item of items) {
        const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || item.match(/<title>(.*?)<\/title>/)?.[1] || ''
        const link = item.match(/<link>(.*?)<\/link>/)?.[1] || ''
        const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || ''
        const description = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1] || item.match(/<description>(.*?)<\/description>/)?.[1] || ''
        const combined = `${title} ${description}`
        if (!isSyncRelevant(combined)) continue
        briefs.push({
          source: 'RSS',
          title: title.replace(/<[^>]*>/g, '').slice(0, 200),
          content: description.replace(/<[^>]*>/g, '').slice(0, 500),
          url: link,
          author: null,
          posted_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        })
      }
    } catch (e) {
      console.error('RSS fetch error:', e)
    }
  }
  return briefs
}

Deno.serve(async () => {
  try {
    const [redditBriefs, rssBriefs] = await Promise.all([fetchReddit(), fetchRSS()])
    const all = [...redditBriefs, ...rssBriefs]

    let inserted = 0
    for (const brief of all) {
      if (!brief.url) continue
      const { error } = await supabase.from('briefs').upsert(brief, { onConflict: 'url', ignoreDuplicates: true })
      if (!error) inserted++
    }

    return new Response(JSON.stringify({ success: true, fetched: all.length, inserted }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
})