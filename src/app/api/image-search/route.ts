import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawQuery = searchParams.get('q') || 'nature';
  const query = rawQuery.trim();

  try {
    const results: any[] = [];
    const encodedQuery = encodeURIComponent(query);

    // 1. Primary: Unsplash Public Search API
    try {
      const res = await fetch(`https://unsplash.com/napi/search/photos?query=${encodedQuery}&per_page=12&page=1`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          for (const item of data.results) {
            results.push({
              id: item.id || `un-${Math.random()}`,
              url: item.urls?.regular || item.urls?.full || item.urls?.small,
              thumb: item.urls?.small || item.urls?.thumb,
              title: item.alt_description || item.description || query,
              author: item.user?.name || 'Unsplash Creator'
            });
          }
        }
      }
    } catch (e) {
      console.warn('Unsplash public search error:', e);
    }

    // 2. Secondary: Wikimedia Commons Search API for additional relevant image search
    if (results.length < 12) {
      try {
        const wikiRes = await fetch(
          `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodedQuery}&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url|mime|user|extmetadata&format=json`,
          { headers: { 'User-Agent': 'PresentationMatrixApp/1.0' } }
        );
        if (wikiRes.ok) {
          const wikiData = await wikiRes.json();
          if (wikiData.query && wikiData.query.pages) {
            const pages = Object.values(wikiData.query.pages) as any[];
            for (const p of pages) {
              const ii = p.imageinfo?.[0];
              if (ii && ii.url && (ii.mime?.startsWith('image/jpeg') || ii.mime?.startsWith('image/png') || ii.mime?.startsWith('image/webp'))) {
                results.push({
                  id: `wiki-${p.pageid}`,
                  url: ii.url,
                  thumb: ii.url,
                  title: p.title.replace('File:', '') || query,
                  author: ii.user || 'Wikimedia Commons'
                });
              }
            }
          }
        }
      } catch (e) {
        console.warn('Wikimedia search error:', e);
      }
    }

    // 3. Fallback: High Quality Unsplash Keyword Topic Source URLs (Exact Keyword Matched Images)
    if (results.length < 8) {
      const resolutions = [
        '1920x1080', '1600x900', '1200x800', '1366x768', '1920x1200', '1440x900'
      ];
      for (let i = results.length; i < 12; i++) {
        const sig = i + 1;
        const resSize = resolutions[i % resolutions.length];
        // Direct keyword matched image via Unsplash Source topic keyword endpoint
        const kwUrl = `https://source.unsplash.com/${resSize}/?${encodedQuery}&sig=${sig}`;
        const directKwUrl = `https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80&${encodedQuery}`;

        results.push({
          id: `kw-matched-${i}-${sig}`,
          url: kwUrl,
          thumb: kwUrl,
          title: `"${query}" 배경 주제 이미지 #${i + 1}`,
          author: 'Royalty-Free High-Res Photo'
        });
      }
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('Image search route error:', error);
    return NextResponse.json({ results: [], error: error.message }, { status: 500 });
  }
}
