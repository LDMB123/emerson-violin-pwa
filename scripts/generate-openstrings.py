import json

BEAT = 1.0 # 60 BPM = 1.0s
WIDTH = 56

# Open Strings
# A(4) E(4) A(4) D(4)
# D(2) A(2) D(2) A(2) E(4)

openstrings = [
    # Measure 1
    {'p': 'A4', 'f': 'Finger 0', 's': 'A string', 'b': '⬇️ bow', 'l': 4},
    # Measure 2
    {'p': 'E5', 'f': 'Finger 0', 's': 'E string', 'b': '⬆️ bow', 'l': 4},
    # Measure 3
    {'p': 'A4', 'f': 'Finger 0', 's': 'A string', 'b': '⬇️ bow', 'l': 4},
    # Measure 4
    {'p': 'D4', 'f': 'Finger 0', 's': 'D string', 'b': '⬆️ bow', 'l': 4},
    # Measure 5
    {'p': 'D4', 'f': 'Finger 0', 's': 'D string', 'b': '⬇️ bow', 'l': 2},
    {'p': 'A4', 'f': 'Finger 0', 's': 'A string', 'b': '⬆️ bow', 'l': 2},
    # Measure 6
    {'p': 'D4', 'f': 'Finger 0', 's': 'D string', 'b': '⬇️ bow', 'l': 2},
    {'p': 'A4', 'f': 'Finger 0', 's': 'A string', 'b': '⬆️ bow', 'l': 2},
    # Measure 7
    {'p': 'E5', 'f': 'Finger 0', 's': 'E string', 'b': '⬇️ bow', 'l': 4},
]

totalBeats = 0
html = ''

for n in openstrings:
    start = totalBeats * BEAT
    duration = n['l'] * BEAT
    x = totalBeats * WIDTH
    w = n['l'] * WIDTH
    
    html += f'''          <div class="song-note" style="--note-x:{x:.0f}px;--note-width:{w:.0f}px;--note-start:{start:.2f}s;--note-duration:{duration:.2f}s">
            <span class="song-note-pitch">{n['p']}</span>
            <span class="song-note-meta">
              <span class="song-note-string">{n['s']}</span>
              <span class="song-note-bow">{n['b']}</span>
            </span>
          </div>\n'''
    
    totalBeats += n['l']

totalDuration = totalBeats * BEAT
totalWidth = totalBeats * WIDTH

print(f"STYLE STRING: --song-duration:{totalDuration:.2f}s;--song-width:{totalWidth:.0f}px;--beat-width:56px")
with open('/tmp/openstrings_extended.html', 'w') as f:
    f.write(html)
print("Wrote to /tmp/openstrings_extended.html")
