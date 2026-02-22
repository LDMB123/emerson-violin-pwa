import json

BEAT = 0.86
WIDTH = 56

# O Come Little Children (Upbeat A)
# E | A A C# C# | E(2) C# | A(3) 
# E | B B E D | C#(2) A | A(3)
# E | A A C# C# | E(2) C# | A(3) 
# E | B B E D | C#(2) A | A(3)

ocome = [
    # Pickup
    {'p': 'E5', 'f': 'Finger 0', 's': 'E string', 'b': '⬆️ bow', 'l': 1},
    
    # Measure 1
    {'p': 'A4', 'f': 'Finger 0', 's': 'A string', 'b': '⬇️ bow', 'l': 1},
    {'p': 'A4', 'f': 'Finger 0', 's': 'A string', 'b': '⬆️ bow', 'l': 1},
    {'p': 'C#5', 'f': 'Finger 2', 's': 'A string', 'b': '⬇️ bow', 'l': 1},
    {'p': 'C#5', 'f': 'Finger 2', 's': 'A string', 'b': '⬆️ bow', 'l': 1},
    
    # Measure 2
    {'p': 'E5', 'f': 'Finger 0', 's': 'E string', 'b': '⬇️ bow', 'l': 2},
    {'p': 'C#5', 'f': 'Finger 2', 's': 'A string', 'b': '⬆️ bow', 'l': 1},
    
    # Measure 3
    {'p': 'A4', 'f': 'Finger 0', 's': 'A string', 'b': '⬇️ bow', 'l': 3},
    
    # Measure 4 (pickup)
    {'p': 'E5', 'f': 'Finger 0', 's': 'E string', 'b': '⬆️ bow', 'l': 1},
    
    # Measure 5
    {'p': 'B4', 'f': 'Finger 1', 's': 'A string', 'b': '⬇️ bow', 'l': 1},
    {'p': 'B4', 'f': 'Finger 1', 's': 'A string', 'b': '⬆️ bow', 'l': 1},
    {'p': 'E5', 'f': 'Finger 0', 's': 'E string', 'b': '⬇️ bow', 'l': 1},
    {'p': 'D5', 'f': 'Finger 3', 's': 'A string', 'b': '⬆️ bow', 'l': 1},
    
    # Measure 6
    {'p': 'C#5', 'f': 'Finger 2', 's': 'A string', 'b': '⬇️ bow', 'l': 2},
    {'p': 'A4', 'f': 'Finger 0', 's': 'A string', 'b': '⬆️ bow', 'l': 1},
    
    # Measure 7
    {'p': 'A4', 'f': 'Finger 0', 's': 'A string', 'b': '⬇️ bow', 'l': 3},
]

# The song repeats the same exact progression twice, so I will duplicate the array.
total = ocome + ocome

totalBeats = 0
html = ''

for n in total:
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
with open('/tmp/ocome_extended.html', 'w') as f:
    f.write(html)
print("Wrote to /tmp/ocome_extended.html")
