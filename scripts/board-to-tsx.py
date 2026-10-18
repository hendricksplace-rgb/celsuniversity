#!/usr/bin/env python3
"""Convert an approved design board (boards/*.dc.html from the website kit) into a React client component.

    python3 scripts/board-to-tsx.py <board.dc.html> <blob-map.json> <out.tsx> <out.css>

- The markup between </helmet> and </x-dc> becomes JSX: class/for/svg attributes are renamed, static
  style="" strings become objects, `{{binding}}` becomes `v.binding` (renderVals() output) or the loop
  variable of an enclosing <sc-for>, <sc-if> becomes a conditional and <sc-for> a .map().
- The board's <script type="text/x-dc"> class (DCLogic: React-like state, componentDidMount, renderVals)
  is kept as the component class; render() returns the JSX.
- The <style> in <helmet> goes to out.css. /_blob/<id> assets become /site/<file> (see blob-map.json).
- Links to other boards (CelsTV.dc.html …) become the site routes.

The output is a starting point: the page owner wires the real links (purchase flow, evaluation) and data.
"""
import json
import re
import sys
from html.parser import HTMLParser

board_path, blob_map_path, out_tsx, out_css = sys.argv[1:5]
src = open(board_path, encoding="utf-8").read()
blobs = {k: "/site/" + v.split("/")[-1] for k, v in json.load(open(blob_map_path)).items()}
ROUTES = {"Main.dc.html": "/", "CelsTV.dc.html": "/celstv", "CelsBSNS.dc.html": "/celsbsns", "CelsUS.dc.html": "/celsus", "CelsGLOBAL.dc.html": "/celsglobal"}


def fix_urls(s: str) -> str:
    s = re.sub(r"/_blob/[0-9a-f]{32}", lambda m: blobs.get(m.group(0), m.group(0)), s)
    for k, v in ROUTES.items():
        s = s.replace(k, v)
    return s


helmet = src[src.index("<helmet>") : src.index("</helmet>")]
css = "\n".join(re.findall(r"<style>([\s\S]*?)</style>", helmet))
# The boards' reduced-motion rule for buttons swallows the 720 px block that follows it; split them.
css = re.sub(
    r"@media \(prefers-reduced-motion: reduce\)\{\.cu-btn,\.cu-btn::after,(@media \(max-width:720px\)\{.*?\}\})\n\.cu-tile\{transition:none\}\}",
    lambda m: "@media (prefers-reduced-motion: reduce){.cu-btn,.cu-btn::after,.cu-tile{transition:none}}\n" + m.group(1),
    css,
    flags=re.S,
)
open(out_css, "w").write("/* From the approved board " + board_path.split("/")[-1] + " (helmet <style>). */\n" + fix_urls(css).strip() + "\n")

markup = fix_urls(src[src.index("</helmet>") + len("</helmet>") : src.index("</x-dc>")])
script = src[src.index('<script type="text/x-dc"') :]
script = script[script.index(">") + 1 : script.rindex("</script>")]
script = fix_urls(script)

