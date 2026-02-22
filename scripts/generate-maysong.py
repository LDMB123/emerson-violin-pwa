import json

BEAT = 0.81
WIDTH = 56

# May Song
# A C# | E(2) E | F# D | E(2) E 
# D B | C# A | D C# | B(2)
# A C# | E(2) E | F# D | E(2) E 
# D B | C# A | B C# | A(2)

maysong = [
    # Measure 1
    {'p': 'A4', 'f': 'Finger 0', 's': 'A string', 'b': '⬇️ bow', 'l': 1},
    {'p': 'C#5', 'f': 'Finger 2', 's': 'A string', 'b': '⬆️ bow', 'l': 1},
    
    # Measure 2
    {'p': 'E5', 'f': 'Finger 0', 's': 'E string', 'b': '⬇️ bow', 'l': 2},
    {'p': 'E5', 'f': 'Finger 0', 's': 'E string', 'b': '⬆️ bow', 'l': 1},
    
    # Measure 3
    {'p': 'F#5', 'f': 'Finger 1', 's': 'E string', 'b': '⬇️ bow', 'l': 1},
    {'p': 'D5', 'f': 'Finger 3', 's': 'A string', 'b': '⬆️ bow', 'l': 1},
    
    # Measure 4
    {'p': 'E5', 'f': 'Finger 0', 's': 'E string', 'b': '⬇️ bow', 'l': 2},
    {'p': 'E5', 'f': 'Finger 0', 's': 'E string', 'b': '⬆️ bow', 'l': 1},
    
    # Measure 5
    {'p': 'D5', 'f': 'Finger 3', 's': 'A string', 'b': '⬇️ bow', 'l': 1},
    {'p': 'B4', 'f': 'Finger 1', 's': 'A string', 'b': '⬆️ bow', 'l': 1},
    
    # Measure 6
    {'p': 'C#5', 'f': 'Finger 2', 's': 'A string', 'b': '⬇️ bow', 'l': 1},
    {'p': 'A4', 'f': 'Finger 0', 's': 'A string', 'b': '⬆️ bow', 'l': 1},
    
    # Measure 7
    {'p': 'D5', 'f': 'Finger 3', 's': 'A string', 'b': '⬇️ bow', 'l': 1},
    {'p': 'C#5', 'f': 'Finger 2', 's': 'A string', 'b': '⬆️ bow', 'l': 1},
    
    # Measure 8
    {'p': 'B4', 'f': 'Finger 1', 's': 'A string', 'b': '⬇️ bow', 'l': 2},

    # Measure 9
    {'p': 'A4', 'f': 'Finger 0', 's': 'A string', 'b': '⬆️ bow', 'l': 1},
    {'p': 'C#5', 'f': 'Finger 2', 's': 'A string', 'b': '⬇️ bow', 'l': 1},
    
    # Measure 10
    {'p': 'E5', 'f': 'Finger 0', 's': 'E string', 'b': '⬆️ bow', 'l': 2},
    {'p': 'E5', 'f': 'Finger 0', 's': 'E string', 'b': '⬇️ bow', 'l': 1},
    
    # Measure 11
    {'p': 'F#5', 'f': 'Finger 1', 's': 'E string', 'b': '⬆️ bow', 'l': 1},
    {'p': 'D5', 'f': 'Finger 3', 's': 'A string', 'b': '⬇️ bow', 'l': 1},
    
    # Measure 12
    {'p': 'E5', 'f': 'Finger 0', 's': 'E string', 'b': '⬆️ bow', 'l': 2},
    {'p': 'E5', 'f': 'Finger 0', 's': 'E string', 'b': '⬇️ bow', 'l': 1},
    
    # Measure 13
    {'p': 'D5', 'f': 'Finger 3', 's': 'A string', 'b': '⬆️ bow', 'l': 1},
    {'p': 'B4', 'f': 'Finger 1', 's': 'A string', 'b': '⬇️ bow', 'l': 1},
    
    # Measure 14
    {'p': 'C#5', 'f': 'Finger 2', 's': 'A string', 'b': '⬆️ bow', 'l': 1},
    {'p': 'A4', 'f': 'Finger 0', 's': 'A string', 'b': '⬇️ bow', 'l': 1},
    
    # Measure 15
    {'p': 'B4', 'f': 'Finger 1', 's': 'A string', 'b': '⬆️ bow', 'l': 1},
    {'p': 'C#5', 'f': 'Finger 2', 's': 'A string', 'b': '⬇️ bow', 'l': 1},
    
    # Measure 16
    {'p': 'A4', 'f': 'Finger 0', 's': 'A string', 'b': '⬆️ bow', 'l': 2},
]


totalBeats = 0
html = ''

for n in maysong:
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
with open('/tmp/maysong_extended.html', 'w') as f:
    f.write(html)
print("Wrote to /tmp/maysong_extended.html")
