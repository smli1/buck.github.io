#!/usr/bin/env python3
# Generate 5e_data/spellbook.js from the bundled 5etools data set.
import json, io, os, re

ROOT = r"C:\Users\manli5\Downloads\not_related\buck.github.io\5e_data\5etools-v2.32.1\data"
OUT = r"C:\Users\manli5\Downloads\not_related\buck.github.io\5e_data\spellbook.js"

OUR_CLASSES = ["bard", "cleric", "druid", "paladin", "ranger", "sorcerer", "warlock", "wizard"]
CLS_NAME_TO_KEY = {c.title(): c for c in OUR_CLASSES}

def load_json(path):
    with io.open(path, "r", encoding="utf-8") as f:
        return json.load(f)

# ---- tagging helpers ----
SCHOOL_NAMES = {"A": "Abjuration", "C": "Conjuration", "D": "Divination", "E": "Enchantment",
                "I": "Illusion", "N": "Necromancy", "T": "Transmutation", "V": "Evocation"}
ABILITY_NAMES = {"str": "Strength", "dex": "Dexterity", "con": "Constitution",
                 "int": "Intelligence", "wis": "Wisdom", "cha": "Charisma"}
TIME_UNITS = {"action": "action", "bonus": "bonus action", "reaction": "reaction",
              "minute": "minute(s)", "hour": "hour(s)", "day": "day(s)", "week": "week(s)",
              "month": "month(s)", "year": "year(s)", "free": "free action"}


def strip_tags(text):
    if not isinstance(text, str):
        return ""
    def repl(m):
        tag = m.group(1)
        inner = m.group(2)
        parts = inner.split("|")
        if tag == "scaledamage" and len(parts) >= 3:
            return parts[0]
        if tag == "scalednumber" and len(parts) >= 3:
            return parts[0]
        return parts[0] if parts else inner
    return re.sub(r"\{@([a-zA-Z]+)\s+([^}]+)\}", repl, text)

COND_LABELS = {
    "blinded": "Blinded", "charmed": "Charmed", "deafened": "Deafened",
    "exhausted": "Exhausted", "frightened": "Frightened", "grappled": "Grappled",
    "incapacitated": "Incapacitated", "paralyzed": "Paralyzed", "petrified": "Petrified",
    "poisoned": "Poisoned", "prone": "Prone", "restrained": "Restrained",
    "stunned": "Stunned", "unconscious": "Unconscious",
}

HEAL_RE = re.compile(r"(regains?|restore[sd]?|heals?|recovers?) (hit points|\d+ ?d?\d*|a number of hit points|[a-z0-9 +]*\d+ ?d?\d* hit points)")
HEAL_NEG_RE = re.compile(r"can'?t regain|doesn'?t regain|cannot regain|not regain|fail.*to regain", re.I)


def detect_buffs(text):
    """Conservative keyword scan for beneficial statuses the spell grants."""
    txt = strip_tags(text or "").lower()
    buffs = []
    if re.search(r"temporary hit points", txt):
        buffs.append("Temp HP")
    if HEAL_RE.search(txt) and not HEAL_NEG_RE.search(txt):
        buffs.append("Healing")
    if re.search(r"\b(has|gains?|you have) advantage on (saving throws|attack rolls|ability checks)", txt):
        buffs.append("Advantage")
    if re.search(r"resistance to \w+", txt):
        buffs.append("Resistance")
    if re.search(r"flying speed|sprout wings|you can fly|gains? a flying speed|has a flying speed", txt):
        buffs.append("Flight")
    if re.search(r"becomes? invisible|turns? invisible|you (are|become) invisible|invisible until the spell ends|gain[s]? invisibility", txt):
        buffs.append("Invisibility")
    if re.search(r"bonus to (ac|armor class)|\+\d+ to your ac|your ac (increases|becomes)", txt):
        buffs.append("AC Boost")
    if re.search(r"has darkvision|gains? darkvision|grant[s]?.*darkvision|you gain darkvision", txt):
        buffs.append("Darkvision")
    return sorted(set(buffs))


def detect_debuffs(sp):
    """Conditions the spell inflicts on its targets (authoritative from 5etools)."""
    raw = sp.get("conditionInflict", []) or []
    labels = [COND_LABELS[c] for c in raw if c in COND_LABELS]
    return sorted(set(labels))