ATTR = {
    "class": "className", "for": "htmlFor", "tabindex": "tabIndex", "readonly": "readOnly", "maxlength": "maxLength",
    "viewbox": "viewBox", "preserveaspectratio": "preserveAspectRatio", "gradientunits": "gradientUnits",
    "gradienttransform": "gradientTransform", "stroke-width": "strokeWidth", "stroke-linecap": "strokeLinecap",
    "stroke-linejoin": "strokeLinejoin", "stroke-dasharray": "strokeDasharray", "stroke-dashoffset": "strokeDashoffset",
    "stroke-opacity": "strokeOpacity", "stroke-miterlimit": "strokeMiterlimit", "fill-rule": "fillRule", "clip-rule": "clipRule",
    "fill-opacity": "fillOpacity", "stop-color": "stopColor", "stop-opacity": "stopOpacity", "font-size": "fontSize",
    "font-weight": "fontWeight", "font-family": "fontFamily", "text-anchor": "textAnchor", "dominant-baseline": "dominantBaseline",
    "letter-spacing": "letterSpacing", "clip-path": "clipPath", "xlink:href": "href", "srcset": "srcSet", "crossorigin": "crossOrigin",
    "playsinline": "playsInline", "autoplay": "autoPlay", "allowfullscreen": "allowFullScreen", "colspan": "colSpan", "rowspan": "rowSpan",
    "referrerpolicy": "referrerPolicy", "datetime": "dateTime", "enterkeyhint": "enterKeyHint", "autocomplete": "autoComplete",
    "spellcheck": "spellCheck", "contenteditable": "contentEditable", "fetchpriority": "fetchPriority", "markerwidth": "markerWidth",
    "markerheight": "markerHeight", "refx": "refX", "refy": "refY", "pathlength": "pathLength", "textlength": "textLength",
    "lengthadjust": "lengthAdjust", "startoffset": "startOffset", "patternunits": "patternUnits",
}
EVENTS = {"onclick": "onClick", "oninput": "onInput", "onchange": "onChange", "onkeydown": "onKeyDown", "onkeyup": "onKeyUp",
          "onmouseenter": "onMouseEnter", "onmouseleave": "onMouseLeave", "onfocus": "onFocus", "onblur": "onBlur", "onsubmit": "onSubmit",
          "onpointerdown": "onPointerDown", "onpointerup": "onPointerUp", "onended": "onEnded", "ontimeupdate": "onTimeUpdate",
          "onloadedmetadata": "onLoadedMetadata", "onscroll": "onScroll", "onanimationend": "onAnimationEnd", "ontransitionend": "onTransitionEnd"}
VOID = {"img", "br", "hr", "input", "meta", "link", "source", "track", "area", "col", "wbr", "path", "circle", "rect", "line",
        "polyline", "polygon", "ellipse", "stop", "use", "feGaussianBlur", "feoffset", "feblend"}
BOOL = {"disabled", "checked", "hidden", "autoplay", "playsinline", "muted", "loop", "controls", "required", "selected", "open", "readonly", "allowfullscreen"}
MUST = re.compile(r"\{\{\s*([^}]+?)\s*\}\}")


def expr(e: str, scope: list) -> str:
    e = e.strip()
    if re.fullmatch(r"(true|false|null|-?\d+(\.\d+)?)", e):
        return e
    m = re.match(r"[A-Za-z_$][\w$]*", e)
    if not m:
        return e
    return e if m.group(0) in scope else "v." + e


def style_obj(s: str) -> str:
    out = []
    for decl in s.split(";"):
        if ":" not in decl:
            continue
        k, val = decl.split(":", 1)
        k, val = k.strip(), val.strip()
        if not k:
            continue
        key = json.dumps(k) if k.startswith("--") else re.sub(r"-([a-z])", lambda m: m.group(1).upper(), k)
        if key.startswith("Ms"):
            key = "ms" + key[2:]
        out.append(f"{key}: {json.dumps(val)}")
    return "{ " + ", ".join(out) + " }"


def attr_value(name: str, val, scope: list) -> str:
    if val is None:
        return "{true}"
    whole = MUST.fullmatch(val.strip())
    if name == "style":
        if whole:
            return "{css(" + expr(whole.group(1), scope) + ")}"
        if MUST.search(val):
            return "{css(`" + MUST.sub(lambda m: "${" + expr(m.group(1), scope) + "}", val.replace("`", "\\`")) + "`)}"
        return "{" + style_obj(val) + "}"
    if whole:
        return "{" + expr(whole.group(1), scope) + "}"
    if MUST.search(val):
        return "{`" + MUST.sub(lambda m: "${" + expr(m.group(1), scope) + "}", val.replace("`", "\\`")) + "`}"
    return json.dumps(val)


