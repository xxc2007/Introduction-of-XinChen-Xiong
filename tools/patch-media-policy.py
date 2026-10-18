#!/usr/bin/env python3
"""Read a reviewed nginx site on stdin; emit a scoped media-cache patch on stdout.

This tool never opens configuration files or invokes nginx. Unknown structures fail
without output. Install deploy/site-video-cache.conf in the http context separately.
"""
import re
import sys

STATIC = r"location ~* \.(css|js|mjs|map|woff2?|ttf|otf|png|jpe?g|gif|svg|ico|webp|avif)$"
MEDIA = r"location ~* ^/assets/(video|promo)/.*\.(mp4|webm)$"


def blocks(source):
    """Track nginx braces outside comments/quotes; retain original byte ranges."""
    result, stack = [], []
    quote, escaped, comment, start = None, False, False, 0
    for i, char in enumerate(source):
        if comment:
            if char == '\n':
                comment = False
            continue
        if escaped:
            escaped = False
            continue
        if char == '\\':
            escaped = True
            continue
        if quote:
            if char == quote:
                quote = None
            continue
        if char in "\"'":
            quote = char
        elif char == '#':
            comment = True
        elif char == '{':
            header = re.sub(r'#[^\n]*', '', source[start:i]).strip()
            block = {'open': i, 'header': header, 'parent': stack[-1] if stack else None}
            stack.append(block)
            result.append(block)
            start = i + 1
        elif char == '}':
            if not stack:
                raise ValueError('unmatched closing brace')
            stack.pop()['close'] = i
            start = i + 1
        elif char == ';':
            start = i + 1
    if stack or quote or escaped:
        raise ValueError('unterminated nginx structure')
    return result


def patch(source):
    parsed = blocks(source)
    root = lambda b: b['parent'] is not None and b['parent']['header'] == 'server' and b['parent']['parent'] is None
    candidates = [b for b in parsed if root(b) and b['header'] == STATIC]
    existing = [b for b in parsed if root(b) and b['header'] == MEDIA]
    if len(candidates) != 2 or len({id(b['parent']) for b in candidates}) != 2:
        raise ValueError('expected exactly two static blocks in distinct root server blocks')
    if len(existing) not in (0, 2) or source.count('$site_video_cache') != len(existing):
        raise ValueError('unexpected existing media policy')
    insertions = []
    for static in candidates:
        start = source.rfind('\n', 0, static['open']) + 1
        indent = re.match(r'[ \t]*', source[start:]).group()
        body = source[static['open'] + 1:static['close']]
        # Only a header-only static block is safe to duplicate; never copy handlers.
        header_re = re.compile(r'add_header\s+([A-Za-z0-9-]+)\s+("(?:[^"\\]|\\.)*"|\'(?:[^\'\\]|\\.)*\'|[^;\s]+)(\s+always)?\s*;')
        matches = list(header_re.finditer(body))
        residue = header_re.sub('', body)
        if re.sub(r'#[^\n]*', '', residue).strip():
            raise ValueError('static block has unknown non-header directives')
        headers = {m[1].lower(): m[2].strip('"\'') for m in matches}
        if len(headers) != len(matches) or headers.get('cache-control') != 'public, max-age=31536000, immutable' or headers.get('x-content-type-options') != 'nosniff' or headers.get('referrer-policy') != 'strict-origin-when-cross-origin':
            raise ValueError('static block header baseline drift')
        cache = next(m for m in matches if m[1].lower() == 'cache-control')
        changed = body[:cache.start()] + 'add_header Cache-Control $site_video_cache always;' + body[cache.end():]
        generated = indent + MEDIA + ' {' + changed + '}'
        previous = [b for b in existing if b['parent'] is static['parent']]
        if existing:
            if len(previous) != 1:
                raise ValueError('media block server scope drift')
            prior = previous[0]
            prior_start = source.rfind('\n', 0, prior['open']) + 1
            if source[prior['close'] + 1:start].strip() or source[prior_start:prior['close'] + 1] != generated:
                raise ValueError('generated media block changed or moved')
        else:
            insertions.append((start, generated + '\n\n'))
    for start, text in reversed(insertions):
        source = source[:start] + text + source[start:]
    return source


if __name__ == '__main__':
    try:
        # Preserve LF/CRLF and UTF-8 exactly for untouched parts on every platform.
        original = sys.stdin.buffer.read().decode('utf-8')
        result = patch(original)
    except (ValueError, UnicodeError) as error:
        print('Refusing media policy patch: ' + str(error), file=sys.stderr)
        sys.exit(1)
    sys.stdout.buffer.write(result.encode('utf-8'))