def flatten_entries(entries):
    """Flatten 5etools entries (strings + future-simple {type:...} blocks) to plain text."""
    out = []
    def walk(node, depth):
        if isinstance(node, str):
            out.append(strip_tags(node))
        elif isinstance(node, dict):
            t = node.get("type")
            if not t:
                return
            if t == "entries":
                if node.get("name"):
                    out.append(node["name"])
                walk(node.get("entries"), depth)
            elif t == "list":
                for it in node.get("items", []):
                    out.append("• " + strip_tags(it) if isinstance(it, str) else strip_tags(str(it)))
            elif t == "table":
                rows = node.get("rows", [])
                for r in rows[:12]:
                    out.append(" | ".join(strip_tags(str(c)) for c in r))
            elif t == "quote":
                for it in node.get("entries", []) if isinstance(node.get("entries"), list) else [node.get("entries")]:
                    walk(it, depth)
            else:
                walk(node.get("entries"), depth)
        elif isinstance(node, list):
            for item in node:
                walk(item, depth)
    walk(entries, 0)
    return " ".join(x for x in out if x).strip()


def parse_damage(sp):
    """Return base dice + scaling info from {@damage}/{@scaledamage} tokens & scalingLevelDice."""
    scaled_lvl = sp.get("scalingLevelDice")
    sld = scaled_lvl.get("scaling", {}) if isinstance(scaled_lvl, dict) else {}
    src_entries = json.dumps(sp.get("entries", []), ensure_ascii=False)
    src = src_entries + json.dumps(sp.get("entriesHigherLevel", []), ensure_ascii=False)
    all_dice = re.findall(r"\{@damage\s+([0-9dD+\-]+)\}", src_entries)
    base = None
    if sld:
        base = sld.get("1") or next(iter(sld.values()), None)
    elif all_dice:
        base = all_dice[0]
    scaled_pair = re.findall(r"\{@scaledamage\s+([0-9dD+\-]+)\|([^|]*)\|([0-9dD+\-]+)\}", src)
    scaled = None
    if scaled_pair:
        b = scaled_pair[0][0]
        rng = scaled_pair[0][1]
        lo = rng.split("-")[0] if rng else None
        scaled = {"base": b, "from": lo, "per": scaled_pair[0][2]}
    return [base] if base else [], sld or None, scaled


def parse_area(sp, text):
    """Determine an area shape+size from range.type and/or entry text."""
    rtype = sp.get("range", {}).get("type")
    d = sp.get("range", {}).get("distance", {}) or {}
    if rtype in ("cone", "cube", "line", "sphere", "cylinder", "hemisphere"):
        ft = int(d.get("amount", 0) or 0)
        return (rtype, ft) if ft else None
    low = text.lower()
    # explicit radius first: "20-foot-radius sphere", "a 40-foot radius",
    # "5 feet in radius", "radius of 10 feet" -- but skip *light*-shedding radii
    m = None
    for rm in re.finditer(r"(\d+)[\s-]*(?:foot|ft|feet)[\s-]*radius", low):
        ctx = low[max(0, rm.start() - 40):rm.start()]
        if re.search(r"(?:bright|dim)\s*light|light\s+in\s+(?:a\s+)?\d|sheds?\s+light|illuminat", ctx):
            continue
        m = rm
        break
    if not m:
        m = re.search(r"radius of (\d+)[\s-]*(?:foot|ft|feet)?", low)
    if not m:
        m = re.search(r"(\d+)[\s-]*(?:foot|ft|feet)[\s-]*in radius", low)
    if m:
        rad = int(m.group(1))
        for w in ("cylinder", "hemisphere", "sphere"):
            if w in low:
                return (w, rad)
        return ("sphere", rad)
    # "N-foot cube/square/cone/line/hemisphere"
    m = re.search(r"(\d+)[\s-]*(?:foot|ft)[\s-]*(cube|square|cone|line|hemisphere)", low)
    if m:
        shape = "cube" if m.group(2) == "square" else m.group(2)
        return (shape, int(m.group(1)))
    # "in a cube <n> feet on each side" (Cloud of Daggers)
    m = re.search(r"in a cube\D{0,25}?(\d+)\s*(?:foot|feet|ft)", low)
    if m:
        return ("cube", int(m.group(1)))
    return None