def text(t: str, scope: list) -> str:
    parts = []
    last = 0
    for m in MUST.finditer(t):
        parts.append(esc(t[last : m.start()]))
        parts.append("{" + expr(m.group(1), scope) + "}")
        last = m.end()
    parts.append(esc(t[last:]))
    return "".join(parts)


def esc(t: str) -> str:
    return t.replace("{", "{'{'}").replace("}", "{'}'}").replace(">", "{'>'}") if re.search(r"[{}>]", t) else t


class Conv(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.out = []
        self.stack = []  # (tag, close_text)
        self.scope = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "sc-for":
            lst = MUST.fullmatch(a["list"].strip()).group(1)
            var = a.get("as", "item")
            idx = a.get("index-as", "__i")
            self.out.append("{(" + expr(lst, self.scope) + " ?? []).map((" + var + ": any, " + idx + ": number) => (<Fragment key={" + idx + "}>")
            self.scope += [var, idx]
            self.stack.append((tag, "</Fragment>))}", 2))
            return
        if tag == "sc-if":
            cond = MUST.fullmatch(a["value"].strip()).group(1)
            self.out.append("{" + expr(cond, self.scope) + " ? (<>")
            self.stack.append((tag, "</>) : null}", 0))
            return
        name = "feGaussianBlur" if tag == "fegaussianblur" else ("feOffset" if tag == "feoffset" else ("linearGradient" if tag == "lineargradient" else ("radialGradient" if tag == "radialgradient" else ("clipPath" if tag == "clippath" else ("textPath" if tag == "textpath" else tag)))))
        parts = []
        for k, v in attrs:
            if k.startswith("hint-placeholder"):
                continue
            if k in EVENTS:
                key = EVENTS[k]
            elif k in ATTR:
                key = ATTR[k]
            else:
                key = k
            if k in BOOL and (v is None or v == "" or v == k):
                parts.append(key)
                continue
            parts.append(f"{key}={attr_value(k, v, self.scope)}")
        self.out.append("<" + name + ("" if not parts else " " + " ".join(parts)) + (" />" if tag in VOID else ">"))
        if tag not in VOID:
            self.stack.append((tag, "</" + name + ">", 0))

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        while self.stack:
            t, close, pop = self.stack.pop()
            self.out.append(close)
            if pop:
                del self.scope[-pop:]
            if t == tag:
                break

    def handle_data(self, data):
        self.out.append(text(data, self.scope))

    def handle_entityref(self, name):
        self.out.append({"nbsp": " ", "amp": "&amp;", "lt": "&lt;", "gt": "&gt;", "quot": '"', "middot": "·", "rarr": "→", "larr": "←", "times": "×", "hellip": "…", "mdash": "—", "ndash": "–", "copy": "©"}.get(name, "&" + name + ";"))

    def handle_charref(self, name):
        self.out.append("&#" + name + ";")

    def handle_comment(self, data):
        self.out.append("{/* " + data.strip().replace("*/", "* /") + " */}")


c = Conv()
c.feed(markup)
c.close()
jsx = "".join(c.out).strip()

cls = re.search(r"class\s+Component\s+extends\s+DCLogic\s*\{", script)
body = script[cls.end() : script.rindex("}")]
name = re.sub(r"\W", "", board_path.split("/")[-1].split(".")[0]) + "Board"
out = f'''/* eslint-disable */
// @ts-nocheck
"use client";
// Generated from the approved board {board_path.split("/")[-1]} by scripts/board-to-tsx.py, then wired by hand.
import {{ Component, Fragment }} from "react";
import {{ css }} from "@/components/site/css";

export default class {name} extends Component<Record<string, never>, any> {{{body}
  render() {{
    const v = this.renderVals();
    return (
      {jsx}
    );
  }}
}}
'''
# The boards name the font literally; the app self-hosts it as --font-jakarta.
out = out.replace("'Plus Jakarta Sans'", "var(--font-jakarta)")
open(out_tsx, "w").write(out)
print(out_tsx, len(out), "chars")
