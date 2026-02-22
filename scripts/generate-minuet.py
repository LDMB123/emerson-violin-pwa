import json

BEAT = 0.56 # 108 BPM, 60/108 = 0.555
WIDTH = 56

# Minuet 1 (J.S. Bach)
# Time: 3/4
# D G A B C | D G G | E C D E F# | G G G
# C D C B A | B C B A G | F# G A B G | A(3)

minuet = [
    # Measure 1
    {'p': 'D5', 'f': 'Finger 3', 's': 'A string', 'b': '⬇️ bow', 'l': 1},
    {'p': 'G4', 'f': 'Finger 3', 's': 'D string', 'b': '⬆️ bow', 'l': 0.5},
    {'p': 'A4', 'f': 'Finger 0', 's': 'A string', 'b': '⬇️ bow', 'l': 0.5},
    {'p': 'B4', 'f': 'Finger 1', 's': 'A string', 'b': '⬆️ bow', 'l': 0.5},
    {'p': 'C5', 'f': 'Finger 2', 's': 'A string', 'b': '⬇️ bow', 'l': 0.5},
    
    # Measure 2
    {'p': 'D5', 'f': 'Finger 3', 's': 'A string', 'b': '⬆️ bow', 'l': 1},
    {'p': 'G4', 'f': 'Finger 3', 's': 'D string', 'b': '⬇️ bow', 'l': 1},
    {'p': 'G4', 'f': 'Finger 3', 's': 'D string', 'b': '⬆️ bow', 'l': 1},
    
    # Measure 3
    {'p': 'E5', 'f': 'Finger 0', 's': 'E string', 'b': '⬇️ bow', 'l': 1},
    {'p': 'C5', 'f': 'Finger 2', 's': 'A string', 'b': '⬆️ bow', 'l': 0.5},
    {'p': 'D5', 'f': 'Finger 3', 's': 'A string', 'b': '⬇️ bow', 'l': 0.5},
    {'p': 'E5', 'f': 'Finger 0', 's': 'E string', 'b': '⬆️ bow', 'l': 0.5},
    {'p': 'F#5', 'f': 'Finger 1', 's': 'E string', 'b': '⬇️ bow', 'l': 0.5},
    
    # Measure 4
    {'p': 'G5', 'f': 'Finger 2', 's': 'E string', 'b': '⬆️ bow', 'l': 1},
    {'p': 'G4', 'f': 'Finger 3', 's': 'D string', 'b': '⬇️ bow', 'l': 1},
    {'p': 'G4', 'f': 'Finger 3', 's': 'D string', 'b': '⬆️ bow', 'l': 1},
    
    # Measure 5
    {'p': 'C5', 'f': 'Finger 2', 's': 'A string', 'b': '⬇️ bow', 'l': 1},
    {'p': 'D5', 'f': 'Finger 3', 's': 'A string', 'b': '⬆️ bow', 'l': 0.5},
    {'p': 'C5', 'f': 'Finger 2', 's': 'A string', 'b': '⬇️ bow', 'l': 0.5},
    {'p': 'B4', 'f': 'Finger 1', 's': 'A string', 'b': '⬆️ bow', 'l': 0.5},
    {'p': 'A4', 'f': 'Finger 0', 's': 'A string', 'b': '⬇️ bow', 'l': 0.5},
    
    # Measure 6
    {'p': 'B4', 'f': 'Finger 1', 's': 'A string', 'b': '⬆️ bow', 'l': 1},
    {'p': 'C5', 'f': 'Finger 2', 's': 'A string', 'b': '⬇️ bow', 'l': 0.5},
    {'p': 'B4', 'f': 'Finger 1', 's': 'A string', 'b': '⬆️ bow', 'l': 0.5},
    {'p': 'A4', 'f': 'Finger 0', 's': 'A string', 'b': '⬇️ bow', 'l': 0.5},
    {'p': 'G4', 'f': 'Finger 3', 's': 'D string', 'b': '⬆️ bow', 'l': 0.5},
    
    # Measure 7
    {'p': 'F#4', 'f': 'Finger 2', 's': 'D string', 'b': '⬇️ bow', 'l': 1},
    {'p': 'G4', 'f': 'Finger 3', 's': 'D string', 'b': '⬆️ bow', 'l': 0.5},
    {'p': 'A4', 'f': 'Finger 0', 's': 'A string', 'b': '⬇️ bow', 'l': 0.5},
    {'p': 'B4', 'f': 'Finger 1', 's': 'A string', 'b': '⬆️ bow', 'l': 0.5},
    {'p': 'G4', 'f': 'Finger 3', 's': 'D string', 'b': '⬇️ bow', 'l': 0.5},
    
    # Measure 8
    {'p': 'A4', 'f': 'Finger 0', 's': 'A string', 'b': '⬆️ bow', 'l': 3},
]

totalBeats = 0
html = ''

for n in minuet:
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
with open('/tmp/minuet1_extended.html', 'w') as f:
    f.write(html)
print("Wrote to /tmp/minuet1_extended.html")