def format_range(sp):
    rng = sp.get("range", {})
    d = rng.get("distance", {})
    if d.get("type") in ("touch", "self", "sight", "special"):
        label = {"touch": "Touch", "self": "Self", "sight": "Sight", "special": "Special"}.get(d["type"], d["type"])
        return {"label": label, "type": rng.get("type", "point"), "ft": 0, "shape": None}
    amt = int(d.get("amount", 0) or 0)
    t = rng.get("type", "point")
    label = "%d ft" % amt if amt else "Self"
    return {"label": label, "type": t, "ft": amt, "shape": t if t in ("cone", "cube", "line", "radius", "sphere") else None}


def format_duration(sp):
    parts = []
    for dur in sp.get("duration", []):
        t = dur.get("type")
        if t == "instant":
            parts.append("Instantaneous")
        elif t == "permanent":
            parts.append("Until dispelled")
        elif t == "special":
            parts.append("Special")
        else:
            d = dur.get("duration", {})
            amt = d.get("amount", "?")
            unit = d.get("type", "")
            unit_s = {"minute": "minute(s)", "hour": "hour(s)", "round": "round(s)",
                      "day": "day(s)", "week": "week(s)", "year": "year(s)"}.get(unit, unit)
            txt = "%s %s" % (amt, unit_s)
            if dur.get("concentration"):
                txt = "%s (concentration)" % txt
            parts.append(txt.capitalize())
    return ", ".join(parts)


def format_components(sp):
    c = sp.get("components", {})
    parts = []
    if c.get("v"): parts.append("V")
    if c.get("s"): parts.append("S")
    if c.get("m"):
        m = strip_tags(c["m"]) if isinstance(c["m"], str) else ""
        parts.append("M (%s)" % m if m else "M")
    return ", ".join(parts)


def format_save(sp):
    st = sp.get("savingThrow")
    if not st:
        return None
    return " ".join(ABILITY_NAMES.get(a, a) for a in st) + " save"


def format_atk(sp):
    at = sp.get("spellAttack")
    if not at:
        return None
    a = at[0] if isinstance(at, list) else at
    return "Melee spell attack" if a == "M" else "Ranged spell attack"


# ---- 1. spells (PHB / SRD 2014) ----
spells_src = load_json(os.path.join(ROOT, "spells", "spells-phb.json"))
spells = []
details = {}
for sp in spells_src["spell"]:
    name = sp.get("name", "")
    spells.append({
        "name": name,
        "level": sp.get("level", 0),
        "classes": []  # filled below
    })
    time = sp.get("time", [{}])[0]
    numbers = [t.get("number", 1) for t in sp.get("time", [{"number": 1}])]
    time_text = ", ".join("%s %s" % (t.get("number", 1), TIME_UNITS.get(t.get("unit", "action"), t.get("unit", "")))
                          for t in sp.get("time", [])) or "1 action"
    text_raw = flatten_entries(sp.get("entries", []))
    higher = sp.get("entriesHigherLevel")
    higher_text = None
    if higher:
        for h in higher:
            if isinstance(h, dict) and h.get("type") == "entries":
                ht = flatten_entries(h.get("entries", []))
                if ht:
                    higher_text = ht
    dice, scaled_lvls, scaled = parse_damage(sp)
    dmg_types = sp.get("damageInflict", [])
    dmg = [d for d in dice]
    area = parse_area(sp, text_raw)
    rng = format_range(sp)
    if area:
        rng["shape"] = area[0]
        rng["areaFt"] = area[1]
    fmt_dur = format_duration(sp)
    conc = sp.get("duration", [{}])[0].get("concentration", False)
    details[name.lower()] = {
        "name": name,
        "level": sp.get("level", 0),
        "school": SCHOOL_NAMES.get(sp.get("school", ""), ""),
        "time": time_text,
        "range": rng,
        "dur": fmt_dur,
        "conc": conc,
        "comps": format_components(sp),
        "save": format_save(sp),
        "atk": format_atk(sp),
        "dmg": dmg,
        "dmgTypes": dmg_types,
        "scaled": scaled,
        "scaledLvls": scaled_lvls,
        "area": area,
        "text": text_raw,
        "higher": higher_text,
        "buffs": detect_buffs(text_raw),
        "debuffs": detect_debuffs(sp),
    }

