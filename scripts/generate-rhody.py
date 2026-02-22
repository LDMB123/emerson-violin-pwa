import json

BEAT = 0.77
WIDTH = 56

# Go Tell Aunt Rhody
# C#(2) B | A(2) A | E(2) F# E | D(2) C# B |
# A A C#(2) | E(2) E | D D C# B | A(4) ||

rhodyA = [
    {'p': 'C#5', 'f': 'Finger 2', 's': 'A string', 'b': '⬇️ bow', 'l': 2},
    {'p': 'B4', 'f': 'Finger 1', 's': 'A string', 'b': '⬆️ bow', 'l': 1},
    {'p': 'A4', 'f': 'Finger 0', 's': 'A string', 'b': '⬇️ bow', 'l': 2},
    {'p': 'A4', 'f': 'Finger 0', 's': 'A string', 'b': '⬆️ bow', 'l': 1},
    
    {'p': 'E5', 'f': 'Finger 0', 's': 'E string', 'b': '⬇️ bow', 'l': 2},
    {'p': 'F#5', 'f': 'Finger 1', 's': 'E string', 'b': '⬆️ bow', 'l': 1},
    {'p': 'E5', 'f': 'Finger 0', 's': 'E string', 'b': '⬇️ bow', 'l': 1},
    {'p': 'D5', 'f': 'Finger 3', 's': 'A string', 'b': '⬆️ bow', 'l': 2},
    {'p': 'C#5', 'f': 'Finger 2', 's': 'A string', 'b': '⬇️ bow', 'l': 1},
    {'p': 'B4', 'f': 'Finger 1', 's': 'A string', 'b': '⬆️ bow', 'l': 1},
    
    {'p': 'A4', 'f': 'Finger 0', 's': 'A string', 'b': '⬇️ bow', 'l': 1},
    {'p': 'A4', 'f': 'Finger 0', 's': 'A string', 'b': '⬆️ bow', 'l': 1},
    {'p': 'C#5', 'f': 'Finger 2', 's': 'A string', 'b': '⬇️ bow', 'l': 2},
    
    {'p': 'E5', 'f': 'Finger 0', 's': 'E string', 'b': '⬆️ bow', 'l': 2},
    {'p': 'E5', 'f': 'Finger 0', 's': 'E string', 'b': '⬇️ bow', 'l': 1},
    
    {'p': 'D5', 'f': 'Finger 3', 's': 'A string', 'b': '⬆️ bow', 'l': 1},
    {'p': 'D5', 'f': 'Finger 3', 's': 'A string', 'b': '⬇️ bow', 'l': 1},
    {'p': 'C#5', 'f': 'Finger 2', 's': 'A string', 'b': '⬆️ bow', 'l': 1},
    {'p': 'B4', 'f': 'Finger 1', 's': 'A string', 'b': '⬇️ bow', 'l': 1},
    
    {'p': 'A4', 'f': 'Finger 0', 's': 'A string', 'b': '⬆️ bow', 'l': 4},
]

totalBeats = 0
html = ''

for n in rhodyA:
    start = totalBeats * BEAT
    duration = n['l'] * BEAT
    x = totalBeats * WIDTH
    w = n['l'] * WIDTH
    
    html += f'''          <div class="song-note" style="--note-x:{x:.0f}px;--note-width:{w:.0f}px;--note-start:{start:.2f}s;--note-duration:{duration:.2f}s">
            <span class="song-note-pitch">{n['p']}</span>
            <span class="song-note-meta">
              <span class="song-note-finger">{n['f']}</span>
              <span class="song-note-string">{n['s']}</span>
              <span class="song-note-bow">{n['b']}</span>
            </span>
          </div>\n'''
    
    totalBeats += n['l']

totalDuration = totalBeats * BEAT
totalWidth = totalBeats * WIDTH

print(f"STYLE STRING: --song-duration:{totalDuration:.2f}s;--song-width:{totalWidth:.0f}px;--beat-width:56px")
with open('/tmp/rhody_extended.html', 'w') as f:
    f.write(html)
print("Wrote to /tmp/rhody_extended.html")
