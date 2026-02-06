#!/usr/bin/env python3
"""Publish blog posts to WordPress REST API with scheduled dates."""

import json
import re
import base64
import urllib.request
import urllib.error

# WordPress credentials - reads from marketing-assistant .env
import os

def load_env():
    env_file = os.path.expanduser("~/marketing-assistant/.env")
    if os.path.exists(env_file):
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if "=" in line and not line.startswith("#"):
                    key, val = line.split("=", 1)
                    os.environ[key.strip()] = val.strip()

load_env()
WP_URL = os.environ.get("WORDPRESS_URL", "https://bestlessonever.com").rstrip("/")
WP_USER = os.environ.get("WORDPRESS_USERNAME", "")
WP_APP_PASS = os.environ.get("WORDPRESS_APP_PASSWORD", "")

# Base64 encode credentials for Basic Auth
credentials = base64.b64encode(f"{WP_USER}:{WP_APP_PASS}".encode()).decode()

# Posts to publish: (file_path, scheduled_date, seo_title, meta_description, focus_keyword, category)
POSTS = [
    {
        "file": "/Users/bc/marketing-dept/content/blog-posts/how-to-choose-right-guitar-for-child.md",
        "date": "2026-02-10T09:00:00",
        "seo_title": "First Guitar for Kids: How to Pick the Right One",
        "meta_desc": "Buying your kid's first guitar? Skip the guesswork. Here's what actually matters when choosing a first guitar for kids (and what's a waste of money).",
        "focus_keyword": "first guitar for kids",
        "slug": "how-to-choose-right-guitar-for-child",
    },
    {
        "file": "/Users/bc/marketing-dept/content/blog-posts/what-age-start-piano-lessons.md",
        "date": "2026-02-17T09:00:00",
        "seo_title": "Best Age to Start Piano Lessons for Kids | Real Talk",
        "meta_desc": "Wondering the best age to start piano lessons? We skip the fluff and tell you what actually matters -- from teachers who work with kids every day.",
        "focus_keyword": "best age to start piano lessons",
        "slug": "what-age-start-piano-lessons",
    },
    {
        "file": "/Users/bc/marketing-dept/content/blog-posts/signs-kid-ready-music-lessons.md",
        "date": "2026-02-24T09:00:00",
        "seo_title": "Is Your Kid Ready for Music Lessons? 5 Signs Yes, 3 No",
        "meta_desc": "Not sure if your kid is ready for music lessons? Here are the real signs to look for -- and a few that mean you should wait -- from actual music teachers.",
        "focus_keyword": "benefits of music lessons for kids",
        "slug": "signs-kid-ready-music-lessons",
    },
    {
        "file": "/Users/bc/marketing-dept/content/blog-posts/piano-vs-guitar-first-instrument.md",
        "date": "2026-03-03T09:00:00",
        "seo_title": "Piano vs Guitar for Kids: Which to Learn First?",
        "meta_desc": "Piano or guitar first? We break down the real differences -- cost, difficulty, fun factor -- so you can pick the right instrument for your kid.",
        "focus_keyword": "kids piano lessons near me",
        "slug": "piano-vs-guitar-first-instrument",
    },
]