# ---- 2. class -> spells from the generated lookup ----
lookup = load_json(os.path.join(ROOT, "generated", "gendata-spell-source-lookup.json"))
by_name = {s["name"].lower(): s for s in spells}

for src_key, src_bucket in lookup.items():
    for spell_key, entry in src_bucket.items():
        cls = entry.get("class")
        if not cls:
            continue
        classes = set()
        for _subsrc, cls_map in cls.items():
            for cls_name in cls_map.keys():
                k = CLS_NAME_TO_KEY.get(cls_name)
                if k:
                    classes.add(k)
        if not classes:
            continue
        # normalize spell_key: lower, spaces -> underscores handled by name map
        key = spell_key.lower().replace("-", " ").replace("_", " ")
        s = by_name.get(key)
        if s is not None:
            for c in classes:
                if c not in s["classes"]:
                    s["classes"].append(c)

# ---- 3. per-class metadata + spell-by-level lists ----
classes = {}
for key in OUR_CLASSES:
    path = os.path.join(ROOT, "class", "class-%s.json" % key)
    data = load_json(path)
    cls = next((c for c in data["class"] if c.get("source") == "PHB"), data["class"][0])

    # spell slots: rowsSpellProgression group (full/1/2 casters)
    slots = None
    pact = None
    for g in cls.get("classTableGroups", []):
        if "rowsSpellProgression" in g:
            slots = g["rowsSpellProgression"]
            break
    progress = cls.get("casterProgression", "full")
    if progress == "pact" and slots is None:
        # warlock: pact slots in a normal rows table: [cantrips, known, count, slotLevel, inv]
        rows = cls.get("classTableGroups", [{}])[0].get("rows", [])
        pact = []
        for r in rows:
            v = r.get("value") if isinstance(r, dict) else r
            pact.append([int(v[0]), int(v[1]) if isinstance(v[1], int) else 0, int(v[2]),
                         re.search(r"level=(\d)", str(v[3])).group(1) if re.search(r"level=(\d)", str(v[3])) else "1"])

    # normalize slots to 20 x 9
    slots9 = None
    if slots is not None:
        slots9 = []
        for row in slots:
            row = list(row) + [0] * (9 - len(row))
            slots9.append([int(x or 0) for x in row[:9]])

    ability = cls.get("spellcastingAbility", "")
    hd = cls.get("hd", {}).get("faces", 8)

    spells_by_level = {str(l): [] for l in range(10)}
    counted = set()
    for s in spells:
        if key in s["classes"] and s["name"] not in counted:
            counted.add(s["name"])
            spells_by_level[str(s["level"])].append(s["name"])

    classes[key] = {
        "ability": ability,
        "hd": hd,
        "prog": progress,
        "cantrips": cls.get("cantripProgression") or [],
        "known": cls.get("spellsKnownProgression") or None,
        "prepared": cls.get("preparedSpells") or None,
        "slots": slots9,
        "pact": pact,
        "spells": spells_by_level,
    }

book = {
    "meta": {"system": "dnd-5e-2014", "source": "PHB"},
    "classes": classes,
    "details": details,
}

js = "// Generated from bundled 5etools data (PHB/SRD 2014). Do not edit by hand.\n"
js += "window.SPELLBOOK = " + json.dumps(book, ensure_ascii=False, separators=(",", ":")) + ";\n"
with io.open(OUT, "w", encoding="utf-8") as f:
    f.write(js)

# stats
total = len(spells)
with_cls = sum(1 for s in spells if s["classes"])
print("spells:", total, "with classes:", with_cls)
for k, c in classes.items():
    n = sum(len(v) for v in c["spells"].values())
    print("  %-10s ability=%-3s hd=%s prog=%-5s slots=%s spells=%d" %
          (k, c["ability"], "d%d" % c["hd"], c["prog"],
           "ok" if (c["slots"] or c["pact"]) else "MISSING", n))
print("OUT:", OUT, "size:", os.path.getsize(OUT))