def md_to_html(md_text):
    """Convert markdown to HTML (basic conversion for blog content)."""
    # Remove YAML frontmatter
    md_text = re.sub(r'^---\n.*?---\n', '', md_text, flags=re.DOTALL)

    # Remove the H1 title (WordPress uses its own title field)
    md_text = re.sub(r'^# .+\n', '', md_text.strip())

    lines = md_text.strip().split('\n')
    html_lines = []
    in_list = False
    in_table = False
    table_header_done = False

    i = 0
    while i < len(lines):
        line = lines[i]

        # Skip empty lines (close list if open)
        if not line.strip():
            if in_list:
                html_lines.append('</ul>')
                in_list = False
            if in_table:
                html_lines.append('</tbody></table>')
                in_table = False
                table_header_done = False
            html_lines.append('')
            i += 1
            continue

        # Horizontal rule
        if line.strip() == '---':
            if in_list:
                html_lines.append('</ul>')
                in_list = False
            html_lines.append('<hr />')
            i += 1
            continue

        # Headers
        if line.startswith('### '):
            if in_list:
                html_lines.append('</ul>')
                in_list = False
            html_lines.append(f'<h3>{inline_md(line[4:])}</h3>')
            i += 1
            continue
        if line.startswith('## '):
            if in_list:
                html_lines.append('</ul>')
                in_list = False
            html_lines.append(f'<h2>{inline_md(line[3:])}</h2>')
            i += 1
            continue

        # Table rows
        if '|' in line and line.strip().startswith('|'):
            cells = [c.strip() for c in line.strip().strip('|').split('|')]
            # Skip separator rows
            if all(re.match(r'^[-:]+$', c) for c in cells):
                i += 1
                continue
            if not in_table:
                html_lines.append('<table><thead><tr>')
                for cell in cells:
                    html_lines.append(f'<th>{inline_md(cell)}</th>')
                html_lines.append('</tr></thead><tbody>')
                in_table = True
                table_header_done = True
            else:
                html_lines.append('<tr>')
                for cell in cells:
                    html_lines.append(f'<td>{inline_md(cell)}</td>')
                html_lines.append('</tr>')
            i += 1
            continue

        # Unordered list items
        if line.strip().startswith('- '):
            if not in_list:
                html_lines.append('<ul>')
                in_list = True
            content = line.strip()[2:]
            html_lines.append(f'<li>{inline_md(content)}</li>')
            i += 1
            continue

        # Regular paragraph - collect consecutive non-empty, non-special lines
        if in_list:
            html_lines.append('</ul>')
            in_list = False

        para_lines = [line]
        while i + 1 < len(lines) and lines[i + 1].strip() and not lines[i + 1].startswith('#') and not lines[i + 1].startswith('- ') and not lines[i + 1].strip().startswith('|') and lines[i + 1].strip() != '---':
            i += 1
            para_lines.append(lines[i])

        para_text = ' '.join(para_lines)
        html_lines.append(f'<p>{inline_md(para_text)}</p>')
        i += 1

    if in_list:
        html_lines.append('</ul>')
    if in_table:
        html_lines.append('</tbody></table>')

    return '\n'.join(html_lines)


def inline_md(text):
    """Convert inline markdown (bold, italic, links, code)."""
    # Links: [text](url)
    text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', text)
    # Bold: **text**
    text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
    # Italic: *text*
    text = re.sub(r'\*(.+?)\*', r'<em>\1</em>', text)
    # Inline code: `text`
    text = re.sub(r'`(.+?)`', r'<code>\1</code>', text)
    # Em dash
    text = text.replace(' -- ', ' &mdash; ')
    return text


def publish_post(post_data):
    """Publish a single post to WordPress."""
    # Read the markdown file
    with open(post_data["file"], "r") as f:
        md_content = f.read()

    # Extract title from frontmatter
    title_match = re.search(r'^title:\s*"(.+)"', md_content, re.MULTILINE)
    title = title_match.group(1) if title_match else "Untitled"

    # Convert to HTML
    html_content = md_to_html(md_content)

    # Build the WordPress API payload
    payload = {
        "title": title,
        "content": html_content,
        "status": "future",
        "date": post_data["date"],
        "slug": post_data["slug"],
        "meta": {
            "rank_math_title": post_data["seo_title"],
            "rank_math_description": post_data["meta_desc"],
            "rank_math_focus_keyword": post_data["focus_keyword"],
        },
    }

    data = json.dumps(payload).encode("utf-8")

    req = urllib.request.Request(
        f"{WP_URL}/wp-json/wp/v2/posts",
        data=data,
        headers={
            "Authorization": f"Basic {credentials}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            print(f"  Published: {title}")
            print(f"  ID: {result['id']}")
            print(f"  URL: {result['link']}")
            print(f"  Scheduled: {result['date']}")
            print(f"  Status: {result['status']}")
            return result
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()
        print(f"  ERROR ({e.code}): {error_body}")
        return None


def main():
    print("Publishing 4 blog posts to bestlessonever.com...\n")

    results = []
    for i, post in enumerate(POSTS, 1):
        print(f"[{i}/4] Publishing: {post['slug']}")
        result = publish_post(post)
        results.append(result)
        print()

    # Summary
    print("=" * 60)
    print("PUBLISH SUMMARY")
    print("=" * 60)
    successes = [r for r in results if r is not None]
    failures = [r for r in results if r is None]
    print(f"  Successful: {len(successes)}")
    print(f"  Failed: {len(failures)}")

    if successes:
        print("\nScheduled posts:")
        for r in successes:
            print(f"  - {r['title']['rendered']} -> {r['date']}")


if __name__ == "__main__":
    main()
